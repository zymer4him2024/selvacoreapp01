# Phase 1 — Claude Code Kickoff Prompt (Selvacore Campaign)

Paste the block below into Claude Code, run from the repo root (`Selvacoreapp01`). It is scoped to Phase 1 (MVP) only. It tells Claude Code to **plan first and wait for your approval** before changing any code.

---

```text
We're adding a new feature to this app (SelvacoreApp): a cross-border GIFT-COMMERCE flow.
Buyers in the US purchase an Ezer water-filter unit + installation as a GIFT for a family
in Brazil, and Selvacore Brazil (our existing for-profit company) fulfills the install.
This is a normal purchase, not a charity donation.

Before writing any code, read these for full context:
- docs_for_claude/selvacore-campaign-app-plan.md   (the implementation plan — source of truth)
- docs_for_claude/selvacore-campaign-strategy.md    (the business rationale)
- CLAUDE.md                                          (project conventions — follow exactly)

SCOPE: build ONLY Phase 1 (MVP) from the app plan. Do NOT build Phase 2 or 3 yet.
Phase 1 is:

1. Extend the `orders` model/collection with:
   - channel: 'local' | 'us-gift'  (default 'local' so the existing business is untouched)
   - buyer: { name, email, uid? }   (the US payer)
   - beneficiaryId                  (the Brazil family; null = "where needed most")
   - amountUSD, currency, fxRate    (pricing snapshot)
   Update types/order.ts and re-export from types/index.ts.

2. Add a `beneficiaries` collection with lib/services/beneficiaryService.ts and
   types/beneficiary.ts. Fields: internalName, region, city, householdInfo,
   status ('waitlisted'|'gifted'|'scheduled'|'installed'), assignedDeviceId,
   story, photos[], createdAt. Admin/technician access only. Keep it privacy-safe
   (no exact addresses; nothing identifying for minors).

3. Add lib/services/paymentService.ts — a provider-agnostic interface
   (createCheckout, handleWebhook, refund) with a STRIPE implementation in TEST/SANDBOX
   mode. Use it for the 'us-gift' channel. Leave the existing simulated
   amazonPaymentService.ts and the local order flow working exactly as they are.

4. Add a SERVER-SIDE Cloud Function webhook in functions/ that marks a gift order 'paid'
   only when Stripe confirms it. The client must NEVER set payment status — only the
   webhook does. Match the existing trigger style in functions/src/orders/.

5. Build a public app/give storefront (NO login required): a clean, bright, Apple-style
   landing page with a "units delivered" counter and two choices — "Give toward a unit"
   (any amount) and "Gift a full Ezer" — leading to a GUEST checkout (name + email),
   a Stripe test checkout, and an order-confirmation screen.

6. Reuse the existing ADMIN UI to list 'us-gift' orders and match each to a beneficiary.
   Reuse the existing TECHNICIAN install flow with NO changes.

7. Buyer-facing UI in English, using the existing lib/translations/ system.

8. Add Firestore security rules: `beneficiaries` admin/technician only; 'us-gift' orders
   readable by their buyer and by all admins, with payment status writable server-side only.

HARD CONSTRAINTS (from CLAUDE.md — do not violate):
- PLAN BEFORE CODE. First give me a step-by-step plan + any decisions you need from me,
  and WAIT for my approval before editing files.
- Create a checkpoint before major changes.
- Functional components only, under 100 lines. kebab-case filenames, PascalCase components.
- Apple design tokens: backgrounds #FFFFFF / #F5F5F7, text #1D1D1F, accent #0071E3,
  radius cards 12px / buttons 8px / inputs 6px, card shadow 0 2px 8px rgba(0,0,0,0.08),
  system font stack.
- All Firebase calls in try/catch with `error: unknown` + `instanceof Error` checks.
- Never duplicate the lib/firebase/config.ts singleton. Admin SDK stays server-side only.
- Do NOT break the existing local commercial order/checkout flow.
- Secrets go in .env.local only — never hardcode or commit Stripe keys.
- Run `npm run build` after each meaningful chunk and report results. Do NOT deploy.

DECISIONS TO CONFIRM IN YOUR PLAN (don't assume):
- Extend the existing `customer` role for the buyer vs. add a thin `supporter` role —
  recommend one and explain the tradeoff in plain terms.
- Use a placeholder unit price for now (I'll give you the real Ezer cost in BRL later);
  show me where it's configured.
- Flag anything in the existing code this touches in a risky way.

I'm the CEO, not an engineer — explain your decisions in plain, non-technical language as
you go. Start by giving me the plan.
```

---

**How to use it:** run Claude Code in the repo, paste the block, and it will respond with a plan first. Review the plan, answer its questions, then tell it to proceed. Build in chunks and let it run `npm run build` between them.

**When Phase 1 is working,** ask me for the Phase 2 prompt (named-family gifting + recurring + the buyer impact loop) and Phase 3 (multi-currency + more markets).
