// Two-pass deep generation is gated to paying users: BYOK (own API cost) or a
// paid plan. Anonymous and Free generations stay single-pass.
export function shouldUseTwoPass(o: {
  isAnonymous: boolean;
  usesByok: boolean;
  plan: string | null;
}): boolean {
  if (o.isAnonymous) return false;
  if (o.usesByok) return true;
  return o.plan === "pro" || o.plan === "team";
}
