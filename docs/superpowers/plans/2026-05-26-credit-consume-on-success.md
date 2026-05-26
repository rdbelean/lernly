# Fix: Charge Credit Only On Success + Dashboard Credit Visibility

> Focused bug fix. Design approved in chat (diagnosis: credits work + are consumed, but consumed BEFORE generation → a failed run still cost a credit; and the dashboard never showed credits → user re-bought).

**Goal:** (A) A pack credit is consumed only after a pack is successfully generated AND saved — a failed generation never costs a credit. (B) The dashboard shows available credits + a post-purchase confirmation so purchases are visible.

**Files:** `src/app/api/generate/route.ts` (A), `src/app/dashboard/page.tsx` (B).

---

## Fix A — consume credit only on a saved pack (`src/app/api/generate/route.ts`)

- [ ] **A1. Add a deferral flag** next to `let creditKindConsumed` (~line 324):

```ts
    let creditKindConsumed: string | null = null;
    let willUseCredit = false;
```

- [ ] **A2. Replace the early consume with an availability check** — replace lines 346–374 (the `if (quota.reason === "quota_exceeded") { … consume_pack_credit … }` block) with:

```ts
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
            // No credits → client shows the quota-hit modal with offers.
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
```

(Keep the trailing `} else { return … 400 }` for other quota reasons unchanged.)

- [ ] **A3. Charge on success in the save block** — replace the current bump block (~lines 498–503):

```ts
        // Only bump the monthly quota counter if this generation actually
        // consumed the subscription quota (not BYOK, not a one-time credit).
        if (!usesByok && !creditKindConsumed) {
          const { error: bumpErr } = await supabase.rpc("bump_pack_usage");
          if (bumpErr) {
            console.error("[/api/generate] usage bump failed", bumpErr);
          }
        }
```

with (consume the credit now that the pack is saved; otherwise count the monthly quota — a failed/unsaved run reaches neither):

```ts
        // Charge exactly once, only now that the pack is saved: consume a pack
        // credit if this run used one, otherwise count it against the monthly
        // quota. A failed/unsaved generation reaches neither — never costs anything.
        if (savedId) {
          if (willUseCredit) {
            const { data: consumed, error: consumeErr } = await supabase.rpc(
              "consume_pack_credit",
            );
            if (consumeErr) {
              console.error("[/api/generate] consume_pack_credit failed", consumeErr);
            }
            creditKindConsumed =
              typeof consumed === "string" && consumed ? consumed : null;
          } else if (!usesByok) {
            const { error: bumpErr } = await supabase.rpc("bump_pack_usage");
            if (bumpErr) {
              console.error("[/api/generate] usage bump failed", bumpErr);
            }
          }
        }
```

- [ ] **A4. Verify:** `npx tsc --noEmit` (0); `npx eslint src/app/api/generate/route.ts` (clean); `npm test` (70 pass). Commit.

---

## Fix B — dashboard shows credits + purchase confirmation (`src/app/dashboard/page.tsx`)

- [ ] **B1. Accept searchParams** — change the signature `export default async function DashboardPage()` to:

```ts
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ credit_purchased?: string; cram?: string }>;
}) {
  const params = await searchParams;
```

- [ ] **B2. Fetch available credits** — add the RPC to the existing `Promise.all`:

```ts
  const [packsRes, userRowRes, creditsRes] = await Promise.all([
    supabase.rpc("list_pack_summaries"),
    supabase.from("users").select("plan, packs_used_this_month").single(),
    supabase.rpc("available_pack_credits"),
  ]);
  const credits = typeof creditsRes.data === "number" ? creditsRes.data : 0;
```

- [ ] **B3. Show credits in the quota bar + don't alarm when credits exist.** In the quota-bar block (the `<div className="flex flex-wrap items-center justify-between …">` showing "{used} / {planLimit} Pakete diesen Monat"):
  - append, after the usage span, when `credits > 0`:
    ```tsx
    {credits > 0 && (
      <span className="ml-2" style={{ color: "#9BD8EB" }}>
        · +{credits} Extra-Paket{credits === 1 ? "" : "e"} verfügbar
      </span>
    )}
    ```
  - change the right-side CTA condition so the "Upgrade →" alarm only shows when `quotaReached && credits === 0` (a user with credits can still generate, so no alarm). I.e. replace `{quotaReached ? (` with `{quotaReached && credits === 0 ? (`.

- [ ] **B4. Purchase confirmation banner.** Right after the opening `<div className="mx-auto max-w-[1080px]">`, add:

```tsx
        {params.credit_purchased === "1" && (
          <div
            className="mb-6 rounded-2xl p-4 text-[14px]"
            style={{
              background: "rgba(124,196,160,0.12)",
              border: "1px solid rgba(124,196,160,0.35)",
              color: "#9FD4B8",
            }}
          >
            <span className="font-medium">Extra-Paket gutgeschrieben ✓</span>
            <span className="opacity-80"> — du kannst wieder Lernpakete erstellen.</span>
          </div>
        )}
```

- [ ] **B5. Verify:** `npx tsc --noEmit` (0); `npx eslint src/app/dashboard/page.tsx` (no NEW errors); `npm run build`. Commit.

---

## Verify + deploy

- [ ] Full `npm test` (70) + `npm run build`. Deploy (`vercel --prod`).
- [ ] Manual: as the 2/2 user with credits — dashboard shows "+N Extra-Pakete verfügbar", no Upgrade alarm; generate → pack appears, one credit consumed (count drops by 1). Force a generation failure → credit count unchanged (not charged). After a credit purchase → "gutgeschrieben ✓" banner.

## Notes
- Race window between the early availability check and the post-save consume is negligible (single user, 30s generation cooldown). If `consume_pack_credit` ever returns null at save time (already spent), the pack is still delivered — errs in the user's favor.
