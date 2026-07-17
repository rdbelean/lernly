// =========================================================================
// Beta checkout curtain
// =========================================================================
// A temporary gate over every PURCHASE action (not the Stripe portal — active
// subscribers must keep managing their plan). While locked, buy buttons open a
// "we're in beta, making changes" screen with a founder password field instead
// of going straight to Stripe. Flip BETA_CHECKOUT_LOCKED to false + redeploy to
// re-open purchases.
//
// The password itself is NEVER in this file or the client bundle — the server
// route (/api/stripe/checkout) validates the submitted password against a hash.
// A wrong/absent password there returns { reason: "beta_locked" }.
// =========================================================================

export const BETA_CHECKOUT_LOCKED: boolean = true;

export const BETA_CHECKOUT_TITLE = "Kurz in der Werkstatt";
export const BETA_CHECKOUT_BODY =
  "Wir sind noch in der Beta und bauen gerade am Upgrade-Ablauf. Käufe sind für einen Moment pausiert — schau gleich nochmal vorbei. Danke für deine Geduld!";

export type BetaPlan = "einzelklausur" | "semester" | "monthly";

// Tiny pub/sub so any buy button can open the single global beta modal
// (BetaCheckoutHost) without threading props through three separate surfaces.
type Listener = (plan: BetaPlan) => void;
const listeners = new Set<Listener>();

export function openBetaCheckout(plan: BetaPlan): void {
  for (const l of listeners) l(plan);
}

export function onBetaCheckoutOpen(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
