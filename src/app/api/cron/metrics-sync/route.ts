import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  createNotionPage,
  notionEnabled,
  notionProp,
  queryNotionDataSource,
  updateNotionPage,
  CONTENT_CALENDAR_DATA_SOURCE_ID,
  WEEKLY_METRICS_DATA_SOURCE_ID,
} from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// =========================================================================
// GET /api/cron/metrics-sync  (weekly, Monday morning — see vercel.json)
// =========================================================================
// Aggregates the PREVIOUS complete ISO week (Mon–Sun, Europe/Berlin) from
// Stripe (MRR, paying users, week revenue), PostHog (signups, registered,
// uploads, activation) and the Notion content calendar (TikTok views), then
// upserts ONE row into the Notion "Weekly Metrics" DB. Idempotent: an
// existing row for the same ISO week is updated, never duplicated.
//
// Manual runs:  curl "…/api/cron/metrics-sync?secret=$CRON_SECRET"
//               append &week=current to sync the running week instead.
// Sections degrade independently: a missing key or a failing source lands
// in `errors` (and the Notiz) instead of failing the run.
// =========================================================================

function authorize(request: Request): boolean {
  // Same pattern as exam-reminders: Vercel cron sends the Bearer header;
  // manual runs may use ?secret=. Unset CRON_SECRET → no auth (dev).
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const url = new URL(request.url);
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    url.searchParams.get("secret") === secret
  );
}

// --- week window (Europe/Berlin, UTC-midnight day boundaries) ---------------
// Day boundaries use UTC midnight of the Berlin calendar date. Stripe/PostHog
// windows are therefore up to 2h off true Berlin midnight — irrelevant at
// weekly granularity.

const DAY_MS = 86_400_000;

function berlinToday(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00Z`);
}

function mondayOf(day: Date): Date {
  const dow = (day.getUTCDay() + 6) % 7; // Mon = 0
  return new Date(day.getTime() - dow * DAY_MS);
}

function isoWeekLabel(monday: Date): string {
  // ISO week/year are defined by the Thursday of the week.
  const thursday = new Date(monday.getTime() + 3 * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const dayOfYear = (thursday.getTime() - jan1.getTime()) / DAY_MS + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${isoYear}-KW${String(week).padStart(2, "0")}`;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// --- PostHog (HogQL over the private API) ------------------------------------

async function runHogQL(query: string): Promise<number> {
  const host = process.env.POSTHOG_HOST ?? "https://eu.posthog.com";
  const projectId = process.env.POSTHOG_PROJECT_ID ?? "184383";
  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`PostHog ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = await res.json();
  return Number(json.results?.[0]?.[0] ?? 0);
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!notionEnabled()) {
    return NextResponse.json(
      { ok: false, error: "NOTION_TOKEN not set — metrics-sync disabled" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const thisMonday = mondayOf(berlinToday());
  const weekStart =
    url.searchParams.get("week") === "current"
      ? thisMonday
      : new Date(thisMonday.getTime() - 7 * DAY_MS);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  const label = isoWeekLabel(weekStart);
  const errors: string[] = [];

  // Only successfully computed sections make it into the Notion row, so a
  // partial re-run never overwrites good values with zeros.
  const metrics: {
    mrr?: number;
    zahlende?: number;
    weekRevenue?: number;
    neueSignups?: number;
    registrierte?: number;
    uploads?: number;
    aktivierung?: number;
    tiktokViews?: number;
  } = {};

  // --- Stripe: MRR, paying users, week revenue -------------------------------
  const stripe = getStripe();
  if (!stripe) {
    errors.push("Stripe übersprungen (STRIPE_SECRET_KEY fehlt)");
  } else {
    try {
      let mrrCents = 0;
      const subCustomers = new Set<string>();
      for await (const sub of stripe.subscriptions.list({
        status: "active",
        limit: 100,
      })) {
        subCustomers.add(
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        );
        for (const item of sub.items.data) {
          const price = item.price;
          const rec = price.recurring;
          if (!rec || price.unit_amount == null) continue;
          // Normalize every interval to a monthly amount
          // (Semester 29,99 €/6 Monate ≈ 5 €/Monat).
          const total = price.unit_amount * (item.quantity ?? 1);
          if (rec.interval === "month") mrrCents += total / rec.interval_count;
          else if (rec.interval === "year")
            mrrCents += total / (12 * rec.interval_count);
          else if (rec.interval === "week")
            mrrCents += (total * 52) / (12 * rec.interval_count);
          else if (rec.interval === "day")
            mrrCents += (total * 365) / (12 * rec.interval_count);
        }
      }
      metrics.mrr = Math.round(mrrCents) / 100;

      // Einzelklausur grants 14 days of access — count one-time (mode:
      // "payment") checkouts paid in that window as active paying users.
      const einzelklausurCustomers = new Set<string>();
      const since = Math.floor(Date.now() / 1000) - 14 * 86_400;
      for await (const session of stripe.checkout.sessions.list({
        created: { gte: since },
        limit: 100,
      })) {
        if (session.mode !== "payment" || session.payment_status !== "paid")
          continue;
        const customer =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? session.id);
        if (!subCustomers.has(customer)) einzelklausurCustomers.add(customer);
      }
      metrics.zahlende = subCustomers.size + einzelklausurCustomers.size;

      // Week revenue (for the Notiz): succeeded charges minus refunds.
      let revenueCents = 0;
      const chargeWindow: Stripe.ChargeListParams = {
        created: {
          gte: Math.floor(weekStart.getTime() / 1000),
          lt: Math.floor(weekEnd.getTime() / 1000),
        },
        limit: 100,
      };
      for await (const charge of stripe.charges.list(chargeWindow)) {
        if (charge.status === "succeeded" && charge.paid)
          revenueCents += charge.amount - charge.amount_refunded;
      }
      metrics.weekRevenue = Math.round(revenueCents) / 100;
    } catch (error) {
      errors.push(`Stripe: ${error instanceof Error ? error.message : error}`);
    }
  }

  // --- PostHog: signups, registered, uploads, activation ----------------------
  if (!process.env.POSTHOG_API_KEY) {
    errors.push("PostHog übersprungen (POSTHOG_API_KEY fehlt)");
  } else {
    const window = `timestamp >= toDateTime('${ymd(weekStart)} 00:00:00') AND timestamp < toDateTime('${ymd(weekEnd)} 00:00:00')`;
    const onDashboard = `properties.$current_url LIKE '%/dashboard%'`;
    try {
      const [neueSignups, registrierte, uploads, uploaders, activated] =
        await Promise.all([
          runHogQL(
            `SELECT count(DISTINCT person_id) FROM events WHERE event = 'signup_completed' AND ${window}`,
          ),
          runHogQL(
            `SELECT count(DISTINCT person_id) FROM events WHERE event = 'signup_completed'`,
          ),
          runHogQL(
            `SELECT count() FROM events WHERE event = 'upload_started' AND ${window}`,
          ),
          // Activation = Gate 4 of the funnel: of the users who started an
          // upload this week (in the app, not the anonymous landing trial),
          // how many flipped their first card this week.
          runHogQL(
            `SELECT count(DISTINCT person_id) FROM events WHERE event = 'upload_started' AND ${window} AND ${onDashboard}`,
          ),
          runHogQL(
            `SELECT count(DISTINCT person_id) FROM events WHERE event = 'first_card_flipped' AND ${window} AND ${onDashboard} AND person_id IN (SELECT DISTINCT person_id FROM events WHERE event = 'upload_started' AND ${window} AND ${onDashboard})`,
          ),
        ]);
      metrics.neueSignups = neueSignups;
      metrics.registrierte = registrierte;
      metrics.uploads = uploads;
      // Notion column is percent-formatted → write the fraction (0.5 → 50 %).
      metrics.aktivierung =
        uploaders > 0 ? Math.round((activated / uploaders) * 10_000) / 10_000 : 0;
    } catch (error) {
      errors.push(`PostHog: ${error instanceof Error ? error.message : error}`);
    }
  }

  // --- TikTok views from the Notion content calendar --------------------------
  try {
    const posts = await queryNotionDataSource(CONTENT_CALENDAR_DATA_SOURCE_ID, {
      and: [
        { property: "Post-Datum", date: { on_or_after: ymd(weekStart) } },
        { property: "Post-Datum", date: { before: ymd(weekEnd) } },
        { property: "Plattform", select: { equals: "TikTok" } },
      ],
    });
    metrics.tiktokViews = posts.reduce(
      (sum, page) => sum + (page.properties?.["Views"]?.number ?? 0),
      0,
    );
  } catch (error) {
    errors.push(
      `Content Calendar: ${error instanceof Error ? error.message : error}`,
    );
  }

  // --- upsert the Weekly Metrics row ------------------------------------------
  const notiz = [
    `auto-sync ${new Date().toISOString().slice(0, 16)}Z`,
    metrics.weekRevenue !== undefined
      ? `Umsatz Woche: ${metrics.weekRevenue.toFixed(2)} €`
      : null,
    errors.length ? `Fehler: ${errors.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const properties: Record<string, unknown> = {
    Woche: notionProp.title(label),
    Notiz: notionProp.richText(notiz),
  };
  if (metrics.mrr !== undefined) properties["MRR"] = notionProp.number(metrics.mrr);
  if (metrics.zahlende !== undefined)
    properties["Zahlende"] = notionProp.number(metrics.zahlende);
  if (metrics.neueSignups !== undefined)
    properties["Neue Signups"] = notionProp.number(metrics.neueSignups);
  if (metrics.registrierte !== undefined)
    properties["Registrierte"] = notionProp.number(metrics.registrierte);
  if (metrics.uploads !== undefined)
    properties["Uploads"] = notionProp.number(metrics.uploads);
  if (metrics.aktivierung !== undefined)
    properties["Aktivierung %"] = notionProp.number(metrics.aktivierung);
  if (metrics.tiktokViews !== undefined)
    properties["TikTok-Views"] = notionProp.number(metrics.tiktokViews);

  let action: "created" | "updated";
  try {
    const existing = await queryNotionDataSource(WEEKLY_METRICS_DATA_SOURCE_ID, {
      property: "Woche",
      title: { equals: label },
    });
    if (existing[0]) {
      await updateNotionPage(existing[0].id, properties);
      action = "updated";
    } else {
      await createNotionPage(WEEKLY_METRICS_DATA_SOURCE_ID, properties);
      action = "created";
    }
  } catch (error) {
    console.error("[metrics-sync] Notion upsert failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: `Notion upsert failed: ${error instanceof Error ? error.message : error}`,
        week: label,
        metrics,
        errors,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    week: label,
    range: `${ymd(weekStart)} – ${ymd(new Date(weekEnd.getTime() - DAY_MS))}`,
    action,
    metrics,
    errors,
  });
}
