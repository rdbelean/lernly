import { getUser } from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/server";
import BYOKForm from "./byok-form";
import BillingSection from "./billing-section";

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  team: "Team",
};

export default async function SettingsPage() {
  const user = await getUser();
  const service = createServiceClient();

  const [secretRes, profileRes] = await Promise.all([
    service
      .from("user_secrets")
      .select("anthropic_key_set_at")
      .eq("user_id", user!.id)
      .maybeSingle(),
    service
      .from("users")
      .select("plan, current_period_end, stripe_customer_id")
      .eq("id", user!.id)
      .single(),
  ]);

  const keySetAt = secretRes.data?.anthropic_key_set_at ?? null;
  const profile = profileRes.data;
  const plan = profile?.plan ?? "free";
  const periodEnd = profile?.current_period_end ?? null;
  const hasStripeCustomer = Boolean(profile?.stripe_customer_id);
  const billingConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-[720px]">
        <a
          href="/dashboard"
          className="text-[13px] transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          ← Dashboard
        </a>
        <p
          className="mt-6 mb-3 text-[12px] uppercase tracking-[0.22em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Einstellungen
        </p>
        <h1
          className="mb-10 text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "44px",
            fontWeight: 700,
            letterSpacing: "-1.4px",
            lineHeight: 1.05,
          }}
        >
          Konto
        </h1>

        <section
          className="rounded-2xl p-7"
          style={{
            background: "rgba(20, 22, 28, 0.55)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[22px]">🔑</span>
            <h2 className="text-[20px] font-semibold text-white">
              Anthropic API-Key (BYOK)
            </h2>
          </div>
          <p
            className="text-[14px]"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Hinterleg deinen eigenen Anthropic-API-Key, dann nutzt Lernly bei
            jeder Generierung deinen Key — du zahlst direkt an Anthropic, dafür
            keine Monats-Limits.
          </p>
          <p
            className="mt-2 text-[12px]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Key wird mit AES-256-GCM verschlüsselt gespeichert. Du kannst ihn
            jederzeit löschen. Erstellen unter{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              console.anthropic.com
            </a>
            .
          </p>

          <div className="mt-6">
            <BYOKForm keySetAt={keySetAt} />
          </div>
        </section>

        <section
          className="mt-6 rounded-2xl p-7"
          style={{
            background: "rgba(20, 22, 28, 0.55)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[22px]">💳</span>
            <h2 className="text-[20px] font-semibold text-white">Abrechnung</h2>
          </div>
          <BillingSection
            plan={plan}
            planLabel={PLAN_LABEL[plan] ?? plan}
            periodEnd={periodEnd}
            hasStripeCustomer={hasStripeCustomer}
            billingConfigured={billingConfigured}
          />
        </section>
      </div>
    </main>
  );
}
