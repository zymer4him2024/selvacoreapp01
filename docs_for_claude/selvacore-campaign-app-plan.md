# Selvacore Campaign — App & Product Change Plan (For-Profit Model)

**Companion to:** `selvacore-campaign-strategy.md` · **Date:** 2026-05-31 · **Status:** Draft
*(Supersedes the earlier NGO app plan — Selvacore stays for-profit.)*

This translates the for-profit strategy into concrete changes to the **existing SelvacoreApp codebase** (Next.js · TypeScript · Firebase · Tailwind), written so you can hand sections to Claude Code.

> **Key insight:** the for-profit model fits your app *even better* than the charity one. Your app is already built for commerce — a customer buying a product + install and paying for it. The only real change is that **the payer (US buyer) and the install recipient (Brazil beneficiary) are now different people**, plus real multi-currency payments and a proof-of-impact loop. No charity receipts, no donation ledger, no fiscal-sponsor integration.

---

## 1. What's reused vs. new

| Existing piece | Role in the for-profit campaign |
|---|---|
| `customer` role + browse/checkout/order flow | **Reused & extended** — the US buyer is a customer buying a *gift* install |
| `orders` collection + `orderService` | **Extended** — an order whose payer ≠ install recipient |
| `technician` role + job flow (accept → install → photos → complete) | **Reused as-is** — the Brazilian installer |
| `admin` role + order/device/maintenance management | **Reused** — Selvacore Brazil ops |
| `deviceService`, `maintenanceService` | **Reused** — each gifted Ezer is still a registered device |
| `transactions` audit log, `mail` + Trigger Email, `notifications/createNotification` | **Reused** — power the buyer impact loop |
| `lib/translations/` (EN/ES/PT-BR/KO) | **Reused** — buyer UI in English; Brazil ops/tech in PT-BR |
| `amazonPaymentService.ts` (simulated) | **Replaced** — real Stripe, webhook-confirmed |
| Charity receipts / donation ledger | **Not needed** — a normal order confirmation suffices |

---

## 2. Roles — you may not even need a new one

The US buyer is essentially a **customer**. Two options:
- **Extend the existing `customer` role** with a "gift to a family in Brazil" purchase path (lightest).
- Or add a thin **`supporter`** role if you want a distinct buyer dashboard/identity.

Either way, support **guest checkout** (buy with just name + email, optional account afterward) — today auth is **Google Sign-In only**, so a low-friction guest path is the main auth change (`AuthContext.tsx`, `app/login`, `ProtectedRoute.tsx`, `middleware.ts`). New public route `app/give`; buyer area under `app/give/account` or reuse `app/customer`.

**Beneficiary = data, not a login** (new `beneficiaries` collection):
```
beneficiaries/{id}
  internalName, region, city, householdInfo
  status        // 'waitlisted' | 'gifted' | 'scheduled' | 'installed'
  assignedDeviceId
  story, photos[]   // optional, consent-gated, privacy-safe
  createdAt
```

---

## 3. Data model — extend `orders`, skip the charity layer

No `donations` or `receipts` collections needed. A gift is an **order**:
```
orders/{id}  (extend existing)
  channel            // 'local' | 'us-gift'
  buyer{ name, email, uid? }   // the US payer
  beneficiaryId      // the Brazil family (null = "where needed most")
  amountUSD, currency, fxRate  // pricing snapshot
  processor, processorRef
  status             // existing lifecycle; payment 'paid' set by webhook, NOT client
  ...existing fields (install address now comes from the beneficiary)
```
Optional `campaigns` collection (`title`, `unitsGoal`, `unitsDelivered`, `unitPriceUSD`, `active`) for the public progress counter. Add a `paymentService.ts` (Stripe first, provider-agnostic) and types in `types/order.ts`.

---

## 4. Payments — real Stripe through the US LLC

- Build `lib/services/paymentService.ts` with `createCheckout` / `handleWebhook` / `refund`. Implement **Stripe** (standard 2.9% + $0.30 — no nonprofit rate, since you're for-profit).
- **Security-critical:** an order is marked `paid` only by a **server-side Cloud Function webhook** from Stripe — never by client code. Same boundary as your existing "admin SDK server-side only / try-catch everywhere" rules.
- Retire `amazonPaymentService.ts` unless you keep the local commercial business on it.
- The US LLC is the Stripe account holder; funds settle to its US bank, then sweep to Selvacore Brazil via Wise (operational, outside the app).

---

## 5. User flows

**US buyer (new, but commerce-shaped):** `app/give` → see campaign + units delivered → choose **Give toward a unit** (any amount) or **Gift a full Ezer** → optionally **pick a waitlisted family** (now allowed — it's a purchase) or "where needed most" → pay (Stripe, USD) → instant order confirmation → later, impact photos.

**Brazil admin (existing):** see paid gift-orders → match to a `beneficiary` → create/confirm the install order → assign technician. On completion, the buyer impact update fires.

**Technician (unchanged):** accept → install → completion photos → complete → register device via QR. Your reuse win.

---

## 6. Named-family selection (newly unlocked)

Because this is commerce, not a deductible donation, buyers **may** choose a specific family — the feature the charity rules forbade. Build a simple, privacy-safe picker over `beneficiaries` with `status: 'waitlisted'` (coarse location, consented story/photo, no exact address; nothing identifying for minors), plus a "where it's needed most" default.

---

## 7. Impact loop (your retention engine)

Add a Cloud Function `onGiftInstallCompleted` (sibling to `orders/orderTriggers.ts`): when a `channel: 'us-gift'` order completes, create a buyer notification (`notifications/createNotification`) and queue an email (`mail` collection + existing Trigger Email; new template alongside `maintenance/emailTemplates.ts`) — "The Ezer system you gifted is now delivering clean water." Surface the completion photos (already in Storage) on the buyer's view.

---

## 8. Privacy, currency, one-app decision

- **Privacy:** beneficiary photos/stories are consent-gated and privacy-safe; honor the CLAUDE.md "never store raw user content permanently" rule.
- **Currency:** USD first; store currency + `Intl` formatting; add CAD/EUR in Phase 3.
- **One app vs. two (recommended: one):** add the buyer path + `app/give` to the existing app and reuse admin/technician for Brazil installs — lowest cost, the engine already exists.

---

## 9. Phased build (hand to Claude Code)

| Phase | Build tasks |
|---|---|
| **1 — MVP** | Guest-checkout path; `app/give` storefront + units-delivered counter; extend `orders` (`channel`, `buyer`, `beneficiaryId`); `paymentService` (Stripe) + webhook CF; order confirmation; reuse technician flow; manual admin matching of order→beneficiary |
| **2 — Named gifting + recurring** | Beneficiary picker UI; `onGiftInstallCompleted` CF → buyer notification + email + impact photos; recurring/group gifting; buyer dashboard |
| **3 — Scale** | Multi-currency (CAD/EUR) + `Intl`; Canada→Europe (GDPR consent); public impact map; analytics in `adminStatsService`; optional charity-partner channel |

---

## 10. Security rules & "what not to change"

- **Add Firestore rules:** `campaigns` public-read; `orders` with `channel:'us-gift'` — buyer reads own, admin/sub-admin read all, **payment status writable only server-side**; `beneficiaries` admin/technician-only.
- **Don't change:** the `lib/firebase/config.ts` singleton; centralized `types/index.ts`; `try/catch` + `error: unknown`; admin SDK stays server-side; **`npm run build` before deploy**; deploy Firestore indexes before hosting.

---

## 11. First three things (once Phase 0 is moving)

1. Decide **one app vs. two**, and **extend `customer` vs. add `supporter`** role.
2. Get the **Ezer unit + install cost in BRL** → set the US gift price (with tax/FX baked in).
3. Have Claude Code scaffold the extended `orders` model + `paymentService` (Stripe sandbox) + `app/give` so you can demo buy → install → proof end-to-end before the US LLC and real payments are live.

*Pairs with `selvacore-campaign-strategy.md`. Legal/payment/tax specifics there are general information, not advice — confirm with a US CPA and Brazilian contador.*
