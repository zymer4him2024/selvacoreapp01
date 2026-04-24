# Reviews

Customer ratings and comments tied to completed orders. One review per order.

## Design: `orderId` as review document ID

Reviews are stored at `reviews/{orderId}` — the document ID equals the order ID. This is deliberate, not incidental.

**Why this shape:**

- **Uniqueness is a structural invariant, not a query invariant.** Firestore cannot enforce "one review per order" with a rule alone if review IDs were arbitrary — the rule would have to run a query (disallowed) or rely on a client-maintained index. Using `orderId` as the document ID makes "one review per order" impossible to violate: a second create at the same path is a no-op `create` (fails) or an `update` (subject to the ownership rule).
- **The rule can cross-reference the order cheaply.** On create, the rule does `get(/databases/.../orders/$(request.resource.data.orderId)).data.status == 'completed'` and additionally asserts `request.resource.data.orderId == request.resource.id`. That single `get` is the only cross-doc read the rule performs.
- **Lookups by order are O(1).** The order detail page reads `reviews/{orderId}` directly — no query, no index.

**Consequence:** the client MUST pass the `orderId` as the doc ID when calling `setDoc`. `addDoc` (auto-ID) is forbidden and will be denied by the rule (`request.resource.data.orderId == request.resource.id` fails).

## Migration note: order status reversion

**Reviews remain attached to orders even if the order status reverts.** If an admin reverts a `completed` order back to `in_progress` (to fix a mistake, address a dispute, etc.), any existing review stays in Firestore and remains editable by the customer for the remainder of the 14-day `editableUntil` window.

The rule on update does not re-check order status — it only verifies ownership and the edit window:

```
allow update: if isAuthenticated() &&
  resource.data.customerId == request.auth.uid &&
  request.resource.data.customerId == resource.data.customerId &&
  request.resource.data.orderId == resource.data.orderId &&
  request.resource.data.technicianId == resource.data.technicianId &&
  request.time < resource.data.editableUntil;
```

This is intentional for v1 — order reversion is admin-only and rare, and re-checking status on every edit adds a cross-doc read to the hot path. If a reverted order has a stale review, the admin should use the review moderation tools (`hideReview`) to hide it manually. A future version can add a Cloud Function trigger on `orders/{id}` `status` changes that soft-deletes or flags the attached review.

## Running the rule tests

The review security rules have a dedicated emulator-backed test suite separate from the service-level unit tests.

**Prerequisites:** the Firebase CLI is installed (`firebase --version` should work). Java is required for the Firestore emulator.

```bash
npm run test:rules
```

This command boots the Firestore + Auth emulators, runs `tests/rules/reviews.rules.test.ts` against them, and shuts the emulators down on exit. No manual emulator startup needed.

Scope of the rule tests:

1. **Scenario 3 — ownership guard.** A review exists at `reviews/X` owned by user A. User B authenticates and attempts `setDoc(reviews/X, { customerId: B, ... })`. The rule must deny. This proves that making `orderId` the doc ID does not open a hijack vector, because the update rule pins ownership.
2. **Expired edit window at the rule level.** A review with `editableUntil` in the past cannot be updated by its owner, regardless of what the service layer does.
3. **Pending-order reject at the rule level.** A customer cannot create `reviews/{orderId}` while `orders/{orderId}.status == 'pending'`.

The default `npm test` suite excludes `tests/rules/**` (see `vitest.config.ts`). Service-level unit tests mock `firebase/firestore` and do not exercise the rules — they live in `lib/services/__tests__/reviewService.test.ts` and cover the service-layer happy/error paths.

## Why two test suites

| Suite | Location | What it proves |
|---|---|---|
| `npm test` | `lib/services/__tests__/reviewService.test.ts` | The service functions raise the right errors for invalid input, missing orders, non-owners, expired windows. Fast (~300ms), no external dependencies. |
| `npm run test:rules` | `tests/rules/reviews.rules.test.ts` | The Firestore rules themselves deny hostile writes, even if the service layer is bypassed (e.g., a compromised client calling the Firebase SDK directly). Slower (~5-10s with emulator boot). |

Rule tests are the safety net. A bug in the service layer is a client bug; a bug in the rules is a data integrity bug.

## Denormalized names on review documents (Phase 4.5)

As of Phase 4.5, `reviewService.createReview` writes `customerName` and `technicianName` onto each review document at creation time. The admin reviews page and the technician-detail Reviews tab render these fields directly — no per-row user lookup on the hot path.

**Fields on the review document:**

- `customerName?: string` — display name of the reviewing customer, captured at write.
- `technicianName?: string` — display name of the assigned technician, captured at write.

Both fields are optional and may be empty strings if the corresponding user doc was missing or had no `displayName` at write time.

**Fallback for pre-existing reviews (graceful).** Reviews written before Phase 4.5 do not have these fields. The admin list service (`reviewAdminService.getReviewsPaginated`) detects rows with missing names per page and issues a single batched `getDoc` per unique missing user ID, hydrating the in-memory objects before returning. The UI therefore always sees populated names. The review documents themselves are **not** rewritten — this is a v1 read-through fallback, not a backfill. The collection will heal naturally as new reviews land; anything old that the admin never looks at stays as-is.

**Follow-up (deferred):** a one-time backfill Cloud Function that populates `customerName` / `technicianName` on all pre-Phase-4.5 reviews. Deferred from Phase 4.5; to be scheduled separately.

## Admin review oversight (Phase 4.5)

The admin portal at `/admin/reviews` provides a paginated, filterable moderation surface.

**Filter policy (server-side only — no client-side filtering):**

- **Tab (mutually exclusive, always applied):** Active (`hidden == false`), Flagged (`flagged == true && hidden == false`), Hidden (`hidden == true`).
- **Active tab only:** optional `technicianId` and/or `ratingBucket` filters combine with the tab.
- **Flagged / Hidden tabs:** optional `technicianId` only. The rating chip is **hidden from the UI** on these tabs — the last selection is preserved and restored when the admin returns to Active.

Stats tiles are calendar-month scoped (UTC boundaries) for `reviewsThisMonth` and `flaggedPercentThisMonth`. `platformAvgRating` is computed across all non-hidden reviews. `techniciansBelow3.5` reads the denormalized `averageRating` on the technician user doc (maintained by `reviewTriggers.onReviewCreated` / `onReviewUpdated`). Technicians with zero reviews are excluded — see the tooltip on the tile.

## Deployment

This phase adds 5 new composite indexes on the `reviews` collection. Deploy `firestore:indexes` first, wait for all indexes to show "Enabled" in the Firebase console, then deploy hosting. Otherwise admins will see `FAILED_PRECONDITION` errors until the indexes finish building.

```bash
firebase deploy --only firestore:indexes
# wait for all indexes to report "Enabled" in the Firebase console
firebase deploy --only hosting
```

Index set (names collapsed for brevity; see `firestore.indexes.json`):

1. `(hidden ASC, createdAt DESC)` — Active/Hidden tab base
2. `(flagged ASC, hidden ASC, createdAt DESC)` — Flagged tab base
3. `(hidden ASC, rating ASC, createdAt DESC)` — Active + rating
4. `(technicianId ASC, flagged ASC, hidden ASC, createdAt DESC)` — Flagged + technician
5. `(technicianId ASC, hidden ASC, rating ASC, createdAt DESC)` — Active + technician + rating
6. (existing) `(technicianId ASC, hidden ASC, createdAt DESC)` — Active/Hidden + technician

