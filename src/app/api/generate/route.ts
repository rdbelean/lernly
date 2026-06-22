import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import {
  ANON_DEVICE_COOKIE,
  parseDeviceIdFromCookie,
  deviceCookieOptions,
} from "@/lib/anonTrial";
import { NextResponse } from "next/server";
import {
  type ExamType,
  type StudyPack,
} from "@/lib/schema";
import {
  createClient as createSupabaseServer,
  createServiceClient,
} from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/byok";
import { shouldUseTwoPass } from "@/lib/twoPass";
import {
  GENERATION_MAX_CONCURRENCY,
  BUSY_MSG,
  isTransientOverload,
  slotGateOutcome,
} from "@/lib/generationGate";
import { STUDY_UPLOADS_BUCKET } from "@/lib/uploads";
import { MAX_FILE_BYTES } from "@/lib/uploadConfig";
import {
  buildMaterialBlocks,
  generatePack,
  EXAM_LABEL,
  type SourceFile,
} from "@/lib/generatePack";
import { buildRelevanceBrief, type FidelityLevel, type LensContext } from "@/lib/prompts";
import { ExamProfileSchema } from "@/lib/schema";
import { clampCardCount } from "@/lib/quota";

export const runtime = "nodejs";
// 800s is the Vercel Fluid Compute max — needed because large image-heavy PDFs
// sent as vision document blocks take far longer than text-only generation.
// Requires Fluid Compute enabled on the Vercel project.
export const maxDuration = 800;

// Lazy so importing this module (e.g. from route.test.ts) doesn't construct an
// Anthropic client — the SDK throws at construction when ANTHROPIC_API_KEY is
// unset, which would break test imports. Built on first real use instead.
let _defaultClient: Anthropic | null = null;
function getDefaultClient(): Anthropic {
  return (_defaultClient ??= new Anthropic());
}

const MAX_FILES = 8;
// MAX_FILE_BYTES is the SHARED cap (50 MB Free-safe by default) — see
// @/lib/uploadConfig for the upgrade path to higher values on Pro.
const MAX_TOTAL_BYTES = MAX_FILE_BYTES * MAX_FILES; // 8 × 50 MB = 400 MB pack ceiling

// Per-pack input ceiling for logged-in users. Generation runs as one long
// request; beyond this it reliably outlives the connection window (gateway
// timeout → "Failed to fetch" on the client). We reject upfront with
// actionable guidance instead of letting it time out. Tune these to what
// actually finishes in time on the deployment.
//
// These are now SANITY ceilings, not target caps. The real token budget is
// enforced inside buildMaterialBlocks (TOKEN_THRESHOLD_CHARS) — anything
// over that gets truncated with a friendly warning rather than rejected.
// We still reject genuinely-pathological uploads (>2× the token budget)
// upfront so the model isn't asked to summarize a small library.
const MAX_PAGES_PER_PACK = 500;
const MAX_CHARS_PER_PACK = 1_000_000;

// Anonymous (lead-magnet) hard caps — protect Lernly's Anthropic bill.
const ANON_MAX_FILES = 1;
const ANON_MAX_PAGES = 30;
const ANON_MAX_CHARS = 50_000;

const ALLOWED_FILE = /\.(pdf|txt|md|markdown)$/i;

const GENERATION_BUDGET_MS = 780_000; // 20s buffer under maxDuration (800)

// Global concurrency cap on simultaneous Anthropic generations, enforced via a
// DB slot counter (acquire_generation_slot / release_generation_slot). Sized to
// keep Sonnet output under the Tier-2 90K OTPM limit; raise once dashboards show
// headroom. The slot TTL (in the RPC) exceeds maxDuration so in-flight requests
// never expire early.

// Shown upfront (before generation) when the material exceeds the per-pack ceiling.
const MATERIAL_TOO_LARGE_UPFRONT_MSG =
  `Dein Material überschreitet die absolute Obergrenze (${MAX_PAGES_PER_PACK} Seiten / ` +
  `${MAX_CHARS_PER_PACK.toLocaleString("de-DE")} Zeichen). Teile es in kleinere Häppchen auf — ` +
  `am besten pro Kapitel oder Vorlesung — und erstelle mehrere Pakete. Kleinere Pakete sind ` +
  `fokussierter, schneller fertig und besser zum Lernen.`;

// Soft truncation message — surfaced when material was processed but had to
// be cut to the token budget (TOKEN_THRESHOLD_CHARS in generatePack.ts).
export const MATERIAL_TRUNCATED_MSG =
  `Dein Material ist sehr groß — wir haben den wichtigsten Teil verarbeitet. ` +
  `Tipp: lade pro Paket ein Kapitel/Thema hoch, dann wird's vollständig.`;

function extractClientIp(request: Request): string | null {
  // Prefer x-real-ip: on Vercel the platform sets it to the true client IP and
  // it overrides any client value. The LEFTMOST x-forwarded-for entry is
  // client-spoofable (Vercel appends, doesn't strip), so only use it as a
  // fallback. (Bot abuse is primarily gated by Turnstile, not this IP quota.)
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

async function verifyTurnstileToken(
  token: string | null,
  clientIp: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail open in dev/preview, fail closed in production (a missing secret
    // there would drop the only bot gate on the anonymous, cost-bearing path).
    if (process.env.VERCEL_ENV === "production") {
      console.error("[/api/generate] TURNSTILE_SECRET_KEY missing in production — failing closed");
      return { ok: false, reason: "not_configured" };
    }
    return { ok: true, reason: "not_configured" };
  }
  if (!token) return { ok: false, reason: "missing_token" };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (clientIp) body.set("remoteip", clientIp);
    const resp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const data = (await resp.json()) as { success: boolean };
    return data.success ? { ok: true } : { ok: false, reason: "rejected" };
  } catch (e) {
    console.error("[/api/generate] turnstile verify threw", e);
    return { ok: false, reason: "verify_threw" };
  }
}

type GenerateJsonBody = {
  examType?: ExamType;
  extraInfo?: string;
  userApiKey?: string;
  examId?: string | null;
  cardCount?: number;
  cardInstructions?: string;
  files?: { path: string; name?: string; size?: number; type?: string }[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const t0 = Date.now();
  const deadline = t0 + GENERATION_BUDGET_MS;
  const uploadedPaths: string[] = [];
  // Atomic pack-quota reservation bookkeeping (see reserve_pack_slot): whether
  // we incremented the monthly counter up front, whether the run committed
  // (saved) so the reservation should stick, and the user to refund otherwise.
  let reserved = false;
  let committed = false;
  let reservedUserId: string | null = null;
  // Anonymous-trial device id (set on the success response so the next attempt
  // from this device is recognised). Null for logged-in requests.
  let anonDeviceId: string | null = null;
  try {
    const clientIp = extractClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";
    const contentType = request.headers.get("content-type") ?? "";

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isAnonymous = !user;

    let examType: ExamType | null;
    let extraInfo = "";
    let userApiKey = "";
    let turnstileToken: string | null = null;
    let files: SourceFile[] = [];
    let examId: string | null = null;
    // Requested flashcard count + focus (clamped to the plan cap below).
    let cardCount: number | undefined;
    let cardInstructions = "";

    if (contentType.includes("application/json")) {
      // Storage-backed path: the browser uploaded the raw files straight to
      // Supabase Storage (bypassing Vercel's ~4.5 MB body cap) and sends only
      // their storage paths here.
      if (!user) {
        return NextResponse.json(
          {
            error: "Bitte einloggen, um ein Lernpaket zu erstellen.",
            reason: "auth_required",
          },
          { status: 401 },
        );
      }
      let body: GenerateJsonBody;
      try {
        body = (await request.json()) as GenerateJsonBody;
      } catch {
        return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
      }
      examType = body.examType ?? null;
      extraInfo = body.extraInfo ?? "";
      userApiKey = (body.userApiKey ?? "").trim();
      if (typeof body.examId === "string" && UUID_RE.test(body.examId)) {
        examId = body.examId;
      }
      if (typeof body.cardCount === "number") cardCount = body.cardCount;
      cardInstructions = (body.cardInstructions ?? "").slice(0, 500).trim();
      const refs = Array.isArray(body.files) ? body.files : [];
      const service = createServiceClient();
      for (const ref of refs) {
        // Ownership guard: service-role downloads bypass RLS, so enforce that
        // the path lives inside the requesting user's folder.
        if (typeof ref?.path !== "string" || !ref.path.startsWith(`${user.id}/`)) {
          return NextResponse.json(
            { error: "Ungültiger Datei-Verweis." },
            { status: 400 },
          );
        }
        uploadedPaths.push(ref.path);
        const dl = await service.storage
          .from(STUDY_UPLOADS_BUCKET)
          .download(ref.path);
        if (dl.error || !dl.data) {
          return NextResponse.json(
            { error: `Datei nicht gefunden: ${ref.name ?? ref.path}` },
            { status: 400 },
          );
        }
        const blob = dl.data;
        files.push({
          name: ref.name ?? ref.path.split("/").pop() ?? "datei",
          size: blob.size,
          arrayBuffer: () => blob.arrayBuffer(),
        });
      }
    } else {
      // Legacy multipart path (anonymous / back-compat). Subject to Vercel's
      // body-size cap, but anonymous generation sends at most one small file.
      const formData = await request.formData();
      examType = formData.get("examType") as ExamType | null;
      extraInfo = (formData.get("extraInfo") as string | null) ?? "";
      userApiKey = ((formData.get("userApiKey") as string | null) ?? "").trim();
      turnstileToken =
        (formData.get("cf-turnstile-response") as string | null) ?? null;
      files = formData
        .getAll("files")
        .filter((v): v is File => v instanceof File);
    }

    if (!examType || !EXAM_LABEL[examType]) {
      return NextResponse.json({ error: "Ungültiger Prüfungstyp" }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Datei erforderlich" },
        { status: 400 },
      );
    }

    if (userApiKey && !userApiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Ungültiger API Key — Anthropic-Keys beginnen mit sk-ant-." },
        { status: 400 },
      );
    }


    if (
      isAnonymous &&
      process.env.ANONYMOUS_GENERATION_ENABLED === "false"
    ) {
      return NextResponse.json(
        {
          error:
            "Anonyme Generierung ist gerade deaktiviert. Bitte einloggen, um ein Lernpaket zu erstellen.",
          reason: "anonymous_disabled",
        },
        { status: 503 },
      );
    }

    const maxFiles = isAnonymous ? ANON_MAX_FILES : MAX_FILES;
    if (files.length > maxFiles) {
      return NextResponse.json(
        {
          error: isAnonymous
            ? `Ohne Account ist nur ${ANON_MAX_FILES} Datei pro Test erlaubt. Logge dich ein, um bis zu ${MAX_FILES} Dateien hochzuladen.`
            : `Maximal ${MAX_FILES} Dateien pro Generierung.`,
          reason: isAnonymous ? "anonymous_file_limit" : "file_limit",
        },
        { status: 400 },
      );
    }

    let totalBytes = 0;
    for (const f of files) {
      if (!ALLOWED_FILE.test(f.name)) {
        return NextResponse.json(
          { error: `Dateityp nicht unterstützt: ${f.name}. Nur PDF, TXT, MD.` },
          { status: 400 },
        );
      }
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `${f.name} ist zu groß (max. 25 MB pro Datei).` },
          { status: 413 },
        );
      }
      totalBytes += f.size;
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { error: "Gesamtgröße zu groß — max. 50 MB pro Generierung." },
        { status: 413 },
      );
    }

    if (isAnonymous) {
      const turnstile = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstile.ok) {
        return NextResponse.json(
          {
            error:
              turnstile.reason === "missing_token"
                ? "Bitte bestätige, dass du kein Bot bist."
                : "Captcha-Verifizierung fehlgeschlagen — bitte erneut versuchen.",
            reason: "turnstile_failed",
            detail: turnstile.reason,
          },
          { status: 403 },
        );
      }

      const deviceId =
        parseDeviceIdFromCookie(request.headers.get("cookie")) ??
        crypto.randomUUID();
      anonDeviceId = deviceId;
      try {
        const service = createServiceClient();
        const { data: anonQuota, error: anonErr } = await service.rpc(
          "check_anonymous_quota",
          { p_device_id: deviceId, p_ip: clientIp },
        );
        if (anonErr) {
          // Fails open (allows generation) — e.g. before the migration is
          // applied. Apply the migration before deploy so this stays closed.
          console.error("[/api/generate] anon quota check failed", anonErr);
        } else if (anonQuota && anonQuota.ok === false) {
          if (anonQuota.reason === "anon_device_limit") {
            return NextResponse.json(
              {
                error:
                  "Dein Gratis-Paket ist verbraucht. Erstell ein kostenloses Konto für 2 Pakete pro Monat — und um deine Pakete zu speichern.",
                reason: "anon_signup_needed",
              },
              { status: 429 },
            );
          }
          return NextResponse.json(
            {
              error:
                "Gerade zu viele Anfragen aus deinem Netzwerk. Bitte versuch es später nochmal.",
              reason: "anon_ip_ceiling",
              retryAfterSeconds: anonQuota.retry_after_seconds,
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(anonQuota.retry_after_seconds ?? 3600),
              },
            },
          );
        }
      } catch (e) {
        console.error("[/api/generate] anon rate-limit threw", e);
      }
    }

    let storedKey: string | null = null;
    if (user) {
      try {
        const service = createServiceClient();
        const { data: secret } = await service
          .from("user_secrets")
          .select("anthropic_key_ciphertext")
          .eq("user_id", user.id)
          .maybeSingle();
        if (secret?.anthropic_key_ciphertext) {
          storedKey = decryptApiKey(secret.anthropic_key_ciphertext);
        }
      } catch (e) {
        console.error("[/api/generate] BYOK lookup failed", e);
      }
    }

    const usesByok = Boolean(storedKey || userApiKey);

    // Whether this generation was paid for via a one-time pack_credit rather
    // than the user's monthly subscription quota. Used at the end to skip
    // bump_pack_usage so we don't double-charge.
    let willUseCredit = false;
    let userPlan: string | null = null;

    if (user && !usesByok) {
      // Atomic reserve closes the check-then-bump race: it increments the
      // monthly counter under the same row lock as the limit check, so
      // concurrent generations can't all slip past the cap. Falls back to the
      // legacy non-atomic check_pack_quota when reserve_pack_slot isn't deployed
      // yet, so merging this before applying the migration can't break anything.
      const reserveRes = await supabase.rpc("reserve_pack_slot");
      let quota = reserveRes.data;
      let qErr = reserveRes.error;
      if (reserveRes.error) {
        console.error(
          "[/api/generate] reserve_pack_slot unavailable; falling back to check_pack_quota",
          reserveRes.error,
        );
        const checkRes = await supabase.rpc("check_pack_quota");
        quota = checkRes.data;
        qErr = checkRes.error;
      } else if (quota?.ok) {
        reserved = true;
        reservedUserId = user.id;
      }
      if (quota?.plan) userPlan = quota.plan as string;
      if (qErr) {
        console.error("[/api/generate] quota check failed", qErr);
      } else if (quota && quota.ok === false) {
        if (quota.reason === "rate_limit") {
          return NextResponse.json(
            {
              error: `Bitte warte noch ${quota.retry_after_seconds}s vor der nächsten Generierung.`,
              reason: "rate_limit",
              retryAfterSeconds: quota.retry_after_seconds,
            },
            {
              status: 429,
              headers: { "Retry-After": String(quota.retry_after_seconds) },
            },
          );
        }
        if (quota.reason === "quota_exceeded") {
          // A one-time credit (Sprint / PAYG / Pro-topup) can cover this. Only
          // CHECK availability here; we consume it AFTER a successful, saved
          // generation (see save block) so a failed run never costs a credit.
          const { data: avail, error: availErr } = await supabase.rpc(
            "available_pack_credits",
          );
          if (availErr) {
            console.error("[/api/generate] available_pack_credits failed", availErr);
          }
          if (typeof avail === "number" && avail > 0) {
            willUseCredit = true;
            console.log(
              "[/api/generate] quota exhausted; will consume a pack credit on success",
              avail,
            );
          } else {
            // No credits → client shows the quota-hit modal with Sprint/PAYG offers.
            return NextResponse.json(
              {
                error: `Monatslimit erreicht: ${quota.used}/${quota.limit} Pakete im ${quota.plan}-Plan.`,
                reason: "quota_exceeded",
                used: quota.used,
                limit: quota.limit,
                plan: quota.plan,
              },
              { status: 402 },
            );
          }
        } else {
          return NextResponse.json(
            { error: "Generierung nicht erlaubt.", reason: quota.reason },
            { status: 400 },
          );
        }
      }
    }

    const effectiveKey = userApiKey || storedKey || null;
    const client = effectiveKey
      ? new Anthropic({ apiKey: effectiveKey })
      : getDefaultClient();
    const keySource = userApiKey
      ? "user-transient"
      : storedKey
        ? "user-stored"
        : "lernly";

    let material;
    try {
      material = await buildMaterialBlocks(files, examType, extraInfo);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Konnte Material nicht lesen." },
        { status: 422 },
      );
    }
    const { totalChars, totalPages, visionPagesUsed, fileSummaries, perFile, wasTruncated, emptyPdfs } = material;
    const materialBlocks = material.blocks;

    // Scanned-PDF fallback: extraction yielded ~nothing AND vision capacity
    // was exhausted (or otherwise skipped). Fail fast with a friendly message
    // rather than spend a generation on empty input.
    if (emptyPdfs.length > 0) {
      const list = emptyPdfs.join(", ");
      return NextResponse.json(
        {
          error: `Diese PDF${emptyPdfs.length > 1 ? "s" : ""} enthält keinen lesbaren Text (vermutlich gescannt): ${list}. Lade bitte die Originaldatei mit echtem Text hoch.`,
          reason: "scanned_pdf_no_text",
        },
        { status: 422 },
      );
    }

    // Anonymous per-file page cap (was inline in the loop).
    if (isAnonymous) {
      const over = perFile.find((f) => f.pages > ANON_MAX_PAGES);
      if (over) {
        return NextResponse.json(
          { error: `Ohne Account ist max. ${ANON_MAX_PAGES} Seiten pro PDF erlaubt — ${over.name} hat ${over.pages}. Logge dich ein, um größere PDFs hochzuladen.`, reason: "anonymous_page_limit" },
          { status: 413 },
        );
      }
    }

    if (isAnonymous && totalChars > ANON_MAX_CHARS) {
      return NextResponse.json(
        {
          error: `Ohne Account ist max. ${ANON_MAX_CHARS.toLocaleString("de-DE")} Zeichen erlaubt — du hast ${totalChars.toLocaleString("de-DE")}. Logge dich ein für größere Pakete.`,
          reason: "anonymous_char_limit",
        },
        { status: 413 },
      );
    }

    // Reject material too large to finish within one request window — upfront,
    // before spending the slow, paid generation. Turns a connection timeout
    // ("Failed to fetch") into actionable guidance and saves Anthropic cost.
    if (totalPages > MAX_PAGES_PER_PACK || totalChars > MAX_CHARS_PER_PACK) {
      console.warn(
        `[/api/generate] material too large: ${totalPages} pages / ${totalChars} chars`,
      );
      return NextResponse.json(
        { error: MATERIAL_TOO_LARGE_UPFRONT_MSG, reason: "material_too_large" },
        { status: 413 },
      );
    }

    console.log(
      "[/api/generate] starting generation, files:",
      fileSummaries,
      "text chars:",
      totalChars.toLocaleString("de-DE"),
      "vision pages:",
      visionPagesUsed,
      "key:",
      keySource,
      "user:",
      user?.id ?? "anon",
    );

    // Resolve the assigned exam upfront so we can both validate ownership
    // (only owner can attach) and pull the Altklausur-lens fields (profile,
    // hints, fidelity) to build the relevance brief BEFORE generation.
    // Silently degrades to null if exam doesn't exist or isn't owned —
    // pack still generates without the lens.
    let resolvedExamId: string | null = null;
    let relevanceBrief: string | null = null;
    // Structured lens context used by the per-task addendum (slot allocation,
    // topic ordering). Built only when there's a valid persisted profile —
    // a hints-only exam still gets the system-level relevance brief but no
    // task-level addendum (no topics to allocate by).
    let lensContext: LensContext | null = null;
    if (examId && user) {
      const { data: ownedExam } = await supabase
        .from("exams")
        .select("id, exam_profile, instructor_hints, fidelity")
        .eq("id", examId)
        .maybeSingle();
      if (ownedExam) {
        resolvedExamId = ownedExam.id as string;
        const fidelity = ((ownedExam.fidelity as string | null) ?? "likely") as FidelityLevel;
        relevanceBrief = buildRelevanceBrief({
          profile: ownedExam.exam_profile,
          hints: (ownedExam.instructor_hints as string | null) ?? null,
          fidelity,
        });
        // Validate the persisted profile before handing it to the allocator
        // so a corrupted JSON column doesn't crash generation. Loosened
        // schema means a partial profile (formats + topics) still validates.
        const parsedProfile = ExamProfileSchema.safeParse(ownedExam.exam_profile);
        if (parsedProfile.success && parsedProfile.data.topics.length > 0) {
          lensContext = { profile: parsedProfile.data, fidelity };
        }
      }
    }

    const useTwoPass = shouldUseTwoPass({ isAnonymous, usesByok, plan: userPlan });

    // Concurrency gate: reserve a global slot before doing any Anthropic work.
    // BYOK users bill their own Anthropic account, so they don't count against
    // our shared Tier-2 token budget — let them through without a slot.
    let slotHeld = false;
    if (!usesByok) {
      let acquired: boolean | null = null;
      try {
        const { data } = await createServiceClient().rpc(
          "acquire_generation_slot",
          { p_max: GENERATION_MAX_CONCURRENCY },
        );
        acquired = data === true ? true : data === false ? false : null;
      } catch (e) {
        // Limiter errored → fail open (better to attempt generation than to
        // block every user because the counter hiccuped). acquired stays null.
        console.error("[/api/generate] acquire_generation_slot threw", e);
      }
      if (slotGateOutcome({ usesByok, acquired }) === "busy") {
        return NextResponse.json(
          { error: BUSY_MSG, retryable: true },
          { status: 503, headers: { "Retry-After": "20" } },
        );
      }
      // Only release a slot we ACTUALLY reserved. On fail-open (null) we never
      // inserted a slot row, so releasing would wrongly free another request's.
      slotHeld = acquired === true;
    }

    // Clamp the requested card count to the plan cap. Anonymous → free cap;
    // BYOK users bill their own Anthropic, so they get the paid cap. Only
    // applied when a count was actually requested (otherwise undefined →
    // generatePack keeps its default prompt range).
    const planForCaps = isAnonymous
      ? "free"
      : (userPlan ?? (usesByok ? "monthly" : "free"));
    const effectiveCardCount =
      typeof cardCount === "number"
        ? clampCardCount(cardCount, planForCaps)
        : undefined;

    let pack: StudyPack;
    try {
      pack = await generatePack({
        client,
        blocks: materialBlocks,
        examType,
        deadline,
        twoPass: useTwoPass,
        relevanceBrief,
        lensContext,
        extraInfo,
        materialLanguage: material.materialLanguage,
        cardCount: effectiveCardCount,
        cardInstructions: cardInstructions || undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "schema_validation_failed")
        return NextResponse.json({ error: "Das generierte Lernpaket entspricht nicht dem erwarteten Schema." }, { status: 502 });
      if (msg === "zero_flashcards")
        return NextResponse.json({ error: "Die Generierung lieferte keine Karteikarten — bitte erneut versuchen." }, { status: 502 });
      throw e; // MaxTokensError (incl. MATERIAL_TOO_LARGE_MSG) etc. → handled by the outer catch
    } finally {
      // Release the slot the moment generation finishes (success OR failure),
      // not in the outer finally — we want it freed before the DB save work.
      if (slotHeld) {
        try {
          await createServiceClient().rpc("release_generation_slot");
        } catch (e) {
          console.error("[/api/generate] release_generation_slot threw", e);
        }
      }
    }

    // Deterministic Altklausur-provenance snapshot: copied from the VALIDATED
    // profile (lensContext), never LLM-echoed. Legacy single-exam profiles
    // without exam_count/sources map to 1/1 so old exams still get badges.
    if (lensContext) {
      const p = lensContext.profile;
      const examCount = p.exam_count ?? 1;
      pack.examLens = {
        examCount,
        topics: p.topics.map((t) => ({
          name: t.name,
          appearances: Math.min(
            Math.max(t.appearances ?? t.sources?.length ?? 1, 1),
            examCount,
          ),
        })),
      };
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[/api/generate] done in ${elapsed}s — ${pack.flashcards.length} cards, ${pack.simulator?.questions.length ?? 0} sim-q, ${pack.quiz?.questions.length ?? 0} mc-q, ${pack.openQuestions?.questions.length ?? 0} open-q`,
    );

    let savedId: string | null = null;
    if (user) {
      try {
        // resolvedExamId was set upfront during the lens fetch (above).
        const { data: row, error: dbError } = await supabase
          .from("study_packs")
          .insert({
            user_id: user.id,
            title: pack.courseTitle,
            exam_type: pack.examType,
            pack_data: pack,
            exam_id: resolvedExamId,
          })
          .select("id")
          .single();
        if (dbError) {
          console.error("[/api/generate] save failed", dbError);
        } else {
          savedId = row.id as string;
        }

        // Charge exactly once, only now that the pack is saved: consume a pack
        // credit if this run used one, otherwise count it against the monthly
        // quota. A failed/unsaved generation reaches neither — never costs anything.
        if (savedId) {
          // The run succeeded and saved → keep any up-front reservation.
          committed = true;
          if (willUseCredit) {
            const { data: consumed, error: consumeErr } = await supabase.rpc(
              "consume_pack_credit",
            );
            if (consumeErr) {
              console.error("[/api/generate] consume_pack_credit failed", consumeErr);
            } else {
              console.log("[/api/generate] consumed pack credit on success", consumed);
            }
          } else if (!usesByok && !reserved) {
            // Legacy fallback path only (reserve_pack_slot already incremented
            // when reserved=true; bumping again would double-charge).
            const { error: bumpErr } = await supabase.rpc("bump_pack_usage");
            if (bumpErr) {
              console.error("[/api/generate] usage bump failed", bumpErr);
            }
          }
        }
      } catch (saveErr) {
        console.error("[/api/generate] save threw", saveErr);
      }
    } else {
      try {
        const service = createServiceClient();
        const { error: anonBumpErr } = await service.rpc(
          "bump_anonymous_usage",
          {
            p_device_id: anonDeviceId,
            p_ip: clientIp,
            p_user_agent: userAgent.slice(0, 500),
          },
        );
        if (anonBumpErr) {
          console.error("[/api/generate] anon usage bump failed", anonBumpErr);
        }
      } catch (e) {
        console.error("[/api/generate] anon usage bump threw", e);
      }
    }

    const res = NextResponse.json({
      id: savedId ?? crypto.randomUUID(),
      saved: Boolean(savedId),
      pack,
      ...(wasTruncated ? { warning: MATERIAL_TRUNCATED_MSG } : {}),
    });
    if (anonDeviceId) {
      res.cookies.set(ANON_DEVICE_COOKIE, anonDeviceId, deviceCookieOptions());
    }
    return res;
  } catch (err) {
    console.error("[/api/generate] error", err);
    if (!isTransientOverload(err)) Sentry.captureException(err);
    // Transient overload (Anthropic 429/529/5xx, exhausted internal retries):
    // give a warm German message + retryable flag instead of a raw English
    // error / 500. The client can simply re-submit.
    if (isTransientOverload(err)) {
      return NextResponse.json(
        { error: BUSY_MSG, retryable: true },
        { status: 503, headers: { "Retry-After": "20" } },
      );
    }
    let message =
      err instanceof Anthropic.APIError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unbekannter Fehler";
    const status =
      err instanceof Anthropic.APIError ? (err.status ?? 500) : 500;
    // Anthropic caps a request at 100 PDF pages; turn the raw API error into
    // actionable guidance instead of leaking the JSON to the user.
    if (/100 PDF pages/i.test(message)) {
      message =
        "Zu viele bild-lastige PDF-Seiten auf einmal (Limit: 100 Seiten pro Generierung). Bitte das PDF aufteilen oder weniger Dateien hochladen.";
    }
    return NextResponse.json({ error: message }, { status });
  } finally {
    // Refund an atomic reservation if the run didn't commit (BUSY slot, failed
    // or unsaved generation, any throw). Preserves the existing guarantee that
    // a failed generation never costs a pack. Runs via the service role with
    // the verified session user id. No-op on the legacy fallback (reserved=false).
    if (reserved && !committed && reservedUserId) {
      try {
        await createServiceClient().rpc("refund_pack_slot", {
          p_user_id: reservedUserId,
        });
      } catch (refundErr) {
        console.error("[/api/generate] refund_pack_slot threw", refundErr);
      }
    }
    // Best-effort cleanup: by this point the buffers are already in memory /
    // sent to Claude, so the raw uploads are no longer needed.
    if (uploadedPaths.length > 0) {
      try {
        await createServiceClient()
          .storage.from(STUDY_UPLOADS_BUCKET)
          .remove(uploadedPaths);
      } catch (cleanupErr) {
        console.error("[/api/generate] upload cleanup failed", cleanupErr);
      }
    }
  }
}
