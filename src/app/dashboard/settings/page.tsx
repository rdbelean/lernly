import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Bell,
  Clock,
  CreditCard,
  Key,
  Laptop,
  Mail,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getUser } from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, PLAN_LABEL, effectivePlan } from "@/lib/quota";
import { tutorLimitForPlan } from "@/lib/tutorPrompt";
import { createTrainerSyncToken } from "@/lib/trainer/syncToken";
import BYOKForm from "./byok-form";
import BillingSection from "./billing-section";
import AccountSection from "./account-section";
import UsageSection from "./usage-section";
import TrainerSyncSection from "./trainer-sync-section";
import NotificationsSection from "./notifications-section";
import DangerZone from "./danger-zone";
import LegalLinks from "./legal-links";

// =========================================================================
// /dashboard/settings  —  Konto
// =========================================================================
// Sections (top → bottom, ordered by frequency-of-use × importance):
//   1. Konto        — email + sign-in method + change email
//   2. Nutzung      — packs + tutor-message counters
//   3. Abrechnung   — Stripe portal (cancel, invoices, payment method)
//   4. API-Key      — BYOK
//   5. Benachrichtigungen — exam-reminder toggle
//   6. Daten & Konto — DSGVO export + delete
//   7. Rechtliches   — footer-style legal page links
// =========================================================================

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="overflow-hidden border"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-ink-a06)",
        borderRadius: "16px",
        padding: "24px",
      }}
    >
      <div className="mb-5 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--color-work-bg)" }}
        >
          <Icon
            size={18}
            strokeWidth={1.75}
            color="var(--color-primary-bright)"
          />
        </span>
        <h2
          className="text-[18px] font-semibold tracking-[-0.3px]"
          style={{
            color: "var(--color-text)",
            fontFamily: "var(--font-display)",
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) {
    // The layout already redirects to /login; this is a defense-in-depth
    // narrow for the type checker. Redirect (not throw) so dev logs stay
    // clean during the parallel layout+page render.
    redirect("/login");
  }

  const service = createServiceClient();
  const uid = user.id;

  const [secretRes, profileRes, tutorRes] = await Promise.all([
    service
      .from("user_secrets")
      .select("anthropic_key_set_at")
      .eq("user_id", uid)
      .maybeSingle(),
    service
      .from("users")
      .select(
        "plan, plan_expires_at, stripe_customer_id, packs_used_this_month, exam_reminders_enabled",
      )
      .eq("id", uid)
      .single(),
    service
      .from("tutor_usage")
      .select("messages_used, period_start")
      .eq("user_id", uid)
      .maybeSingle(),
  ]);

  const keySetAt = secretRes.data?.anthropic_key_set_at ?? null;
  const profile = profileRes.data;
  const planExpiresAt = profile?.plan_expires_at ?? null;
  // Effective plan: a lapsed paid plan reads as free; admin emails are always unlimited.
  const plan = effectivePlan(profile?.plan, planExpiresAt, user.email);
  const periodEnd = plan === "free" ? null : planExpiresAt;
  const hasStripeCustomer = Boolean(profile?.stripe_customer_id);
  const billingConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);

  // Usage — only count the current period for tutor messages; the column
  // accumulates across the row's `period_start`, so if that's in a previous
  // month the cron-less reset hasn't fired yet → show 0.
  const tutor = tutorRes.data;
  const tutorPeriodStart = tutor?.period_start
    ? new Date(tutor.period_start)
    : null;
  const now = new Date();
  const inCurrentMonth =
    tutorPeriodStart !== null &&
    tutorPeriodStart.getUTCFullYear() === now.getUTCFullYear() &&
    tutorPeriodStart.getUTCMonth() === now.getUTCMonth();
  const tutorUsed = inCurrentMonth ? (tutor?.messages_used ?? 0) : 0;
  const tutorLimit = tutorLimitForPlan(plan);

  const packsUsed = profile?.packs_used_this_month ?? 0;
  const packsLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const examRemindersEnabled = profile?.exam_reminders_enabled ?? true;

  const provider =
    (user.app_metadata?.provider as string | undefined) ?? null;

  // BYOK is paused — the API routes stay live but the form is hidden behind a
  // "Bald verfügbar" teaser until BYOK_ENABLED=true (set in all Vercel scopes).
  const byokEnabled = process.env.BYOK_ENABLED === "true";

  const syncToken = createTrainerSyncToken({
    id: user.id,
    email: user.email,
  });

  return (
    <main className="px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-[720px]">
        <Link
          href="/dashboard"
          className="text-[13px] transition hover:text-[color:var(--color-text)]"
          style={{ color: "var(--color-text-dim)" }}
        >
          ← Dashboard
        </Link>
        <p
          className="mt-6 mb-3 text-[12px]"
          style={{ color: "var(--color-text-faint)" }}
        >
          Einstellungen
        </p>
        <h1
          className="mb-10"
          style={{
            color: "var(--color-text)",
            fontFamily: "var(--font-display)",
            fontSize: "40px",
            fontWeight: 600,
            letterSpacing: "-1.2px",
            lineHeight: 1.05,
          }}
        >
          Konto
        </h1>

        <div className="space-y-5">
          <SectionCard icon={Mail} title="Konto">
            <AccountSection
              email={user.email ?? ""}
              provider={provider}
            />
          </SectionCard>

          <SectionCard icon={Activity} title="Nutzung diesen Monat">
            <UsageSection
              packsUsed={packsUsed}
              packsLimit={packsLimit}
              tutorUsed={tutorUsed}
              tutorLimit={tutorLimit}
              planLabel={PLAN_LABEL[plan] ?? plan}
            />
          </SectionCard>

          <SectionCard icon={CreditCard} title="Abrechnung">
            <BillingSection
              plan={plan}
              planLabel={PLAN_LABEL[plan] ?? plan}
              periodEnd={periodEnd}
              hasStripeCustomer={hasStripeCustomer}
              billingConfigured={billingConfigured}
            />
          </SectionCard>

          <SectionCard icon={Laptop} title="Claude Desktop & MCP-Sync">
            <TrainerSyncSection syncToken={syncToken} />
          </SectionCard>

          <SectionCard icon={Key} title="Anthropic API-Key (BYOK)">
            <p
              className="mb-4 text-[13.5px]"
              style={{ color: "var(--color-text-dim)" }}
            >
              Hinterleg deinen eigenen Anthropic-API-Key, dann nutzt
              Lernly bei jeder Generierung deinen Key — du zahlst direkt
              an Anthropic, dafür keine Monats-Limits.
            </p>
            {byokEnabled ? (
              <>
                <p
                  className="mb-5 text-[12px]"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Key wird mit AES-256-GCM verschlüsselt gespeichert. Du
                  kannst ihn jederzeit löschen. Erstellen unter{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-[color:var(--color-text)]"
                    style={{ color: "var(--color-text-dim)" }}
                  >
                    console.anthropic.com
                  </a>
                  .
                </p>
                <BYOKForm keySetAt={keySetAt} />
              </>
            ) : (
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold"
                style={{
                  borderColor: "var(--color-ink-a14)",
                  background: "var(--color-ink-a04)",
                  color: "var(--color-text-dim)",
                }}
              >
                <Clock size={14} strokeWidth={2} aria-hidden />
                Bald verfügbar
              </span>
            )}
          </SectionCard>

          <SectionCard icon={Bell} title="Benachrichtigungen">
            <NotificationsSection
              initialEnabled={examRemindersEnabled}
              emailProviderConfigured={emailConfigured}
            />
          </SectionCard>

          <SectionCard icon={ShieldAlert} title="Daten & Konto">
            <DangerZone email={user.email ?? ""} />
          </SectionCard>

          <div
            className="border-t pt-6"
            style={{ borderColor: "var(--color-ink-a06)" }}
          >
            <p
              className="mb-3 text-[12px] font-semibold"
              style={{ color: "var(--color-text-faint)" }}
            >
              Rechtliches
            </p>
            <LegalLinks />
          </div>
        </div>
      </div>
    </main>
  );
}
