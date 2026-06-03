# Selvacore Giving — App & Product Change Plan

**Companion to:** `ngo-campaign-strategy.md` · **Date:** 2026-05-31 · **Status:** Draft for discussion

This translates the strategy into concrete changes to the **existing SelvacoreApp codebase** (Next.js · TypeScript · Firebase · Tailwind). It's written so you can hand sections directly to Claude Code as build tasks.

> The biggest idea: **reuse the back half, build the front half.** Your technician job/installation/photo/maintenance engine and your admin dashboard already do 80% of what "Selvacore Brazil executes the installation" requires. The new work is a **donor experience**, **real payments**, a **pooled-funding ledger**, and a **trust/impact loop**.

---

## 1. What's reused vs. what's new

| Existing piece | Role in the NGO model |
|---|---|
| `technician` role + job flow (accept → install → completion photos → complete) | **Reused almost as-is** — the Brazilian installer |
| `admin` role + order/device/maintenance management | **Reused** — Selvacore Brazil operations team |
| `deviceService`, `maintenanceService` (device registration, schedules) | **Reused** — every funded Ezer is still a registered device |
| `orders` collection + `orderService` | **Extended** — becomes the "installation job," now funded by donations instead of a paying customer |
| `transactions` audit log | **Extended** — add donation + fund-allocation events |
| `mail` collection + Trigger Email, `notifications/createNotification` | **Reused** — power the donor impact loop |
| `lib/translations/` (EN/ES/PT-BR/KO) | **Reused** — donor UI in English; Brazil ops/tech in PT-BR |
| `amazonPaymentService.ts` (simulated) | **Replaced** — real processor (Stripe/PayPal), webhook-confirmed |
| `customer` role + product browse/checkout | **Repurposed/retired** depending on the "one app or two" decision (Section 9) |

---

## 2. New role: `donor`

Add `donor` to the user role union (`types/user.ts`) alongside `customer | technician | admin | sub-admin`.

- **Low-friction signup.** Donors are the US public — they must be able to **give as a guest** (no account), capturing just email + name for the receipt, with an *optional* account to track impact afterward. This is a real change: today auth is **Google Sign-In only**. Add a guest-donation path and consider email/passwordless login. Touches `contexts/AuthContext.tsx`, `app/login`, `app/select-role`, `components/common/ProtectedRoute.tsx`, `middleware.ts`.
- **New routes:** `app/give` (public campaign landing + donate flow, no login) and `app/donor/*` (dashboard, donation history, impact, receipts — login required).

## 3. Beneficiary = data, not a login

The Brazilian family receiving an Ezer is **not** an app user. Model it as a record managed by Brazil admins/technicians. New `beneficiaries` collection (privacy-sensitive — see Section 8):

```
beneficiaries/{id}
  internalName        // for staff; never the public earmark target
  region, city        // coarse location only
  householdInfo       // size, need notes
  status              // 'waitlisted' | 'funded' | 'scheduled' | 'installed'
  assignedDeviceId    // links to devices/ after install
  story               // optional, consent-gated public narrative
  photos[]            // optional, consent-gated, no minors' identifying detail
  createdAt
```

## 4. Firestore data-model changes

**New `donations` collection** — the heart of the new model:
```
donations/{id}
  donorId | guestEmail        // logged-in donor or guest
  amountOriginal, currency    // e.g. 250, "USD"
  amountUSD, fxRate, fxAt     // snapshot at time of gift
  tier                        // 'pooled' | 'sponsor'
  recurring                   // bool
  processor, processorRef     // 'stripe' | 'paypal', charge id
  status                      // 'pending' | 'succeeded' | 'refunded'  ← set by webhook, NOT the client
  receiptId
  allocatedToInstallationId   // null until matched to a completed install (sponsor tier)
  createdAt
```

**Extend `orders`** to double as the installation job: add `type: 'commercial' | 'campaign'`, `beneficiaryId`, and `sponsoredByDonationId` (nullable). This keeps the entire technician/admin pipeline working unchanged for campaign installs.

**Optional `campaigns` collection:** `title` (MultiLanguageText), `goalUnits`, `fundedUnits`, `unitCostBRL`, `active` — powers the public progress bar.

**`receipts` collection** (or rely on the processor / fiscal sponsor to issue them in Phase 1).

**Extend `transactions`** with event types: `donation_received`, `funds_allocated`, `install_attributed`.

New service files: `lib/services/donationService.ts` and `lib/services/paymentService.ts` (provider-agnostic interface, Stripe implementation first). Add types in `types/donation.ts`, re-exported from `types/index.ts`.

## 5. Payments — replace the simulated processor

- Build `paymentService.ts` with a small provider interface (`createCheckout`, `handleWebhook`, `refund`) so you can swap/extend providers. Implement **Stripe** first (nonprofit rate, great UX); optionally add **PayPal Giving Fund** for zero-fee receipting if you launch before having your own charity.
- **Security-critical:** a donation is only marked `succeeded` by a **server-side Cloud Function webhook** from the processor — never by client code. Mirror the existing "all Firebase calls in try/catch, admin SDK server-side only" rules. This is the one place where getting the trust boundary wrong is dangerous.
- Keep `amazonPaymentService.ts` only if you retain the commercial business; otherwise retire it.

## 6. User flows

**Donor (new):** Land on `app/give` → see campaign + progress → choose **Fund the campaign** (any amount, pooled) or **Sponsor an Ezer** (full unit) → pay (Stripe, USD) → instant receipt → optional account → later receive impact update + photos.

**Brazil admin (mostly existing):** See available funded balance → manage `beneficiaries` waitlist → when funds cover a unit, create a `campaign`-type order and assign a technician → on completion, **attribute** the install to a donor (sets `allocatedToInstallationId` / `sponsoredByDonationId`) → triggers the donor update.

**Technician (unchanged):** Accept job → install → upload completion photos → complete → register device via QR. This is your reuse win — little to no change.

## 7. The impact loop (your retention engine)

Add a Cloud Function `onCampaignInstallCompleted` (sibling to existing `orders/orderTriggers.ts`): when a `campaign`-type order is completed, create a donor notification (`notifications/createNotification`) and queue an email (`mail` collection + existing Trigger Email extension, new template alongside `maintenance/emailTemplates.ts`) — "The Ezer system you funded is now delivering clean water." Surface the same proof on `app/donor` dashboard, pulling the completion photos already in Storage.

## 8. Privacy & trust (non-negotiable)

- CLAUDE.md rule "never store raw user content permanently" applies doubly to **beneficiary photos/stories** — gate everything behind explicit consent, never expose exact addresses, and never publish identifying detail of minors.
- Donor PII (email, payment) → handled by the processor where possible; store the minimum.
- This is also a **product** feature: trust badges, the funding progress bar, transparent fee disclosure, and the impact loop are what convert and retain donors. Design them in, Apple-clean (bright, white `#F5F5F7`, `#0071E3` accent, photo-forward).

## 9. The one big architecture decision

**Recommended: one codebase, new donor front-end, shared back-end.** Add the `donor` role and `app/give` + `app/donor` routes to the existing app; reuse admin/technician for Brazil execution. Lowest cost, fastest, and the operational engine is already built. Alternative is a separate app sharing the same Firebase project — more isolation, more duplication. (See open decision #1 in the strategy doc.)

## 10. Phased build (hand to Claude Code)

| Phase | Build tasks |
|---|---|
| **1 — MVP** | `donor` role + guest-donation auth path; `app/give` landing + progress; `donations` + `paymentService` (Stripe) + webhook CF; instant receipt; `app/donor` dashboard; extend `orders` with `type`/`beneficiaryId`; manual attribution by admin; reuse technician flow for installs |
| **2 — Personal + recurring** | "Sponsor an Ezer" tier; `onCampaignInstallCompleted` CF → notification + email; impact photos/story on donor dashboard; recurring (monthly) donations; automated receipts; `beneficiaries` management UI for Brazil admin |
| **3 — Scale** | Multi-currency acceptance (CAD, EUR) + `Intl` formatting; Canada → Europe compliance (GDPR consent, cookie/privacy); public impact map; campaign/cohort pages; donor/board analytics in `adminStatsService` |

## 11. Security rules & "what not to change"

- **Add Firestore rules:** `campaigns` public-read; `donations` donor-reads-own + admin/sub-admin read-all + **writes via server only**; `beneficiaries` admin/technician-only; `receipts` donor-own.
- **Don't change:** the `lib/firebase/config.ts` singleton; centralized `types/index.ts`; the `try/catch` + `error: unknown` convention; admin SDK stays server-side; **always `npm run build` before deploy**; deploy Firestore indexes before hosting.

---

## 12. First three things to do (once Phase 0 legal is moving)

1. Decide **one app vs. two** (Section 9) — unblocks everything else.
2. Get the **Ezer unit + install cost in BRL** — sets the "sponsor a unit" price and campaign goals.
3. Have Claude Code scaffold the `donor` role + `donations` collection + `paymentService` interface (Stripe sandbox), so the donation→install→proof loop can be demoed end-to-end before any real money or legal entity is finalized.

*Pairs with `ngo-campaign-strategy.md`. Legal/payment specifics there are general information, not advice — confirm with counsel.*
