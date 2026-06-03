# Selvacore Giving — Cross-Border Campaign Strategy

**What it is:** US donors fund Ezer water-filter installations for families in Brazil. Donors pay in their own currency; Selvacore Brazil receives the funds and performs the installation.

**Owner:** Shawn Lee (CEO) · **Date:** 2026-05-31 · **Status:** Draft for discussion

> ⚠️ **Not legal, tax, or financial advice.** This document summarizes well-documented, current (2025–2026) practice so you can make decisions and ask sharp questions. The legal and money-movement choices below **must** be confirmed with a US nonprofit attorney + CPA and a Brazilian lawyer + accountant (*contador*) before you incorporate anything or move real money. Several rules cited here changed more than once during 2025.

---

## 1. Executive summary

The idea works, and it's a clean one. But it changes your app at a fundamental level: **today the person who pays is the same person who gets the install. In the NGO model those are two different people in two different countries.** A *donor* in the US pays; a *beneficiary* in Brazil receives. Almost every product, legal, and money decision flows from that one split.

Three recommendations up front, explained in detail below:

1. **Launch under a fiscal sponsor, not your own charity (at first).** You can legally accept tax-deductible US donations in **weeks instead of months**, with no IRS waiting period and far less risk. Graduate to your own 501(c)(3) once monthly volume justifies the overhead.
2. **Design the "sponsor a family" tier carefully.** US tax law says a donor **cannot** earmark a deductible gift to a *specific named individual*. The fix is the same one World Vision and Compassion use: **pool the money, let your charity choose the recipient, and tell the donor the family's story *after* the match.** Same emotional payoff, fully compliant.
3. **Collect in the US, convert once in bulk, pay out locally in Brazil.** Money lands in a US account, moves to Brazil via a low-spread service (Wise), and reaches technicians/suppliers via PIX. All-in cost ≈ **3–4%** if done right, versus 7–9% if you let a payment processor auto-convert.

---

## 2. The core reframe — payer ≠ beneficiary

| | Today (commercial app) | NGO campaign model |
|---|---|---|
| **Who pays** | The customer | A donor in the US |
| **Who receives the install** | The same customer | A beneficiary family in Brazil |
| **What money is** | A purchase | A (mostly) tax-deductible donation |
| **What the payer wants back** | A product + service | *Proof their gift did good* |
| **Currency** | One (local) | Donor's currency → Brazilian reais |

The good news: the **back half of your app — technician jobs, installation, completion photos, device registration, maintenance — barely changes.** A Brazilian installer accepting and completing a job is almost identical to your current technician flow. The **new build is the front half**: a donor experience, real multi-currency payments, a pooled-funding ledger, and a trust/impact loop. (Details in the companion *App & Product Change Plan*.)

---

## 3. Decisions locked + my recommendations

| Decision | Your choice | My recommendation |
|---|---|---|
| First donor market | **United States** | Correct — largest giving market, one currency (USD), simplest compliance. Add Canada, then Europe, only after the model is proven. |
| Giving model | **Both / tiered** | Keep it — but structure the tiers around the earmarking rule (Section 5). |
| Legal structure | **Advise me** | **Fiscal sponsorship now → own 501(c)(3) later** (Section 4). |
| Deliverables | Strategy first, then app plan | This doc, then the app plan. |

---

## 4. Legal & tax structure — the decision that drives everything

### The principle that makes cross-border giving work
US donors can deduct gifts that fund work in Brazil **as long as a US charity retains full discretion and control over the money** and treats the Brazilian work as advancing its own charitable mission. Deductibility depends on *who controls the funds*, **not** on where the water filter physically gets installed. Wire money straight through to a foreign entity with no US control, and the IRS treats the charity as a "mere conduit" — the deduction (and potentially the charity's status) is at risk.

### The one rule that shapes your whole product: no earmarking to a named person
> *"You can't deduct contributions earmarked for relief of a particular individual or family."* — IRS Publication 526

If a donor hands money to your charity and says "give this to the Silva family specifically," that's legally a **personal gift, not a deductible donation.** This is the single most important constraint in your entire model, because your instinct — "let donors sponsor a specific family" — collides with it head-on.

**How legitimate "sponsor-a-child" charities solve it:** they **pool** the donations and the charity decides who gets helped. World Vision says it plainly — instead of cash to one child, *"your monthly sponsorship donations are pooled."* The named child or family is the **story**, not a legal instruction. You will do exactly the same with Ezer units (Section 5).

### Your structural options

| Option | How it works | Speed to launch | Cost / fee | Best when |
|---|---|---|---|---|
| **Fiscal sponsorship** *(recommended to start)* | An existing 501(c)(3) accepts deductible gifts for your project. **Model A**: project lives inside the sponsor. **Model C**: sponsor takes donations, keeps discretion, re-grants the net to you. | **Days–weeks**, no IRS application | Model A ≈ **9–15%**; Model C ≈ **4–10%** of funds | Small team, want to launch and prove demand now |
| **Your own 501(c)(3)** | Incorporate + file IRS Form 1023 | **3–6+ months** | **$600** IRS fee; ≈ **$1,500–5,000+** all-in with counsel | Volume justifies overhead (often past ~$50–100K/yr) |
| **"Friends of" org** | A US charity that supports a specific foreign charity; must be independently governed (not a conduit) | Months | Setup + ongoing | Once a registered Brazilian entity exists |
| **Commerce / "buy-a-unit"** | A for-profit sells "sponsorships"; **not tax-deductible** | Fast | Normal business costs | Donors don't need a deduction and you want to let them literally pick one named family |

### Recommended path
**Start with a fiscal sponsor (Model C).** You get tax-deductible donations almost immediately, the sponsor handles receipts, and — crucially — the sponsor can perform the **foreign-grant compliance** ("expenditure responsibility") on the grant to Selvacore Brazil, which sidesteps the hardest cross-border hurdle for a young organization (see Section 7). Market giving as **pooled "fund an Ezer."** Once you have steady monthly volume, **form your own 501(c)(3)** to cut the sponsor's fee and own the brand.

---

## 5. The tiered giving model — emotional *and* compliant

Your "both / tiered" choice maps onto two tiers that both stay deductible:

**Tier 1 — Fund the campaign (pooled).** Small/any amount. "Give $40 toward the next Ezer unit." Money enters a general fund; your charity deploys units where the need is greatest. Simple, fully compliant, great for one-off and recurring micro-gifts.

**Tier 2 — Sponsor an Ezer (pooled, but personal).** Larger gift (e.g., the full cost of one unit + install). The donor funds *a* unit, and **after** your Brazil team assigns and completes an installation, you attribute that completed install to the sponsor and send them the family's story and photos. Framing on the page: *"Your gift funds a complete Ezer system for a family like the Silvas"* — never *"your money goes to the Silvas."* The donor gets the human connection; you keep discretion and the deduction.

> **The fork to decide with counsel:** if you ever want donors to *literally* choose and fund one specific named family up front, that's only possible on the **commerce (non-deductible) track**. You can't have both "donor picks the exact named person" *and* "it's tax-deductible." My recommendation is the charity track with post-match storytelling — it raises more and carries less risk.

---

## 6. Money flow — how a US dollar becomes a Brazilian install

**Recommended architecture (US-first):**

```
US donor (USD card / bank)
        │
        ▼
Payment processor + receipt of record   ← Stripe (nonprofit 2.2%) or PayPal Giving Fund (0%)
        │   funds land in a US account/balance
        ▼
Batch convert USD → BRL via Wise        ← mid-market rate + ~0.5%, done in bulk
        │
        ▼
Brazilian account (Selvacore Brazil, CNPJ)  ← inbound FX via authorized bank (contrato de câmbio)
        │
        ▼
PIX → technicians / suppliers (instant, local)
```

**Platform options for collecting in the US:**

| Platform | Fee | Issues tax receipts? | Notes |
|---|---|---|---|
| **PayPal Giving Fund** | **0%** | **Yes** — it *is* the charity of record | Simplest if you have no charity yet; grants paid out monthly |
| **Stripe (nonprofit rate)** | **2.2% + $0.30** | No — you/your platform must | Best UX & control; needs a charity-of-record + a receipting layer |
| **Donorbox / Givebutter** | ~1.5–3% on top of processor | Yes (built-in) | Recurring donations + receipts out of the box |
| **Zeffy** | **$0** (funded by optional donor tips) | Yes | Truly free to you; donors see a suggested tip at checkout |

**Getting it to Brazil — the key gotchas:**
- A **US** Stripe/PayPal account **cannot pay out to a Brazilian bank.** Payouts go to a bank in the account's own country, so funds land in the US first.
- A **Brazilian** Stripe account settles in **BRL only.** PayPal's built-in USD→BRL conversion is expensive (~4.5–5% spread).
- **The cheap path is to collect in the US, then sweep to Brazil in batches via Wise** (true mid-market rate + ~0.5%; e.g. ~$87 on $10,000). Convert *once, in bulk* — not per-donation.
- **Brazil's IOF (FX tax)** has been volatile — a 3.5% hike in 2025 was overturned by the Supreme Court, with standard inbound third-party transfers around 0.38%. **Confirm the live rate with a Brazilian accountant.**

**All-in cost estimate:** ~2.2–3% processing + ~0.5% FX + ~0.38% IOF ≈ **3–4%**, versus 7–9% if you let PayPal auto-convert to reais.

---

## 7. The Brazil side

**Entity.** Receive the money into a **nonprofit association (*associação*)**, not a regular company (*Ltda*) — funds into an Ltda are taxed as business revenue. Genuine nonprofits are broadly exempt from income tax on mission-related activity (Lei 9.532/1997). Pursuing **OSCIP** status adds credibility and unlocks some Brazilian donor incentives.

**Receiving USD.** Inbound dollars are converted to reais through a bank authorized for foreign exchange; that conversion is the **contrato de câmbio**, your legal proof of the inflow. Operations under ~USD 50,000 use a simplified process; keep supporting documents for **10 years**.

**Making US gifts deductible when they fund a Brazilian entity.** Direct gifts to a foreign org aren't US-deductible. The standard fixes: (a) a US public charity grants to Selvacore Brazil after an **equivalency determination** (a finding that the Brazilian org is equivalent to a US public charity — but this requires passing a "public support test" that a single-funder startup often *fails*), or (b) **expenditure responsibility** (a documented grant-oversight process). **This is exactly why the fiscal-sponsor route is so attractive early on — the sponsor performs expenditure responsibility for you.**

**A bright spot:** Brazilian states currently **cannot** levy gift tax (ITCMD) on donations from abroad (the Supreme Court reaffirmed this in 2025), though it's a contested gap that could close — watch it with counsel.

**The reuse win:** Selvacore Brazil's installers map directly onto your existing **technician** role, and your Brazil ops team onto the existing **admin** role. The installation, photo-upload, device-registration, and maintenance machinery you've already built is the operational engine for this campaign.

---

## 8. Trust & transparency — your *real* product

A donor 8,000 km away is giving on faith. The thing that makes them give, give again, and tell friends is **proof.** This is where an NGO app wins or dies, and it should be a first-class part of the build, not an afterthought:

- **A receipt, instantly** (tax-deductible donation acknowledgment).
- **A visible funding goal and progress** ("37 of 50 units funded this month").
- **The impact loop:** when the Brazilian technician completes an install and uploads completion photos (which your app *already* captures), that proof flows back to the donor — "The Ezer system you funded is now delivering clean water to a family in [region]."
- **Honest, privacy-respecting beneficiary stories** (consent-gated; no exact addresses or identifying details of minors).
- **Aggregate impact** over time: liters of clean water, families served, a map.

Your Apple-clean design language (bright, white, simple, `#0071E3` accent) is perfect for this — photo-forward, emotionally warm, uncluttered.

---

## 9. Phased roadmap

| Phase | Focus | Key steps | Rough time |
|---|---|---|---|
| **0 — Foundation** | Legal + money rails (no app code) | Engage US nonprofit attorney/CPA + Brazilian counsel/*contador*; sign a **fiscal sponsor**; set up Selvacore Brazil as a nonprofit; open US collection + Brazilian receiving accounts; pick payment stack | 3–8 weeks (parallel) |
| **1 — MVP app** | Prove the model US→Brazil | Add **donor** role; campaign landing page; **pooled** donation + real payment + receipt; donor dashboard with progress; reuse existing admin/technician for Brazil installs; manual donor↔install attribution | 4–8 weeks |
| **2 — Personal + recurring** | Raise more, retain donors | "Sponsor an Ezer" tier with post-install attribution; impact photos/stories pushed to donors; monthly recurring giving; automated receipts | 4–6 weeks |
| **3 — Scale & expand** | More markets, more proof | Add Canada then Europe (currencies, GDPR, local compliance); public impact map; campaign/cohort pages; analytics for the sponsor/board | Ongoing |

---

## 10. Risks & who to validate with

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Earmarking** | Letting donors fund a *named* person breaks deductibility and can endanger charity status | Keep funds pooled + charity discretion; attribute *after* the match |
| **Conduit / lost control** | Passing money straight through to Brazil fails the IRS control test | US charity (or sponsor) holds discretion + documents the grant |
| **Foreign-grant compliance** | Skipping expenditure responsibility / equivalency determination on Brazil grants | Use the fiscal sponsor's process early; build it in when you go independent |
| **Wrong Brazilian entity** | Funds into an Ltda are taxed as revenue | Use a nonprofit *associação* (→ OSCIP) |
| **FX bleed** | Naive conversion costs 7–9% | Collect USD, convert in bulk via Wise, PIX locally |
| **Rule volatility (2025–26)** | IOF, ITCMD, nonprofit-exemption rules all shifted recently | Re-confirm figures with counsel before launch and periodically |

**Professionals to engage in Phase 0:** a US nonprofit attorney, a US CPA familiar with international grantmaking, a Brazilian nonprofit/tax lawyer, and a Brazilian *contador*.

---

## 11. Open decisions — what I need from you

1. **One app or two?** Fold the NGO campaign into the existing SelvacoreApp codebase as a new "donor" experience (reusing the technician/admin engine — my recommendation), or build it as a separate app? Do you also keep running the commercial install business in parallel?
2. **Fiscal sponsor vs. own charity** — are you comfortable starting under a fiscal sponsor to launch fast, or do you specifically want your own 501(c)(3) from day one?
3. **Does Selvacore Brazil already exist** as a legal entity (and is it a company or a nonprofit today)? This determines how much Phase 0 work is needed on the Brazil side.
4. **Brand:** is the donor-facing campaign called "Selvacore," or does it get its own NGO name/identity?
5. **Unit economics:** what does one Ezer unit + installation cost in Brazil (in BRL)? That number sets the "sponsor a unit" price and the campaign goals.

---

## 12. Sources

**Legal / tax (US):**
- IRS Pub. 526, Charitable Contributions — https://www.irs.gov/publications/p526
- IRS, Grants to foreign organizations by private foundations — https://www.irs.gov/charities-non-profits/grants-to-foreign-organizations-by-private-foundations
- IRS, Form 1023 user fee — https://www.irs.gov/charities-non-profits/form-1023-and-1023-ez-amount-of-user-fee
- Clark Nuber, Four Options for Tax-Deductible International Giving (2025) — https://clarknuber.com/articles/four-options-for-tax-deductible-international-giving/
- Hurwit & Associates, Legal Responsibilities of US "Friends" Organizations — https://www.hurwitassociates.com/international-philanthropy-ngos/legal-responsibilities-of-us-quot-friends-quot-organizations/
- Mission Edge, Fiscal Sponsorship: Model A vs. Model C — https://www.missionedge.org/news-and-resources/fiscal-sponsorship-model-a-vs-model-c
- World Vision, Child Sponsorship FAQs (pooled funds) — https://www.worldvision.org/sponsor-a-child/support-center/child-sponsorship-faqs

**Payments / FX:**
- Stripe nonprofit fee discount — https://support.stripe.com/questions/fee-discount-for-nonprofit-organizations
- Stripe Brazil payouts/settlement — https://support.stripe.com/questions/brazil-specific-payout-schedule-and-payment-availability
- PayPal Giving Fund — https://www.paypal.com/us/paypal-giving-fund/home
- Donorbox pricing — https://donorbox.zendesk.com/hc/en-us/articles/360020292992
- Givebutter pricing — https://givebutter.com/pricing
- Zeffy free model — https://www.zeffy.com/home/free-online-fundraising-platform
- Wise USD→BRL — https://wise.com/us/send-money/send-money-to-brazil
- Brazil IOF changes 2025 (EY) — https://www.ey.com/en_gl/technical/tax-alerts/brazilian-government-introduces-changes-to-regulations-dealing-with-taxation-of-financial-operations

**Brazil entity / regulatory:**
- Banco Central FX framework / Lei 14.286/2021 (explainer) — https://zsassociados.com/blog/banco-central-guide-foreigners-brazil/
- Demarest, BCB rules implementing the new FX framework — https://www.demarest.com.br/en/brazilian-central-bank-publishes-rules-that-regulate-provisions-of-the-new-legal-framework-for-the-brazilian-exchange-market/
- Council on Foundations, Nonprofit Law in Brazil (Oct 2025) — https://cof.org/content/nonprofit-law-brazil
- CAF America, What Is Equivalency Determination — https://cafamerica.org/fundamentals/what-is-equivalency-determination/
- ITCMD on foreign donations after EC 132 (Conjur, 2025) — https://www.conjur.com.br/2025-nov-29/itcmd-sobre-doacoes-do-exterior-apos-a-emenda-constitucional-no-132-2023/

*All figures current as of research on 2026-05-31 and subject to change; verify with qualified counsel before acting.*
