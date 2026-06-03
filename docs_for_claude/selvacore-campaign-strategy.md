# Selvacore Campaign — Cross-Border Strategy (For-Profit Model)

**What it is:** US buyers purchase an Ezer water-filter unit + installation as a **gift for a family in Brazil**. Selvacore Brazil — your existing **for-profit** company — receives the money and performs the installation.

**Owner:** Shawn Lee (CEO) · **Date:** 2026-05-31 · **Status:** Draft for discussion
*(Supersedes the earlier NGO/charity version — Selvacore stays for-profit.)*

> ⚠️ **Not legal, tax, or financial advice.** This summarizes current (2025–2026) practice so you can decide and ask sharp questions. Confirm the structure with a **US CPA** and a **Brazilian accountant (*contador*)** before forming entities or moving money — especially the Brazilian tax point in Section 6.

---

## 1. The answer to your question: yes, and it's simpler

Keeping Selvacore for-profit **removes** the hardest parts of the earlier plan. You no longer need a 501(c)(3), a fiscal sponsor, IRS approval, equivalency determinations, or the no-earmarking rule. The model changes from *charitable donation* to **cross-border gift commerce**: a US buyer buys a product (an Ezer install) and gifts it to a family in Brazil.

**What you give up:** US buyers can't claim a tax deduction, and you can't call it a "donation" or yourself a "nonprofit."
**What you gain:** speed, far less compliance, and — importantly — buyers **can now choose a specific named family**, which the charity rules explicitly forbade. Your app, already built for commerce, fits this model more naturally than the charity one.

**Recommended structure in one line:** a small **US LLC** acts as the storefront (collects USD), and pays **Selvacore Brazil** to fulfill the installs.

---

## 2. The core reframe still holds: buyer ≠ beneficiary

| | Today (local commercial app) | Cross-border gift model |
|---|---|---|
| **Who pays** | The customer | A buyer in the US |
| **Who gets the install** | The same customer | A beneficiary family in Brazil |
| **What the money is** | A purchase | Still a purchase (a *gift* purchase) |
| **What the payer wants back** | Product + service | **Proof their gift reached a real family** |
| **Currency** | One (BRL) | USD in → BRL out |

The back half of your app — technician jobs, installation, completion photos, device registration, maintenance — is **reused almost unchanged**. The new build is the US buyer experience, real payments, the buyer→beneficiary link, and the proof-of-impact loop.

---

## 3. Two non-NGO ways to run this

**A) Pure gift commerce — *recommended*.** Selvacore (via a US storefront) sells gift-installs directly. Simple, fast, fully under your control. Not tax-deductible for buyers — fine for gift purchases and impact-minded buyers who don't need a receipt.

**B) For-profit + charity partner — *optional, later*.** A partner nonprofit runs tax-deductible fundraising and **pays Selvacore (for-profit) as its installation vendor**. This keeps Selvacore for-profit *and* gives donors a deduction — at the cost of involving a third party and revenue share. Worth revisiting once you're scaling or chasing grant/large-donor money. You don't need it to launch.

The rest of this doc assumes **Option A**.

---

## 4. Recommended legal & operating structure

**US LLC (storefront / merchant of record) → Selvacore Brazil (Ltda, fulfiller).** US buyers pay the US LLC in dollars; the LLC pays Selvacore Brazil to install. This gives clean USD pricing, US-merchant trust, and access to the best payment tools.

**Forming a US LLC as a non-US (Brazilian) owner:**

| Item | Detail |
|---|---|
| Cost | ~**$200–$800 all-in** (state filing $50–$500+, registered agent $49–$300/yr; EIN is free) |
| Timeline | **1–3 weeks** to form; add a few weeks for EIN + bank account |
| Registered agent | **Required** (you can't self-serve as a non-resident) |
| EIN | File Form SS-4 by fax/phone/mail — **no SSN needed** |
| Banking | Digital banks **Mercury** or **Wise** onboard non-resident LLCs remotely |
| Ongoing | Annual report/franchise fee + a US tax filing — a foreign-owned single-member LLC must file **Form 5472 + pro-forma 1120** (**steep penalties if missed — use a US CPA**) |

**Alternative — sell directly from Brazil (no US entity).** A Brazilian Stripe account *can* charge US cards, **but it settles in BRL only and adds ~1% FX** on top of processing, and US buyers see a foreign merchant (lower trust/conversion). Note: merchant-of-record platforms **Paddle and Lemon Squeezy won't work** — they're digital/SaaS only and explicitly ban physical goods and installation services. Sell-direct is the faster way to *test demand*, but the US LLC is the better home for a real launch.

---

## 5. Money flow

```
US buyer (USD card)
      │
      ▼
US LLC — Stripe (standard 2.9% + $0.30), USD
      │  settles to US business account (Mercury)
      ▼
Wise: USD → BRL (mid-market + ~0.5%, in batches)
      │
      ▼
Selvacore Brazil (Ltda) — books as revenue via FX contract (contrato de câmbio)
      │
      ▼
PIX → technicians / suppliers (instant, local)
```

**Processing + transfer cost ≈ 3.5–4%.** The bigger cost is **Brazilian tax on the revenue** (Section 6) — that must be priced into the unit, not treated as an afterthought.

---

## 6. The Brazil tax reality (read this carefully)

Because Selvacore is for-profit, **incoming money is business revenue and is taxed** — unlike a donation to a nonprofit. Two points to take to your *contador*:

1. **The "service export" exemption probably does NOT apply.** Service exports from Brazil are normally exempt from PIS/COFINS and ISS — **but only when the service's result occurs abroad.** Your installation happens **in Brazil**, so it likely **fails** that test and those taxes likely apply. Don't assume an export exemption.
2. **Income tax always applies:** IRPJ + CSLL (~34% on profit under standard regimes). If Selvacore's revenue is under **R$4.8M/year**, **Simples Nacional** gives a much lighter, simpler combined rate — likely your best fit as a small company.

**Bottom line:** set the US sale price to cover unit cost + installation + ~4% payments/FX + Brazilian taxes + your margin. Get your *contador* to give you the effective tax rate so the price is right from day one.

**US side (high level):** US sales tax generally isn't triggered until you cross an **economic nexus** threshold (commonly **$100k/yr**; CA/TX $500k), and a service performed in Brazil is unlikely to be a taxable in-state sale — but confirm with a US CPA as you grow.

---

## 7. Pricing & the two gift tiers

Your "both / tiered" idea works cleanly now (and you can name the family):

- **Tier 1 — Give toward a unit (pooled).** Any amount goes toward the next Ezer install. Great for smaller and group gifts.
- **Tier 2 — Gift a full Ezer to a family.** The buyer funds a complete unit + install and **can pick a specific waitlisted family** (or "where it's needed most"), then receives photos and a short story once it's installed.

Each tier is a normal purchase, so a standard order confirmation/receipt is all you need — no charity receipt machinery.

---

## 8. Trust & transparency — still your real product

A buyer 8,000 km away is paying on faith, and proof is what drives repeat gifts and referrals. Build the proof loop in from the start: instant order confirmation, a visible "units delivered" counter, and — when your technician completes an install and uploads completion photos (which the app already captures) — push that proof back to the buyer: *"The Ezer system you gifted is now delivering clean water to a family in [region]."* Keep beneficiary stories consent-gated and privacy-safe (no identifying detail for minors). Your Apple-clean design (bright, white, `#0071E3`) is ideal: photo-forward, warm, uncluttered.

---

## 9. Marketing language — one legal guardrail

You may say *"your purchase brings clean water to a family in Brazil."* You may **not** call it a tax-deductible donation, call Selvacore a nonprofit/charity, or imply a deduction — that would be false advertising. Keep claims truthful (FTC-style): it's a **gift purchase with real impact**, not a donation.

---

## 10. Phased roadmap

| Phase | Focus | Key steps | Rough time |
|---|---|---|---|
| **0 — Foundation** | Structure + money rails | Confirm the model with a US CPA + Brazilian *contador*; form the **US LLC** + registered agent + EIN; open **Mercury/Wise**; set Stripe live; get the **Ezer unit cost in BRL** and set US pricing | 2–6 weeks (parallel) |
| **1 — MVP app** | Prove US → Brazil | US buyer flow + `app/give` storefront; real Stripe payment (webhook-confirmed) + order confirmation; buyer↔beneficiary link; reuse existing admin/technician for installs; proof photos back to buyer | 4–6 weeks |
| **2 — Named gifting + recurring** | Raise conversion & repeat | "Gift to a specific family" tier with photos/story; monthly/group gifting; buyer dashboard with impact | 3–5 weeks |
| **3 — Scale** | More markets, more proof | Canada/Europe (currencies, GDPR); public impact map; analytics; optional charity-partner tier for deductible giving | Ongoing |

---

## 11. Risks & who to validate with

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Brazil tax assumption** | Wrongly assuming an export exemption (install is in Brazil) under-prices the unit | Get the effective rate from a *contador*; price it in; consider Simples Nacional |
| **US Form 5472** | Foreign-owned US LLC must file it; penalties are steep | Use a US CPA from year one |
| **Pricing too low** | Tax + FX + fees can quietly eat the margin | Build the full cost stack into the sale price |
| **Stripe/MoR misfit** | Brazilian Stripe settles BRL-only; Paddle/Lemon Squeezy ban this | Use the US LLC + US Stripe path |
| **Consumer disclosure** | Selling a gift delivered to a third party abroad | Clear refund/timeline/"charged only when confirmed" terms |

**Engage in Phase 0:** a US CPA (international/foreign-owned LLC) and a Brazilian *contador* (revenue/tax regime, FX).

---

## 12. Open decisions — let's discuss

1. **US LLC storefront vs. sell-direct-from-Brazil?** (I recommend the US LLC for a real launch; sell-direct is fine only to quickly test demand.)
2. **What does one Ezer unit + install cost in BRL?** Needed to set the US gift price.
3. **One app or two?** Fold the campaign into the existing SelvacoreApp (recommended — reuse the install engine), or build separately? Keep the local commercial business running too?
4. **Brand:** is the buyer-facing campaign "Selvacore," or its own name?
5. **Do you want the optional charity-partner tier later** for buyers who want a tax deduction?

---

## 13. Sources

**For-profit structure / payments:**
- Stripe — supported currencies & FX margin — https://docs.stripe.com/currencies
- Stripe — Brazil payouts (BRL-only settlement) — https://support.stripe.com/questions/payouts-in-brazil-card-receivables
- Taxes for Expats — foreign-owned US LLC — https://www.taxesforexpats.com/articles/foreign-business/how-to-form-an-llc-in-the-us-as-a-non-resident.html
- Wise — LLC for non-US residents — https://wise.com/us/blog/llc-for-non-us-residents
- Northwest Registered Agent — LLCs for non-citizens — https://www.northwestregisteredagent.com/llc/non-citizen
- Paddle — what you can't sell (no physical goods/services) — https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
- Stripe — US sales tax & economic nexus — https://stripe.com/guides/introduction-to-us-sales-tax-and-economic-nexus
- Sales Tax Institute — economic nexus state guide — https://www.salestaxinstitute.com/resources/economic-nexus-state-guide

**Brazil tax / FX:**
- Deloitte — Brazil Tax Highlights 2025 (IRPJ/CSLL/PIS/COFINS) — https://www.deloitte.com/content/dam/assets-shared/docs/services/tax/2025/dttl-tax-brazilhighlights-2025.pdf
- PwC — Brazil other taxes (ISS, service-export treatment) — https://taxsummaries.pwc.com/brazil/corporate/other-taxes
- Barros Carvalho — SC COSIT 73/25 service-export ruling (Simples) — https://www.barroscarvalho.com.br/2025/06/09/sc-cosit-n-73-25-rfb-enquadra-servicos-prestados-remotamente-a-contratante-domiciliado-no-exterior-como-exportacao-de-servicos-no-simples-nacional/
- Wise — send money to Brazil / PIX — https://wise.com/us/send-money/send-money-to-brazil

*Figures current as of research on 2026-05-31 and subject to change. The earlier charity-route research is preserved in version history if you ever pursue the optional charity-partner tier. Not legal/tax advice — confirm with counsel.*
