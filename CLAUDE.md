# SelvacoreApp — Project Context

**Owner:** CEO / Product Lead (non-engineer)
**Stack:** Next.js · TypeScript · Firebase · Tailwind CSS
**Design:** Apple-inspired — clean, bright, minimal, intuitive
**AI Tools:** Claude Code (daily driver), Cursor, Antigravity

---

## What SelvacoreApp Is

SelvacoreApp is a **water filtration system installation management platform**. It connects customers who purchase water purification products with certified technicians who install them, all managed through an admin dashboard.

### Three User Roles

| Role         | What They Do                                                                 |
|--------------|------------------------------------------------------------------------------|
| **Customer** | Browse products, place orders, upload site photos, pay, track installation   |
| **Technician** | View available jobs, accept/decline, start installation, upload completion photos |
| **Admin**    | Manage products/services/orders, approve technicians, view analytics, manage sub-contractors |

### Core User Flows

**Customer flow:**
`Browse Products -> Select Variation -> Enter Address -> Upload Site Photos -> Pay -> Track Order -> Rate Technician`

**Technician flow:**
`Apply -> Get Approved -> View Available Jobs -> Accept Job -> Start Installation -> Upload Photos -> Complete`

**Admin flow:**
`Dashboard (stats) -> Manage Products/Services -> Review Orders -> Approve Technicians -> View Transactions/Analytics`

### Firestore Collections

| Collection        | Purpose                                  |
|-------------------|------------------------------------------|
| `users`           | All users (role field distinguishes type) |
| `products`        | Water filtration products with variations |
| `services`        | Installation service packages             |
| `orders`          | Customer orders with full lifecycle       |
| `transactions`    | Audit log of all system events            |
| `subContractors`  | Contractor companies technicians belong to |
| `customerHistory` | Customer activity history                 |
| `devices`         | Registered Ezer units with QR codes       |
| `maintenanceSchedules` | Maintenance/filter replacement schedules (includes escalationLevel, lastReminderSentAt) |
| `maintenanceVisits` | Technician maintenance visit records (checks, notes per device) |
| `inventory`       | Internal parts/supplies stock management (admin only) |
| `stockAdjustments` | Audit trail of inventory stock changes    |
| `notifications`   | In-app notifications per user             |
| `mail`            | Email queue for Firebase Trigger Email extension |

### Key Services (`lib/services/`)

| File                      | Responsibility                              |
|---------------------------|---------------------------------------------|
| `orderService.ts`         | Order CRUD, status transitions, pagination  |
| `productService.ts`       | Product CRUD, image upload, pagination      |
| `technicianService.ts`    | Job acceptance (transactional), completion, stats |
| `transactionService.ts`   | Audit trail logging for all events          |
| `adminStatsService.ts`    | Dashboard analytics from Firestore          |
| `serviceService.ts`       | Installation service CRUD                   |
| `subContractorService.ts` | Sub-contractor management                   |
| `subAdminService.ts`      | Scoped queries for sub-admin portal         |
| `deviceService.ts`        | Device registration via QR, lookup, customer device queries |
| `maintenanceService.ts`   | Maintenance schedules, completion tracking, maintenance visits, email on completion |
| `inventoryService.ts`     | Inventory CRUD, stock adjustments with audit trail, stats |
| `amazonPaymentService.ts` | Simulated Amazon Pay (sandbox mode)         |

### Cloud Functions (`functions/src/`)

| File                                    | Responsibility                                             |
|-----------------------------------------|------------------------------------------------------------|
| `orders/orderTriggers.ts`               | Order lifecycle validation (onCreate, onUpdate)            |
| `technicians/technicianTriggers.ts`     | Technician status change handling                          |
| `maintenance/maintenanceReminders.ts`   | Daily scheduled escalation check (09:00 UTC) with 5-level escalation |
| `maintenance/emailTemplates.ts`         | Email templates for reminder, overdue, critical, completion |
| `maintenance/autoAssign.ts`             | Auto-assigns technician to 14+ day overdue maintenance     |
| `notifications/createNotification.ts`   | Shared helper for in-app notification creation             |

### Multi-Language Support

UI supports 4 languages via `lib/translations/`: English, Spanish, Brazilian Portuguese, Korean. Products and services use `MultiLanguageText` type for translated names/descriptions.

### Authentication

Google Sign-In only (Firebase Auth). New users go through a role selection flow (`/select-role`). Auth state managed via `contexts/AuthContext.tsx`. Route protection via `components/common/ProtectedRoute.tsx`.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)             │
│   /app/admin        — Admin dashboard, inventory, schedule, settings │
│   /app/customer     — Customer ordering + device portal│
│   /app/technician   — Technician jobs, profile, QR scan │
│   /app/sub-admin    — Sub-contractor dashboard + settings │
│   /app/login        — Auth + language selection   │
│   /app/select-role  — New user role selection     │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│              Service Layer (lib/services/)        │
│                                                  │
│   ┌──────────┐  ┌───────────┐  ┌─────────────┐  │
│   │ Order    │  │ Product   │  │ Technician  │  │
│   │ Service  │  │ Service   │  │ Service     │  │
│   └────┬─────┘  └─────┬─────┘  └──────┬──────┘  │
│        │              │               │          │
│        ▼              ▼               ▼          │
│   ┌──────────────────────────────────────────┐   │
│   │     Transaction Service (Audit Log)      │   │
│   └──────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│              Firebase Backend                    │
│   Firestore  — Orders, products, users, inventory, logs │
│   Auth       — Google Sign-In authentication    │
│   Storage    — Product images, site photos, logos │
│   Functions  — Escalation, email, auto-assign   │
│   Extensions — Trigger Email (SMTP via mail col) │
└─────────────────────────────────────────────────┘
```

---

## Key Commands

```bash
npm run dev                          # Start local dev server
npm run build                        # Build for production
npm run lint                         # Run linter
firebase deploy                      # Deploy everything
firebase deploy --only functions     # Deploy Cloud Functions only
firebase deploy --only hosting       # Deploy frontend only
firebase deploy --only firestore:rules  # Deploy Firestore rules only
firebase emulators:start             # Local Firebase testing
cd functions && npm run build        # Build Cloud Functions only
```

---

## Style Guide

| Property       | Value                                                |
|----------------|------------------------------------------------------|
| UI Framework   | Tailwind CSS with Apple design tokens                |
| Background     | `#FFFFFF` / `#F5F5F7`                                |
| Text           | `#1D1D1F`                                            |
| Accent         | `#0071E3`                                            |
| Success        | `#34C759`                                            |
| Warning        | `#FF9500`                                            |
| Danger         | `#FF3B30`                                            |
| Border Radius  | Cards `12px`, Buttons `8px`, Inputs `6px`            |
| Shadows        | `0 2px 8px rgba(0,0,0,0.08)` for cards              |
| Font           | System font stack (SF Pro Display)                   |
| Components     | Functional only, under 100 lines each               |
| File naming    | `kebab-case` for files, `PascalCase` for components  |

---

## Important Context

- Firebase is initialized in `lib/firebase/config.ts` (singleton pattern) — never duplicate this
- Environment variables live in `.env.local` — never commit secrets
- TypeScript types are centralized in `types/index.ts` (re-exports from `types/user.ts`, `types/product.ts`, `types/order.ts`, `types/transaction.ts`, `types/device.ts`, `types/inventory.ts`)
- All Firebase calls must use `try/catch` with `error: unknown` and `instanceof Error` checks
- Firestore security rules are in `firestore.rules` — orders/users are restricted to own-data reads, devices/maintenance scoped to technicians and admins
- `contexts/AuthContext.tsx` is the single source of auth state — sets `__session` cookie for SSR middleware
- `middleware.ts` provides server-side auth gating for protected routes
- Payment uses **simulated Amazon Pay** (`amazonPaymentService.ts`) — sandbox mode, no real charges
- Cloud Functions in `functions/` handle order triggers, technician triggers, and daily maintenance escalation
- Maintenance Automation: 5-level escalation (reminder -> due -> overdue -> critical -> auto-assign), daily Cloud Function at 09:00 UTC, email notifications via Firebase Trigger Email extension (`mail` collection), auto-assigns technician at 14+ days overdue
- Products can define `maintenanceTemplate` with default Ezer interval and filter schedules; auto-populates when creating devices
- Customer Device Portal at `/customer/devices` shows registered devices with maintenance status (overdue/due-soon/ok)
- Sub-Admin Portal at `/sub-admin` provides scoped views filtered by `subContractorId`, includes settings with logo upload
- Dispatcher Schedule at `/admin/schedule` is a weekly calendar view for assigning technicians to orders via drag-and-drop (@dnd-kit/core). Uses `scheduledAt` field (coexists with customer-chosen `installationDate`). Supports keyboard navigation (J/K/arrows), print view, workload indicators, and optimistic UI with Firestore transaction rollback
- Inventory Management at `/admin/inventory` manages internal parts/supplies stock with Items and Transactions tabs, stock adjustments, and audit trail
- Device/Maintenance Tracking at `/admin/maintenance` tracks registered Ezer devices and filter schedules with urgency sorting
- Technicians register devices via QR scan after job completion (`html5-qrcode` library); common QR triggers maintenance visit form
- Logo Upload: Admin, sub-contractor, and technician can upload logos via settings/profile; logos display on dashboards. Stored in Firebase Storage at `logos/{userId}/`
- Reusable `components/common/LogoUpload.tsx` handles image upload to Firebase Storage with preview
- PWA enabled via `@serwist/next` — service worker in `app/sw.ts`, manifest in `app/manifest.ts`. Disabled in development (`disable: process.env.NODE_ENV === 'development'`). Generated `public/sw.js` is gitignored
- Offline write queue in `lib/offline/writeQueue.ts` — queues `accept_job`, `start_job`, `complete_job` to IndexedDB when offline; auto-drains on reconnect via `useWriteQueueSync` hook in technician layout
- `withOfflineFallback()` wrapper tries online first, queues on network error only — non-network errors (permission, validation) are re-thrown. Device registration is online-only (requires Firestore reads)
- IndexedDB stores (`lib/offline/deviceCache.ts`): `devices`, `visits`, `writeQueue`, `photoQueue` — DB_VERSION=2
- `NetworkStatusBar` component shows offline banner in technician portal; `useNetworkStatus` hook tracks connectivity

---

## MCP Connections

When using Claude Code, connect these MCP servers for the full agentic workflow:

| MCP Server              | Purpose                                    | Priority |
|-------------------------|--------------------------------------------|----------|
| GitHub                  | PR creation, issue tracking, code review   | High     |
| Notion                  | Product roadmap, feature specs             | Medium   |
| Slack                   | Team notifications on deploys/errors       | Medium   |
| Firebase (if available) | Direct database operations                 | High     |

---

## Skills Available

- **general-coding-agent** — Foundation rules for all coding tasks
- **maintenance-automation** — 5-phase escalation, email notifications, auto-assignment
- **mcp-workflow** — Patterns for connecting and using MCP servers
- **firebase-deploy** — Deployment checklist and workflow

---

## Agentic OS Philosophy

This project follows the Agentic OS pattern:

- `CLAUDE.md` (this file) = the operating system — always-on project context
- `Skills` = the apps — reusable instruction packages for specific tasks
- `MCP connections` = the peripherals — real-time links to external tools
- `Checkpoints` = the save points — Claude Code creates checkpoints before major changes

### Workflow Pattern

```
Ask Claude Code -> It reads CLAUDE.md -> Loads relevant Skill ->
Connects via MCP if needed -> Executes -> Reports back
```

---

## What NOT to Do

- Never store raw user content permanently (privacy compliance)
- Never deploy without running `npm run build` first
- Never put Firebase admin SDK in client-side code
- Never skip the plan-before-code step for features over 10 lines
