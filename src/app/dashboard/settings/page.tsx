import { redirect } from "next/navigation";
import {
  Activity,
  Bell,
  CreditCard,
  Key,
  Mail,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getUser } from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/quota";
import { tutorLimitForPlan } from "@/lib/tutorPrompt";
import BYOKForm from "./byok-form";
import BillingSection from "./billing-section";
import AccountSection from "./account-section";
import UsageSection from "./usage-section";
import NotificationsSection from "./notifications-section";
import DangerZone from "./danger-zone";
import LegalLinks from "./legal-links";

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  team: "Team",
  pro_byok: "Pro (BYOK)",
  team_byok: "Team (BYOK)",
};

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
        background: "#141930",
        borderColor: "rgba(255,255,255,0.06)",
        borderRadius: "16px",
        padding: "24px",
      }}
    >
      <div className="mb-5 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(110, 128, 242, 0.10)" }}
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
        "plan, current_period_end, stripe_customer_id, packs_used_this_month, exam_reminders_enabled",
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
  const plan = profile?.plan ?? "free";
  const periodEnd = profile?.current_period_end ?? null;
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

  return (
    <main className="px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-[720px]">
        <a
          href="/dashboard"
          className="text-[13px] transition hover:text-white"
          style={{ color: "var(--color-text-dim)" }}
        >
          ← Dashboard
        </a>
        <p
          className="mt-6 mb-3 text-[11px] uppercase tracking-[0.22em]"
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

          <SectionCard icon={Key} title="Anthropic API-Key (BYOK)">
            <p
              className="mb-4 text-[13.5px]"
              style={{ color: "var(--color-text-dim)" }}
            >
              Hinterleg deinen eigenen Anthropic-API-Key, dann nutzt
              Lernly bei jeder Generierung deinen Key — du zahlst direkt
              an Anthropic, dafür keine Monats-Limits.
            </p>
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
                className="underline hover:text-white"
                style={{ color: "var(--color-text-dim)" }}
              >
                console.anthropic.com
              </a>
              .
            </p>
            <BYOKForm keySetAt={keySetAt} />
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
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <p
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
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
