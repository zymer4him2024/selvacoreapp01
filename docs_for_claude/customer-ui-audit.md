# Customer UI/UX Audit — 2026-05-15

Scope: all 13 `/app/customer/*` pages + `CustomerLayoutClient`.

## Overall grade

| Page | Grade | Top-3 fixes |
|------|-------|-------------|
| `/customer` (home) | **B** | Skeleton loader; standardize empty-state; mobile aside layout |
| `/customer/register` | **B+** | Mix of Tailwind/inline-style grids; back-button pattern; required-asterisk DRY |
| `/customer/profile` | **B** | `any` types; lang-aware product/device name fix; auto-save vs explicit-save |
| `/customer/settings` | **B+** | Toggles missing `role="switch"`; auto-save toggles per Apple pattern |
| `/customer/products/[id]` | **B+** | Image gallery shows only 4 thumbs; no "back to results" memory |
| `/customer/order/details` | **C+** | 3 different progress-step impls in flow; native date picker UX |
| `/customer/order/photos` | **B** | PhotoSection unused outside file; video block duplicates photo logic |
| `/customer/order/payment` | **B** | Sticky header `rgba(255,255,255,0.85)` breaks dark mode |
| `/customer/order/payment/confirmation` | **D** | **CRITICAL: hardcoded placeholder order data shown to user** |
| `/customer/orders` | **B−** | English-only product names; ProductSnapshot ignores `lang` |
| `/customer/orders/[id]` | **B** | Timeline dot color same regardless of status; emoji pin; English "Time:" |
| `/customer/orders/[id]/review` | **A−** | No hover preview on stars; otherwise clean |
| `/customer/devices` | **C+** | English-only product names; raw `status.toUpperCase()`; N+1 query |

---

## Tier 1 — Bugs (ship-blockers)

### B1. Payment confirmation shows fake data
**File:** `app/customer/order/payment/confirmation/page.tsx:50-57`
The page sets `productName: 'Water Purifier System'`, `installationDate: '2024-01-15'`, `address: '123 Main Street, City, State'`, `paymentMethod: 'Credit Card'` as literal strings. It never fetches the actual order from Firestore — it only reads `orderId`, `orderNumber`, `transactionId`, `amount`, `currency` from URL params. Customers see fake details on the most important screen in the flow.

**Fix:** Fetch the order doc by `orderId` and use its real fields (installationDate, timeSlot, installationAddress, productSnapshot, payment.method).

### B2. Receipt download is a no-op
**File:** `app/customer/order/payment/confirmation/page.tsx:63-66`
`handleDownloadReceipt` toasts "downloaded" without doing anything. Either implement (e.g., generate a PDF via `jspdf` or call a server endpoint) or remove the button.

### B3. Product names ignore user language
**Files:**
- `app/customer/orders/page.tsx:293-294, 281-282` — `order.productSnapshot?.name?.en || 'Product'`
- `app/customer/devices/page.tsx:122` — `device.productSnapshot.name?.en || d.defaultDeviceName`

The rest of the app respects `userData?.preferredLanguage`; these two pages force English. A Korean or Portuguese customer sees English names mixed into otherwise-translated UI.

**Fix:** Use `order.productSnapshot.name[lang] || order.productSnapshot.name.en` with `const lang = userData?.preferredLanguage || 'en'`.

### B4. Device status badge shows raw enum
**File:** `app/customer/devices/page.tsx:132`
`{device.status.toUpperCase()}` shows `"ACTIVE"`, `"INACTIVE"`, `"DECOMMISSIONED"` — internal codes, not translated. Add status labels to `t.customer.devices.*` translation.

### B5. Sticky header rgba breaks dark mode
**Files:**
- `app/customer/order/payment/page.tsx:372`
- `app/customer/order/payment/confirmation/page.tsx:133`

Hardcoded `background: 'rgba(255,255,255,0.85)'` renders as bright white in dark mode. Use `var(--paper)` (which auto-flips) — drop the alpha and accept solid, or define `--paper-translucent` token.

---

## Tier 2 — Cross-cutting consistency

### C1. Three different progress-step implementations
| File | Implementation |
|------|---------------|
| `order/details/page.tsx:252-273` | Inline `ProgressStep` + `ProgressBar` components |
| `order/photos/page.tsx:379` | `<OrderProgressTracker currentStep={3} />` shared component |
| `order/payment/page.tsx:340-362` | Inline `ProgressDot` + `ProgressBar` components |

**Fix:** Standardize on `OrderProgressTracker` (it already exists). Delete the inline duplicates. Saves ~50 lines and locks visual consistency.

### C2. Back-button pattern inconsistent across pages
- `register`, `profile`, `settings`, `devices` → ArrowLeft button in a `sc-row` above the H1
- `products/[id]`, `order/details`, `order/photos`, `orders`, `orders/[id]` → `sc-nav-link` inside an `sc-nav` header
- `payment`, `confirmation` → `sc-cta-ghost` in a sticky translucent header

**Fix:** Pick one. Recommended: `sc-nav-link` inside `sc-nav` header for all flow pages (ordering + product detail). Keep ArrowLeft button only on top-level entry pages reached from bottom nav (profile/settings/devices). Standardizes muscle memory.

### C3. Grid system: Tailwind vs inline-style mixed
- `register/page.tsx:205, 144` — Tailwind `grid grid-cols-1 md:grid-cols-2 gap-4`
- `profile/page.tsx:229` — Tailwind `grid grid-cols-2 gap-4`
- `order/details/page.tsx:342, 624` — Mixed Tailwind class + inline `style={{ columnGap }}`

The migrated `.sc-*` system favors CSS variables + inline-styles; Tailwind grid classes are a legacy holdover. Pick one approach.

### C4. Currency formatter dual-sourced
Some pages import `formatCurrency` from `@/lib/utils/formatters` (no locale), others use `useLocaleFormatters().formatCurrency` (locale-aware). The `useLocaleFormatters` version is correct; the raw util should be deleted or marked internal.

**Files using raw util:** `products/[id]/page.tsx:9, 164, 200, 233`, `orders/[id]/page.tsx` (via locale formatter, OK), `confirmation/page.tsx:7` (raw — but the page is broken anyway, see B1).

### C5. Avatar fallback uses `--paper` for text color
**Files:** `profile/page.tsx:136`, `orders/[id]/page.tsx:303`, `register` (inherited)
`color: 'var(--paper)'` on a `var(--brand)` background means in dark mode, both background AND text become dark. Avatars become invisible.

**Fix:** Use literal `#fff` on brand-colored circles, or define `--on-brand: #fff` token. (Light/dark flip doesn't apply: white-on-green is the same in both modes.)

### C6. Required-asterisk inline-styled 6 places
`<span style={{ color: 'var(--warn)' }}>*</span>` appears in register, order/details, photos, products. DRY: add `.sc-required` class to `globals.css`.

---

## Tier 3 — UX polish

### P1. Home page: no skeleton, just spinner
`app/customer/page.tsx:140` — a single centered spinner during product load. With 4G/slow networks, customers see blank → spinner → grid pop-in. Skeleton cards (4–6 placeholder boxes shaped like product cards) feel ~30% faster perceived.

### P2. Empty states styled inconsistently
- `customer/page.tsx:147` — uses `sc-empty` class + eyebrow + helper
- `orders/page.tsx:209` — uses `sc-empty` class + icon + h2 + lede + CTA button
- `devices/page.tsx:106` — uses `sc-empty` + icon + h2 + lede (no CTA)

**Fix:** Standardize as: icon + h2 + lede + optional CTA. Devices empty state should suggest "Place an order to get started" with link to `/customer`.

### P3. Status timeline: dots all same color
**File:** `orders/[id]/page.tsx:462-464`
`background: index === order.statusHistory.length - 1 ? 'var(--brand)' : 'var(--brand)'` — ternary returns the same color in both branches. Useless ternary; meanwhile cancelled/refunded states get no distinct visual.

**Fix:** Map status → color (cancelled=warn, completed=brand, in_progress=brand at 60% opacity, pending=soft). Makes the timeline scannable.

### P4. "Rate experience" button uses warning color
**File:** `orders/[id]/page.tsx:538`
The post-completion review CTA has `background: 'var(--warn)'`. Reviewing is a positive action; using the warning token (orange/amber) sends mixed signals. Use `var(--brand)` (green) — it's still distinct from the surrounding `sc-cta-ghost` cancel button.

### P5. Hardcoded English "Time:" in orders/[id]
**File:** `orders/[id]/page.tsx:273`
`"Time: {order.timeSlot}"` — "Time:" is not translated. Use `{t.orders.time}: {order.timeSlot}`.

### P6. Emoji pin instead of lucide icon
**File:** `orders/[id]/page.tsx:285`, `devices/page.tsx` may have similar
Uses 📍 emoji for landmark. Inconsistent with the rest of the design which uses `lucide-react`. Use `<MapPin />` icon. (Emoji rendering also varies wildly across OSes.)

### P7. Star rating: no hover preview
**File:** `orders/[id]/review/page.tsx:323-358`
On click → pop animation (nice). On hover → no feedback. Most rating UIs preview the score on hover (stars fill up to the hovered position, like Amazon/Google). Adds confidence before clicking.

### P8. Toggle switches missing `role="switch"`
**File:** `settings/page.tsx:81-112`
Custom toggle uses visually-hidden checkbox. Screen readers announce "checkbox, checked" instead of "switch, on". Add `role="switch"` and `aria-checked={checked}` to the outer label, hide the checkbox properly with `position: absolute; opacity: 0; pointer-events: none` (already done).

### P9. Settings: explicit save for toggles
The settings page mixes language selector (needs save) with toggle switches (notifications). Apple/iOS pattern: toggles auto-save on change; only multi-step forms need explicit save. Currently the Save button is the only commit path — so a customer who toggles notifications and navigates away loses the change.

**Fix:** Toggles call `updateDoc` on change directly. Reserve Save button for language. OR — make the existing Save button float into view when settings are dirty (sticky bar pattern).

### P10. Native date picker
**File:** `order/details/page.tsx:609`
`<input type="date">` looks different per browser, no weekend/holiday awareness, no min-date visual indication beyond browser default. Acceptable for v1 but worth a styled picker (e.g., `react-day-picker`) later.

### P11. Product gallery limited to 4 thumbs
**File:** `products/[id]/page.tsx:125`
`.slice(0, 4)` hides any 5th+ image. Add a "+N more" overlay on the 4th thumb or enable horizontal scroll.

### P12. Customer/page (home): aside layout on mobile
**File:** `customer/page.tsx:202-204`
`<aside>{<CustomerHistory />}</aside>` inside `.sc-grid`. The grid is likely 2-col on desktop and stacks on mobile. Need to verify the CustomerHistory panel doesn't crowd the products grid on tablet (768–1024px) — may need to hide on tablet or push below products.

### P13. Devices: N+1 Firestore reads
**File:** `devices/page.tsx:53-61`
For each device, fetches schedules + visits in parallel — but devices themselves are fetched serially relative to the inner queries. A customer with 5 devices = 1 device query + 10 schedule/visit queries. For now (small data) it's fine; mark for future pagination or batch with `where('deviceId', 'in', deviceIds)`.

---

## Tier 4 — Code quality (no user-facing impact)

### Q1. `any` types
- `profile/page.tsx:22` — `customerData: any` (use `CustomerProfile` from types)
- `orders/page.tsx:113-130` — verbose Timestamp-vs-Date sort helper; extract to util

### Q2. PhotoSection extracted but not shared
**File:** `order/photos/page.tsx:45-156`
Well-factored 112-line component, only used in this one file. The waterRunning block (lines 461-541) reimplements the same layout for video. Generalize PhotoSection to accept `mediaType: 'image' | 'video'` and a custom preview renderer; reuse for the video block. Then move to `components/customer/PhotoSection.tsx`.

### Q3. Unused state hooks
- `order/photos/page.tsx:176-177` — `uploadingPhoto`, `uploadProgress` declared and unused (orphans from a prior streaming-upload design).

### Q4. Silently swallowed errors
Multiple `catch {}` blocks swallow errors without logging or surfacing. At minimum log to Sentry/console in dev. Examples: `customer/page.tsx:45`, `profile/page.tsx:49`, `order/details/page.tsx:100-103, 124`.

### Q5. Hardcoded fallback string "Product"
`orders/page.tsx:282, 294` — `'Product'` fallback. Translate to `t.orders.productFallback` or similar.

---

## Suggested fix order (ship-ready commits)

**Commit 1 — Tier 1 bugs (highest user impact)**
- Fix B1 (confirmation real data) + B2 (download or remove)
- Fix B3 (lang-aware product names in orders + devices)
- Fix B4 (device status translation)
- Fix B5 (sticky header dark-mode fix)

**Commit 2 — Tier 2 consistency**
- C1 (consolidate progress trackers — delete two inline impls)
- C5 (avatar text color → `#fff`)
- C6 (`.sc-required` class)

**Commit 3 — Tier 3 polish (high-impact)**
- P3 (timeline colors)
- P4 (review CTA color)
- P5 (translate "Time:")
- P6 (emoji pin → MapPin)
- P7 (star hover preview)
- P8 (`role="switch"`)

**Commit 4 — Tier 3 polish (deeper changes, opt-in)**
- P1 (home skeleton loader)
- P2 (standardized empty state)
- P9 (auto-save toggles)
- P11 (gallery overflow)

**Commit 5 — Tier 2/4 cleanup**
- C2 (back-button pattern standardization — biggest visual change)
- C3 (Tailwind → inline-style migration on remaining files)
- C4 (delete raw formatCurrency util usages)
- Q1-Q5 (types, dedup, dead state)

---

## What's NOT broken (don't touch)

- All pages migrate cleanly to light/dark via `data-theme`
- Translation infrastructure (`useTranslation` hook) is well-used everywhere except the 5 hardcoded strings flagged above
- The order-flow address override pattern (`order/details/page.tsx:150-190`) is well-thought-out — preserves saved address while allowing one-off
- The fallback offline-order localStorage pattern (`payment/page.tsx:280-298`) is solid disaster-recovery code; the toast tells users their order saved locally
- `OrderProgressTracker` shared component already exists at `components/customer/OrderProgressTracker.tsx` — that's the canonical impl to converge on
- Mobile bottom nav (BottomNav + CustomerLayoutClient) is correct and recently fixed
- `review/page.tsx` is the cleanest file in the bunch — read-only locked / thank-you / form state machine is well-modeled
