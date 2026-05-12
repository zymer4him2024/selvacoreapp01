# SelvacoreApp — End-to-End Flow

From a customer placing an order through the technician completing a recurring maintenance visit. Traced against the actual service layer.

---

## 1. Customer places order

```
┌─ /customer/products ─────────────────────────────────────┐
│  Browse products (productService)                         │
│  Select variation + installation service                  │
└────────────────────┬─────────────────────────────────────┘
                     ▼
┌─ /customer/checkout ─────────────────────────────────────┐
│  Enter address → Upload site photos → Pay (sandbox        │
│  amazonPaymentService) → orderService.createOrder         │
│  Firestore: orders/{id}.status = 'pending'                │
│  Cloud Function: orders/orderTriggers.onCreate logs to    │
│  transactions, notifies relevant admins                   │
└──────────────────────────────────────────────────────────┘
```

## 2. Technician accepts the job

```
┌─ /technician/jobs ───────────────────────────────────────┐
│  getAvailableJobs() lists pending orders                  │
│  acceptJob() runs Firestore transaction:                  │
│    - Verifies no other tech grabbed it                    │
│    - status: pending → accepted                           │
│    - assigns technicianId, technicianName                 │
│  (or, dispatcher assigns via /admin/schedule drag-drop,   │
│   setting scheduledAt)                                    │
└────────────────────┬─────────────────────────────────────┘
                     ▼
┌─ Day of install ─────────────────────────────────────────┐
│  startJob()  → status: accepted → in_progress             │
│  uploadInstallationPhoto() → Firebase Storage             │
│  completeJob() → status: in_progress → completed          │
│    - Stamps completedAt                                   │
│    - Increments technician stats                          │
└──────────────────────────────────────────────────────────┘
```

## 3. Device registration (the bridge to maintenance)

```
┌─ Technician scans printed QR via html5-qrcode ───────────┐
│  deviceService.registerDevice(qrCode, orderId, ...)       │
│  Creates devices/{id} with:                               │
│    - productSnapshot, customerInfo, address               │
│    - Reads product.maintenanceTemplate → seeds            │
│      maintenanceSchedules (ezerInterval + filters)        │
│    - nextEzerMaintenanceDue = now + interval              │
└──────────────────────────────────────────────────────────┘
```

## 4. Customer rates the install

```
┌─ /customer/orders/{id} ──────────────────────────────────┐
│  reviewService.createReview() writes reviews/{orderId}    │
│  with denormalized customerName + technicianName          │
│  Cloud Function reviews/reviewTriggers aggregates         │
│  averageRating onto users/{technicianId}                  │
└──────────────────────────────────────────────────────────┘
```

## 5. Maintenance lifecycle (automated)

```
                       Daily 09:00 UTC
                              │
                              ▼
┌─ functions/maintenance/maintenanceReminders.ts ──────────┐
│  Scans maintenanceSchedules, sets escalationLevel:        │
│    L1 reminder (7d before)                                │
│    L2 due (day-of)                                        │
│    L3 overdue (7d past)                                   │
│    L4 critical (14d past)                                 │
│    L5 autoAssign → creates technician job                 │
│  Each level queues email via mail collection              │
│  (Firebase Trigger Email extension)                       │
└──────────────────────────────────────────────────────────┘
```

## 6. Technician completes the maintenance visit

```
┌─ Technician scans device QR (common QR triggers form) ───┐
│  maintenanceService.createMaintenanceVisit(...)           │
│    - checks: installationOk, waterPressureOk,             │
│      sedimentFilterReplaced, etc.                         │
│    - photoBefore / photoAfter to Storage                  │
│  completeVisitAndResetSchedules():                        │
│    - Marks affected schedules complete                    │
│    - Recomputes nextDueDate from interval                 │
│    - Resets escalationLevel = 0                           │
│  Completion email queued to customer                      │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
        Cycle restarts → next reminder scheduled
```

---

## Key invariants

- **One review per order**: `reviews/{orderId}` — doc ID equals order ID, enforcing uniqueness structurally.
- **Offline writes**: `accept_job`, `start_job`, `complete_job` queue to IndexedDB via `withOfflineFallback()` if the tech is offline; device registration is online-only (needs reads).
- **Audit trail**: every status transition writes to `transactions` via `transactionService` — source of truth for "what happened when."
- **Status field is the FSM**: `pending → accepted → in_progress → completed` (or `cancelled` / `refunded` at any step). Order trigger validates transitions server-side.

---

## Collection map

| Collection | Created at step | Updated at step |
|---|---|---|
| `orders` | 1 (customer checkout) | 2 (accept/start/complete), 5 (auto-assign) |
| `transactions` | every state transition | append-only |
| `reviews/{orderId}` | 4 (customer rates) | review edit/flag/hide |
| `devices` | 3 (QR scan post-install) | maintenance visits, status changes |
| `maintenanceSchedules` | 3 (seeded from product template) | 5 (escalation), 6 (visit completion) |
| `maintenanceVisits` | 6 (each visit) | notes edits |
| `mail` | 5 + 6 (queued reminders/completion) | Trigger Email extension drains |
