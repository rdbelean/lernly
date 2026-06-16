import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { StudyPackSchema, type Flashcard } from "@/lib/schema";
import { generateMoreCards } from "@/lib/generateMoreCards";
import { clampCardCount } from "@/lib/quota";
import {
  GENERATION_MAX_CONCURRENCY,
  BUSY_MSG,
  isTransientOverload,
  slotGateOutcome,
} from "@/lib/generationGate";

export const runtime = "nodejs";
// Single Sonnet task on already-extracted pack content — far quicker than a
// full pack generation, but keep comfortable headroom.
export const maxDuration = 300;

let _defaultClient: Anthropic | null = null;
function getDefaultClient(): Anthropic {
  return (_defaultClient ??= new Anthropic());
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = { packId?: string; count?: number; instructions?: string };

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Bitte einloggen.", reason: "auth_required" },
        { status: 401 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }
    const packId = typeof body.packId === "string" ? body.packId : "";
    if (!UUID_RE.test(packId)) {
      return NextResponse.json({ error: "Ungültiges Paket." }, { status: 400 });
    }
    const instructions = (body.instructions ?? "").slice(0, 500).trim();

    // Card-gen quota gate (separate monthly counter from pack quota). Also
    // yields the effective plan for the count cap.
    const { data: quota, error: qErr } = await supabase.rpc(
      "check_card_gen_quota",
    );
    if (qErr) {
      console.error("[/api/flashcards/more] quota check failed", qErr);
      return NextResponse.json(
        { error: "Kontingent konnte nicht geprüft werden." },
        { status: 500 },
      );
    }
    if (quota && quota.ok === false) {
      if (quota.reason === "quota_exceeded") {
        return NextResponse.json(
          {
            error: `Monatslimit für Karten-Nachgenerieren erreicht: ${quota.used}/${quota.limit} im ${quota.plan}-Plan.`,
            reason: "quota_exceeded",
            used: quota.used,
            limit: quota.limit,
            plan: quota.plan,
          },
          { status: 402 },
        );
      }
      return NextResponse.json(
        { error: "Nachgenerieren nicht erlaubt.", reason: quota.reason },
        { status: 400 },
      );
    }
    const plan = (quota?.plan as string) ?? "free";
    const count = clampCardCount(body.count ?? 10, plan);

    // Load the pack (RLS-scoped to the owner).
    const { data: row, error: loadErr } = await supabase
      .from("study_packs")
      .select("id, pack_data")
      .eq("id", packId)
      .maybeSingle();
    if (loadErr || !row) {
      return NextResponse.json({ error: "Paket nicht gefunden." }, { status: 404 });
    }
    const parsed = StudyPackSchema.safeParse(row.pack_data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Das Paket-Format ist veraltet — Nachgenerieren nicht möglich." },
        { status: 422 },
      );
    }
    const pack = parsed.data;

    // Concurrency gate (shared global Anthropic slot counter).
    let slotHeld = false;
    let acquired: boolean | null = null;
    try {
      const { data } = await createServiceClient().rpc("acquire_generation_slot", {
        p_max: GENERATION_MAX_CONCURRENCY,
      });
      acquired = data === true ? true : data === false ? false : null;
    } catch (e) {
      console.error("[/api/flashcards/more] acquire_generation_slot threw", e);
    }
    if (slotGateOutcome({ usesByok: false, acquired }) === "busy") {
      return NextResponse.json(
        { error: BUSY_MSG, retryable: true },
        { status: 503, headers: { "Retry-After": "20" } },
      );
    }
    slotHeld = acquired === true;

    let newCards: Flashcard[];
    try {
      newCards = await generateMoreCards({
        client: getDefaultClient(),
        pack,
        count,
        instructions: instructions || undefined,
      });
    } finally {
      if (slotHeld) {
        try {
          await createServiceClient().rpc("release_generation_slot");
        } catch (e) {
          console.error("[/api/flashcards/more] release_generation_slot threw", e);
        }
      }
    }

    if (newCards.length === 0) {
      return NextResponse.json(
        { error: "Es konnten keine neuen Karten erzeugt werden — bitte erneut versuchen." },
        { status: 502 },
      );
    }

    // Append + persist. Guard against a colliding id (paranoia: regenerate
    // uses fresh UUIDs, but never trust it blindly).
    const existingIds = new Set(pack.flashcards.map((c) => c.id));
    const toAdd = newCards.filter((c) => !existingIds.has(c.id));
    const updatedPack = {
      ...pack,
      flashcards: [...pack.flashcards, ...toAdd],
    };
    const { error: saveErr } = await supabase
      .from("study_packs")
      .update({ pack_data: updatedPack })
      .eq("id", packId);
    if (saveErr) {
      console.error("[/api/flashcards/more] save failed", saveErr);
      return NextResponse.json(
        { error: "Neue Karten konnten nicht gespeichert werden." },
        { status: 500 },
      );
    }

    // Charge the card-gen quota exactly once, only after a successful save.
    const { error: bumpErr } = await supabase.rpc("bump_card_gen_usage");
    if (bumpErr) {
      console.error("[/api/flashcards/more] usage bump failed", bumpErr);
    }

    return NextResponse.json({
      added: toAdd,
      addedCount: toAdd.length,
      totalCards: updatedPack.flashcards.length,
    });
  } catch (err) {
    console.error("[/api/flashcards/more] error", err);
    if (isTransientOverload(err)) {
      return NextResponse.json(
        { error: BUSY_MSG, retryable: true },
        { status: 503, headers: { "Retry-After": "20" } },
      );
    }
    const message =
      err instanceof Anthropic.APIError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
