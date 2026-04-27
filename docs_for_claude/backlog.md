# Backlog

Small, deferred items that are not urgent enough to schedule but should not be lost. Glance at this file when starting a new feature — some of these batch nicely into a 30-minute session.

Format per item: **title** → context, why deferred, what "done" looks like.

---

## Open items

### 1. Backfill Cloud Function for pre-Phase-4.5 reviews

**Context:** Phase 4.5 added denormalized `customerName` and `technicianName` to the `reviews` collection (written by `reviewService.createReview`). Pre-Phase-4.5 review docs are missing these fields. `reviewAdminService.hydrateMissingNames` handles the gap at read time (batch-fetches live user docs per page), so there is no functional break.

**Why deferred:** The read-through fallback means admins never see broken rows. A backfill only becomes worthwhile if (a) the admin reviews page starts feeling slow on Active/Flagged tabs, or (b) we add a surface that reads reviews in bulk outside the admin path (e.g. a public review export). Neither exists today.

**Done when:** A one-shot Cloud Function (callable or manual HTTP trigger — does NOT need to be scheduled) iterates every review where `customerName` or `technicianName` is empty/missing, fetches the corresponding user doc, and writes the display name onto the review. Idempotent: re-running it on an already-backfilled collection is a no-op.

**Trigger to revisit:** "the admin reviews page feels slow" OR a second read path is added.

---

### 2. Hardcoded English audit in customer + sub-admin pages

**Context:** During Phase 4.4 work, untranslated English strings were spotted in `app/customer/orders/page.tsx` and under `app/sub-admin/*`. The rest of the customer/technician/admin tree already uses `useTranslation`.

**Why deferred:** User-visible but not blocking — pt/es/ko users get a mix of translated and English strings on these specific pages. Fixing it is mechanical: find the strings, add keys to all four locales, swap in `t(...)`.

**Done when:** `rg "'[A-Z][a-z]+ " app/customer/orders/page.tsx app/sub-admin` returns nothing that is a user-facing string literal (ignore imports, types, icon names). All four locales (`en`, `pt`, `es`, `ko`) have matching keys.

**Trigger to revisit:** Any i18n complaint from a non-English user, OR next time the sub-admin portal gets touched.

---

### 3. ~~Fix or remove `tests/admin.test.ts`~~ (RESOLVED 2026-04-26)

Resolved by gating the suite behind `describe.runIf(process.env.TEST_E2E)` at `tests/admin.test.ts:14`. Default `npm test` runs are clean (suite skipped); run e2e via `npm run dev` (in one terminal) + `TEST_E2E=1 npm test` (in another). The `beforeAll` server-reachability check is preserved as a guardrail for opt-in runs.

---

### 4. Email templates render in English regardless of user language

**Context:** `functions/src/maintenance/emailTemplates.ts` (and any future server-side email template) emits English subject + body strings only. Recipients who selected pt/es/ko in the UI still receive English emails.

**Why deferred:** Tier A (customer pages) i18n pass focused on UI strings only. Server-side rendering is a separate workstream — it requires looking up the recipient's `users/{uid}.preferredLanguage` at send time and either branching template rendering or running translations through a server-friendly i18n util (the client `useTranslation` hook is not usable here).

**Done when:** The four reminder/overdue/critical/completion templates each render in the recipient's `preferredLanguage`, falling back to English if missing. Translations live alongside the existing locale files (or a slim server-only mirror), and CF unit tests cover the language-pick path.

**Trigger to revisit:** First non-English user complaint about email content, OR Tier C/D i18n work expands scope to server-rendered output.

---

### 5. Tier D (technician/sub-admin) i18n audit

**Context:** Tier A finished customer pages and Tier C finished admin pages — `app/customer/*` and `app/admin/*` now consume `useTranslation` + `useLocaleFormatters` everywhere, and the per-role status helper `getOrderStatusLabel(status, role, t)` is wired into admin/orders, admin/orders/[id], sub-admin/orders, and technician/jobs/[id]. But `app/technician/*` and `app/sub-admin/*` still hold hardcoded English strings (loading toasts, page titles, table headers, stat labels, button copy, tab names) and call the formatters with no locale arg, meaning numbers/dates/currency render English-style regardless of the selected language.

**Why deferred:** Same pattern as Tiers A and C — mechanical but high-volume. The `formatters.ts` LOCALE NOTE header explicitly flags this as intentional debt: "Technician/sub-admin pages still pass no locale arg, meaning they render English regardless of user language. This is intentional debt — to be paid off in Tier D (technician/sub-admin) i18n pass."

**Done when:** No hardcoded English in `app/technician/**` or `app/sub-admin/**` (audit via grep for capitalized string literals). All date/currency/relative-time displays use `useLocaleFormatters()`. All four locales (`en`, `pt`, `es`, `ko`) symmetric on key shape — `npx tsc --noEmit` clean.

**Trigger to revisit:** Any non-English user complaint about technician/sub-admin copy, OR an explicit ask to ship Tier D.
