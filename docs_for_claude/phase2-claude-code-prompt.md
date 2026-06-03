# Phase 2 — Claude Code Kickoff Prompt (Selvacore Campaign)

Paste the block below into Claude Code from the repo root (`Selvacoreapp01`), **after Phase 1 is built and merged**. It is scoped to Phase 2 only and tells Claude Code to **plan first and wait for your approval** before changing code.

---

```text
We're continuing the cross-border GIFT-COMMERCE feature in SelvacoreApp. Phase 1 is already
built and working (the app/give storefront, the extended `orders` model, the `beneficiaries`
collection, the Stripe test-mode paymentService, and the server-side payment webhook).
Now build Phase 2.

Before writing any code, re-read for context:
- docs_for_claude/selvacore-campaign-app-plan.md   (source of truth; Phase 2 is the target)
- docs_for_claude/selvacore-campaign-strategy.md    (business rationale)
- CLAUDE.md                                          (project conventions — follow exactly)
Also review the Phase 1 code you already added (orders model, beneficiaryService,
paymentService, app/give, the Stripe webhook) so this builds cleanly on top of it.

SCOPE: build ONLY Phase 2 from the app plan. Do NOT start Phase 3 (multi-currency / new markets).
Phase 2 is:

1. NAMED-FAMILY GIFTING. In the "Gift a full Ezer" flow, let the buyer choose a specific
   waitlisted family OR "where it's needed most" (default). Build a privacy-safe picker over
   `beneficiaries` where status == 'waitlisted': show only coarse location + a consented
   story/photo; never an exact address; nothing identifying for minors. Set order.beneficiaryId
   at checkout when a family is chosen.

2. BENEFICIARY MANAGEMENT UI (admin). Let Brazil admins create/edit beneficiaries, set status,
   and upload a consent-gated story + photos. Add a `consentGiven` flag — only consented
   beneficiaries may appear in the buyer picker. Reuse the existing admin layout and the
   existing image-upload pattern (see components/common/LogoUpload.tsx).

3. THE IMPACT LOOP. Add a Cloud Function `onGiftInstallCompleted` (sibling to
   functions/src/orders/orderTriggers.ts): when a 'us-gift' order reaches 'completed',
   (a) create an in-app buyer notification via the shared notifications/createNotification
   helper, and (b) queue an email by writing to the `mail` collection (Firebase Trigger Email),
   using a NEW template alongside functions/src/maintenance/emailTemplates.ts —
   "The Ezer system you gifted is now delivering clean water to a family in [region]."
   Surface the technician's completion photos (already in Storage) to the buyer.

4. BUYER DASHBOARD. A logged-in buyer view (app/give/account, or extend app/customer) showing
   their gift(s), current status, and — once installed — the impact photos/story. Let a guest
   buyer claim past orders by signing in with the same email used at checkout.

5. RECURRING GIFTING. Add monthly recurring gifts via Stripe (Subscriptions/Billing) in TEST
   mode. The webhook must handle subscription events, and payment/subscription status stays
   server-side only — never set by the client.

6. GROUP GIFTING (confirm scope first). Allow several people to contribute toward one unit via
   a shareable gift link. If this balloons, recommend deferring it to a Phase 2.5 and tell me why.

7. Update Firestore security rules for the new fields/flows (e.g., `consentGiven`, recurring
   subscription records): buyers read only their own gifts; payment/subscription status is
   writable server-side only; beneficiary picker data exposes only consented, non-identifying fields.

HARD CONSTRAINTS (from CLAUDE.md — do not violate):
- PLAN BEFORE CODE. First give me a step-by-step plan + any decisions you need from me, and
  WAIT for my approval before editing files.
- Create a checkpoint before major changes.
- Functional components only, under 100 lines. kebab-case filenames, PascalCase components.
- Apple design tokens: backgrounds #FFFFFF / #F5F5F7, text #1D1D1F, accent #0071E3,
  radius cards 12px / buttons 8px / inputs 6px, card shadow 0 2px 8px rgba(0,0,0,0.08),
  system font stack.
- All Firebase calls in try/catch with `error: unknown` + `instanceof Error` checks.
- Never duplicate the lib/firebase/config.ts singleton. Admin SDK stays server-side only.
- Do NOT break the existing local commercial flow OR the Phase 1 gift flow.
- PRIVACY: beneficiary photos/stories are consent-gated; never store identifying detail for
  minors; honor the CLAUDE.md "never store raw user content permanently" rule.
- Secrets in .env.local only — never hardcode or commit Stripe keys.
- Run `npm run build` after each meaningful chunk and report. Do NOT deploy.

DECISIONS TO CONFIRM IN YOUR PLAN (don't assume):
- Recurring model: a fixed monthly amount into the pool, vs. monthly until one unit is funded —
  recommend one and explain it simply.
- Group gifting: include in Phase 2 now, or defer to Phase 2.5? Recommend based on complexity.
- Buyer dashboard location: new app/give/account vs. extending app/customer.
- How a guest links past gift orders to a new account (match by email) — confirm the approach.

I'm the CEO, not an engineer — explain your decisions in plain, non-technical language as you
go. Start by giving me the plan.
```

---

**How to use it:** run Claude Code in the repo, paste the block, review the plan it returns, answer its questions, then approve. Build in chunks with `npm run build` between them.

**When Phase 2 is working,** ask me for the **Phase 3** prompt (multi-currency for Canada/Europe, GDPR consent, public impact map, analytics, and the optional charity-partner channel).
