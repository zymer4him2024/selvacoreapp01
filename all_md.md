# All MD Files — Consolidated Reference

> Last updated: 2026-04-21
>
> This file contains the full content of every markdown file in the project (excluding node_modules).


---

## File: `./CLAUDE.md`

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
│   /app/admin        — Admin dashboard, inventory, settings │
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
- Inventory Management at `/admin/inventory` manages internal parts/supplies stock with Items and Transactions tabs, stock adjustments, and audit trail
- Device/Maintenance Tracking at `/admin/maintenance` tracks registered Ezer devices and filter schedules with urgency sorting
- Technicians register devices via QR scan after job completion (`html5-qrcode` library); common QR triggers maintenance visit form
- Logo Upload: Admin, sub-contractor, and technician can upload logos via settings/profile; logos display on dashboards. Stored in Firebase Storage at `logos/{userId}/`
- Reusable `components/common/LogoUpload.tsx` handles image upload to Firebase Storage with preview

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


---

## File: `./Marketing/blog-post.md`

# Why Water Filtration Companies Are Still Stuck in the Spreadsheet Era (And How to Break Free)

**Meta Description:** Water filtration companies lose revenue to scheduling chaos and manual processes. Learn how purpose-built installation management platforms are changing the industry.

**Keywords:** water filtration installation management, field service software water treatment, technician scheduling platform, water purification business software

**Estimated Read Time:** 6 min read

---

## The Hidden Cost of Manual Installation Management

If you run a water filtration company, you already know the drill. A customer calls in. Someone checks the spreadsheet - or worse, a whiteboard - to find an available technician. A few phone calls later, an installation gets scheduled. Maybe.

What you might not realize is how much this process costs you.

Industry data suggests that field service companies using manual scheduling lose 15-20% of potential revenue to inefficiencies: double-bookings, missed appointments, untracked follow-ups, and forgotten maintenance schedules.

For a water treatment company doing 200 installations per month, that's 30-40 lost opportunities every month. At an average installation value of $500, you're looking at $15,000-$20,000 in annual lost revenue from scheduling alone.

And that's before we count the cost of customer churn from poor communication.

## Why Generic Field Service Software Falls Short

You might think, "I'll just get ServiceTitan or Jobber." And those are great tools - for HVAC and plumbing.

But water filtration has unique requirements that generic platforms don't address:

**Device Registration and Tracking.** When a technician installs an Ezer water purification unit, that device needs to be registered to the customer's account. Generic software has no concept of device identity tied to installation records.

**Filter Lifecycle Management.** Every water filtration system has filters with specific replacement schedules. Miss a replacement, and you lose the maintenance contract. Generic tools don't track consumable lifecycles.

**Site Assessment Workflows.** Water filtration installations often require site photos and pre-installation assessments. Most field service tools treat every job the same - show up and fix it.

**Technician Certification.** Water treatment installers need specific certifications. Your scheduling system should know who's certified for what, not just who's available.

## What a Purpose-Built Solution Looks Like

Imagine this workflow instead:

A customer visits your website, selects a water filtration system, and places an order. They upload photos of their installation site during checkout. The system automatically identifies certified technicians in the area and assigns the job.

The technician receives a notification with everything they need: customer address, site photos, product specifications, and installation instructions. No phone calls. No misunderstandings.

During the installation, the customer tracks progress in real-time. When the technician finishes, they scan a QR code on the device to register it. A maintenance schedule automatically generates based on the specific filter specifications.

Three months later, the system notifies both you and the customer that a filter replacement is due. The maintenance visit gets scheduled with the same streamlined process.

This isn't theoretical. This is exactly what platforms like Selvavore are built to do.

## The Four Pillars of Modern Installation Management

If you're evaluating whether to digitize your operations, look for these four capabilities:

### 1. End-to-End Order Lifecycle
From customer order to technician assignment to installation completion to ongoing maintenance - every step should be tracked in one system. No handoffs between tools. No data falling through cracks.

### 2. Real-Time Visibility
Your customers expect it. Your operations team needs it. Everyone should be able to see the current status of any installation without picking up the phone.

### 3. Device Intelligence
Every installed unit should have a digital identity. You should know which customer has which device, when it was installed, and when it needs service. This data becomes your most valuable business asset over time.

But digital identity is just the starting point. The real value comes when the system acts on that data automatically. A platform like Selvavore escalates maintenance through five levels - from a gentle reminder 7 days before service is due, all the way to automatically dispatching a technician if maintenance goes 14 days overdue. Your customers get email notifications at each stage. Your admins get critical alerts. And if nobody acts, the system assigns the job itself, picking the technician with the lightest workload.

This is what separates a tracking tool from an intelligence platform. You're not just recording data - you're preventing missed maintenance from ever happening.

### 4. Actionable Analytics
How many installations did each technician complete this month? What's your average time from order to completion? Which service packages generate the most revenue? If you can't answer these questions in 30 seconds, you're flying blind.

## Making the Transition

The biggest objection we hear is: "My team won't use new software."

Start small. Pick your next 10 installations and run them through a digital platform alongside your existing process. Let your team see the difference. When a customer texts asking about their installation status and you can answer in 5 seconds instead of 5 minutes, adoption happens naturally.

The water treatment industry is at an inflection point. Companies that digitize their installation operations now will have a significant competitive advantage as customer expectations continue to rise.

The spreadsheet served you well. But it's time for something better.

---

*Selvavore is a purpose-built installation management platform for water filtration companies. From customer orders to technician dispatch to device maintenance - one platform for your entire operation.*

*[Learn more about Selvavore]*


---

## File: `./Marketing/content-calendar.md`

# 30-Day Calendar for Selvavore

**Product:** Selvavore
**Period:** 2026-04-12 to 2026-05-11
**Total Content Slots:** 44

---

## Week 1: Awareness
*Focus: Problem-focused content that highlights pain points*

| Day | Date | Platform | Type | Title | Time |
|-----|------|----------|------|-------|------|
| Monday | 2026-04-13 | twitter | thread | Awareness: Twitter thread | 10:00 AM |
| Monday | 2026-04-13 | blog | article | Why Water treatment/filtration companies and HVAC contractors Are Still Stuck with Outdated Solutions | 8:00 AM |
| Tuesday | 2026-04-14 | linkedin | problem_solution | Awareness: LinkedIn problem_solution | 9:00 AM |
| Tuesday | 2026-04-14 | twitter | single_tip | Awareness: Twitter single_tip | 10:00 AM |
| Tuesday | 2026-04-14 | instagram | carousel | Awareness: Instagram carousel | 12:00 PM |
| Wednesday | 2026-04-15 | linkedin | thought_leadership | Awareness: LinkedIn thought_leadership | 9:00 AM |
| Wednesday | 2026-04-15 | twitter | single_question | Awareness: Twitter single_question | 10:00 AM |
| Thursday | 2026-04-16 | linkedin | comparison | Awareness: LinkedIn comparison | 9:00 AM |
| Thursday | 2026-04-16 | twitter | thread | Awareness: Twitter thread | 10:00 AM |
| Thursday | 2026-04-16 | instagram | reel | Awareness: Instagram reel | 12:00 PM |
| Friday | 2026-04-17 | twitter | single_stat | Awareness: Twitter single_stat | 10:00 AM |

## Week 2: Education
*Focus: How-to content, tips, guides, technical deep dives — including maintenance automation*

| Day | Date | Platform | Type | Title | Time |
|-----|------|----------|------|-------|------|
| Monday | 2026-04-20 | twitter | thread | Automated Maintenance Lifecycle (Thread 3) | 10:00 AM |
| Monday | 2026-04-20 | blog | article | How Selvavore Reduces Cost by 10x Compared to Alternatives | 8:00 AM |
| Tuesday | 2026-04-21 | linkedin | announcement | Feature Spotlight: Maintenance Automation (Post 6) | 9:00 AM |
| Tuesday | 2026-04-21 | twitter | single_tip | Education: "Did you know? Selvavore auto-dispatches a technician if maintenance goes 14 days overdue" | 10:00 AM |
| Tuesday | 2026-04-21 | instagram | carousel | "Your Devices Never Get Forgotten" (Carousel 3) | 12:00 PM |
| Wednesday | 2026-04-22 | linkedin | thought_leadership | Education: Why predictive maintenance is the future of water filtration | 9:00 AM |
| Wednesday | 2026-04-22 | twitter | single_question | Education: "How do you track filter replacement schedules today?" | 10:00 AM |
| Thursday | 2026-04-23 | linkedin | comparison | Education: Manual maintenance tracking vs. automated escalation | 9:00 AM |
| Thursday | 2026-04-23 | twitter | thread | Education: Twitter thread | 10:00 AM |
| Thursday | 2026-04-23 | instagram | reel | Education: Instagram reel | 12:00 PM |
| Friday | 2026-04-24 | twitter | single_stat | Education: "Companies using automated maintenance see 40% fewer missed service appointments" | 10:00 AM |

## Week 3: Social Proof
*Focus: Use cases, testimonials, results, comparisons*

| Day | Date | Platform | Type | Title | Time |
|-----|------|----------|------|-------|------|
| Monday | 2026-04-27 | twitter | thread | Social Proof: Twitter thread | 10:00 AM |
| Monday | 2026-04-27 | blog | article | Case Study: Deploying Selvavore in Production | 8:00 AM |
| Tuesday | 2026-04-28 | linkedin | problem_solution | Social Proof: LinkedIn problem_solution | 9:00 AM |
| Tuesday | 2026-04-28 | twitter | single_tip | Social Proof: Twitter single_tip | 10:00 AM |
| Tuesday | 2026-04-28 | instagram | carousel | Social Proof: Instagram carousel | 12:00 PM |
| Wednesday | 2026-04-29 | linkedin | thought_leadership | Social Proof: LinkedIn thought_leadership | 9:00 AM |
| Wednesday | 2026-04-29 | twitter | single_question | Social Proof: Twitter single_question | 10:00 AM |
| Thursday | 2026-04-30 | linkedin | comparison | Social Proof: LinkedIn comparison | 9:00 AM |
| Thursday | 2026-04-30 | twitter | thread | Social Proof: Twitter thread | 10:00 AM |
| Thursday | 2026-04-30 | instagram | reel | Social Proof: Instagram reel | 12:00 PM |
| Friday | 2026-05-01 | twitter | single_stat | Social Proof: Twitter single_stat | 10:00 AM |

## Week 4: Conversion
*Focus: Direct CTAs, offers, demos, pricing highlights*

| Day | Date | Platform | Type | Title | Time |
|-----|------|----------|------|-------|------|
| Monday | 2026-05-04 | twitter | thread | Conversion: Twitter thread | 10:00 AM |
| Monday | 2026-05-04 | blog | article | The Future of SaaS Platform: What You Need to Know | 8:00 AM |
| Tuesday | 2026-05-05 | linkedin | problem_solution | Conversion: LinkedIn problem_solution | 9:00 AM |
| Tuesday | 2026-05-05 | twitter | single_tip | Conversion: Twitter single_tip | 10:00 AM |
| Tuesday | 2026-05-05 | instagram | carousel | Conversion: Instagram carousel | 12:00 PM |
| Wednesday | 2026-05-06 | linkedin | thought_leadership | Conversion: LinkedIn thought_leadership | 9:00 AM |
| Wednesday | 2026-05-06 | twitter | single_question | Conversion: Twitter single_question | 10:00 AM |
| Thursday | 2026-05-07 | linkedin | comparison | Conversion: LinkedIn comparison | 9:00 AM |
| Thursday | 2026-05-07 | twitter | thread | Conversion: Twitter thread | 10:00 AM |
| Thursday | 2026-05-07 | instagram | reel | Conversion: Instagram reel | 12:00 PM |
| Friday | 2026-05-08 | twitter | single_stat | Conversion: Twitter single_stat | 10:00 AM |



---

## File: `./Marketing/instagram-content.md`

# Selvavore App - Instagram Content

---

## Carousel 1: "5 Signs You've Outgrown Spreadsheets"

**Slide 1 (Hook):**
- Headline: Still Managing Installations on Spreadsheets?
- Subtext: Here are 5 signs it's time to upgrade
- Visual: Clean blue background with spreadsheet icon crossed out

**Slide 2:**
- Headline: Sign #1
- Subtext: You double-booked a technician this month
- Visual: Calendar with overlapping appointments

**Slide 3:**
- Headline: Sign #2
- Subtext: A customer called asking "Where's my installer?"
- Visual: Phone ringing with question mark

**Slide 4:**
- Headline: Sign #3
- Subtext: You forgot a filter replacement deadline
- Visual: Clock with expired filter icon

**Slide 5:**
- Headline: Sign #4
- Subtext: Your best tech left - and took all the knowledge
- Visual: Person walking away with briefcase

**Slide 6:**
- Headline: Sign #5
- Subtext: Friday reports take hours instead of minutes
- Visual: Pile of papers vs. clean dashboard

**Slide 7 (CTA):**
- Headline: There's a Better Way
- Subtext: Selvavore - built for water filtration teams
- Visual: App dashboard screenshot

**Caption:**
Running a water filtration company on spreadsheets works... until it doesn't. These are the 5 signs we hear most from installation teams before they switch to a purpose-built platform.

If any of these hit close to home, you're not alone. Most water treatment companies deal with at least 3 of these every month.

The fix isn't hiring more people. It's having the right system.

Selvavore connects your customers, technicians, and operations in one platform. From order to installation to maintenance.

Link in bio to learn more.

#WaterFiltration #WaterTreatment #FieldService #SmallBusiness #SaaS #WaterPurification #TechForGood #OperationsManagement #BusinessGrowth #StartupLife #B2BSaaS #Productivity #DigitalTransformation #CleanWater #WaterIndustry

---

## Carousel 2: "How a Modern Installation Works"

**Slide 1 (Hook):**
- Headline: From Order to Installation in 3 Steps
- Subtext: No phone calls. No spreadsheets.
- Visual: Clean flow diagram preview

**Slide 2:**
- Headline: Step 1 - Customer Orders Online
- Subtext: Selects product, uploads site photos, pays securely
- Visual: Phone mockup showing order screen

**Slide 3:**
- Headline: Step 2 - Technician Gets Matched
- Subtext: Certified installer assigned automatically with full site details
- Visual: Notification card showing job assignment

**Slide 4:**
- Headline: Step 3 - Real-Time Tracking
- Subtext: Customer and admin see live installation status
- Visual: Dashboard showing active installation

**Slide 5:**
- Headline: Bonus - Device Gets Registered
- Subtext: QR scan links the unit to the customer forever
- Visual: QR code scan animation concept

**Slide 6 (CTA):**
- Headline: Selvavore
- Subtext: The platform water filtration companies deserve
- Visual: Logo + tagline

**Caption:**
This is what a modern water filtration installation looks like. No phone tag. No lost paperwork. No forgotten follow-ups.

Every step tracked. Every device registered. Every maintenance schedule automated.

We built Selvavore because water treatment companies deserve the same tools that every other industry already has.

#WaterFiltration #Installation #FieldServiceManagement #WaterTreatment #CleanWater #TechStartup #B2B #SaaS #Innovation #SmallBusinessOwner #Operations #WaterPurification #IoT #SmartHome #Automation

---

## Reel Script: "Day in the Life"

**Hook (0-3s):**
- Visual: Close-up of phone notification - "New installation assigned"
- Text overlay: "What if installations managed themselves?"

**Scene 1 (3-8s):**
- Visual: Customer placing order on phone, uploading site photo
- Audio: "Customer orders and uploads site details in 60 seconds"

**Scene 2 (8-13s):**
- Visual: Technician getting notified, reviewing job details on phone
- Audio: "Nearest certified tech gets matched automatically"

**Scene 3 (13-20s):**
- Visual: Technician on-site, scanning QR code on installed unit
- Audio: "Installation done. Device registered. Maintenance scheduled."

**Scene 4 (20-25s):**
- Visual: Admin dashboard showing completed jobs, revenue stats
- Audio: "And the admin sees everything in real-time"

**CTA (25-30s):**
- Visual: Selvavore logo + "Link in bio"
- Audio: "Selvavore. Built for water filtration teams."

**Duration:** 30 seconds
**Music:** Upbeat, professional, tech-forward

---

## Carousel 3: "Your Devices Never Get Forgotten"

**Slide 1 (Hook):**
- Headline: What Happens When Maintenance Is Overdue?
- Subtext: Most companies: nothing. With Selvavore: this.
- Visual: Clean timeline preview with escalation icons

**Slide 2:**
- Headline: Day -7: Reminder
- Subtext: Customer gets an email: "Your filter replacement is due next week"
- Visual: Email notification mockup with bell icon

**Slide 3:**
- Headline: Day 0: Due
- Subtext: System flags the schedule. In-app notification sent.
- Visual: Calendar with highlighted due date

**Slide 4:**
- Headline: Day +3: Overdue
- Subtext: Alert sent to customer AND admin
- Visual: Warning triangle with dual notification

**Slide 5:**
- Headline: Day +7: Critical
- Subtext: All admins notified. Escalation email sent.
- Visual: Red alert with siren icon

**Slide 6:**
- Headline: Day +14: Auto-Dispatch
- Subtext: System assigns the technician with the lightest workload
- Visual: Technician assignment card with checkmark

**Slide 7 (CTA):**
- Headline: Zero Devices Forgotten
- Subtext: Maintenance intelligence, built into Selvavore
- Visual: Logo + "Link in bio"

**Caption:**
Missed maintenance = lost contracts. Forgotten filter replacements = unhappy customers.

Most water filtration companies track maintenance in spreadsheets (or worse, someone's memory). When things slip, nobody notices until the customer complains.

Selvavore's maintenance automation escalates through 5 levels - from gentle reminder to automatic technician dispatch. Every device. Every schedule. Every time.

Your devices never get forgotten.

#WaterFiltration #MaintenanceAutomation #FieldService #WaterTreatment #IoT #SaaS #DeviceManagement #SmartMaintenance #CleanWater #B2B #TechStartup #Automation #PredictiveMaintenance #WaterPurification #Operations


---

## File: `./Marketing/linkedin-posts.md`

# Selvavore App - LinkedIn Posts

---

## Post 1: Problem-Solution

**Type:** problem_solution

Water filtration companies lose 15-20% of revenue to missed installations, scheduling conflicts, and poor technician coordination.

Sound familiar?

Here's what typically happens:
- Customer calls in for an installation
- Someone opens a spreadsheet to find an available technician
- Phone tag begins
- The technician shows up without site details
- No one tracks if the filters get replaced on time

We built Selvavore to fix this entire chain.

Customers upload site photos when they order. Technicians get matched automatically. Every installation is tracked in real-time. And when it's time for filter replacement? The system remembers, even when your team doesn't.

One platform. Order to maintenance. No spreadsheets.

If you manage water filtration installations and you're still coordinating via WhatsApp groups and Excel, there's a better way.

#WaterFiltration #FieldService #SaaS #PropTech #WaterTreatment

**Image Idea:** Split screen - left side showing chaotic spreadsheet/phone calls, right side showing clean Selvavore dashboard

---

## Post 2: Thought Leadership

**Type:** thought_leadership

The water treatment industry is a $90B market still running on paper forms and phone calls.

I've watched installation companies struggle with the same problems for years:
- No visibility into technician availability
- Customers calling for status updates
- Maintenance schedules tracked in someone's head
- Zero data on which technicians perform best

Meanwhile, every other field service industry has gone digital.

Why is water filtration behind?

Because the solutions built for HVAC or plumbing don't understand the water filtration workflow. They don't handle device registration. They don't track filter lifecycles. They don't manage the unique certification requirements.

Water treatment deserves purpose-built tools, not generic field service software with workarounds.

That's exactly why we built Selvavore - a platform designed specifically for the water filtration installation lifecycle.

What tools are you using to manage your installations today?

#WaterTreatment #DigitalTransformation #FieldServiceManagement #WaterPurification #B2B

**Image Idea:** Infographic showing the water filtration installation lifecycle with pain points highlighted

---

## Post 3: Feature Spotlight

**Type:** announcement

What if every water purification device you install could be digitally registered in 3 seconds?

We just built QR-based device registration into Selvavore.

Here's how it works:

1. Technician completes the installation
2. Scans the QR code on the Ezer unit
3. Device is instantly linked to the customer's account
4. Maintenance schedule auto-generates based on filter specs

No manual data entry. No separate tracking system. No forgotten filter replacements.

Every device gets a digital identity tied to the customer, the installation, and the maintenance timeline.

For water filtration companies managing hundreds or thousands of installed units, this changes everything.

DM me if you want to see it in action.

#IoT #WaterFiltration #FieldService #QRCode #DeviceManagement

**Image Idea:** Photo of a technician scanning a QR code on a water filtration unit with the app screen showing the registration

---

## Post 4: Comparison

**Type:** comparison

Most field service tools cost $50-150/user/month.

And they still don't handle:
- Water filtration device registration
- Filter lifecycle tracking
- Site photo assessments
- Technician certification workflows

Selvavore does all of this starting at $29/month for your entire team.

Built specifically for water treatment companies - not retrofitted from generic field service software.

Why pay more for software that doesn't understand your industry?

#FieldService #WaterTreatment #SaaS #CostSavings #SMB

**Image Idea:** Comparison table - Generic Field Service vs Selvavore with checkmarks

---

## Post 5: Tips & Guide

**Type:** tips_guide

5 signs your water filtration company has outgrown spreadsheets:

1. You've double-booked a technician more than once this month
2. A customer called to ask "when is my installation?" and no one knew
3. You have no idea which devices are due for filter replacement
4. Your best technician left and took all the installation knowledge with them
5. You spend Friday afternoons compiling reports that should take 5 minutes

If you checked 3 or more, it's time for a purpose-built platform.

Spreadsheets were never designed to manage field operations. They break at scale. They don't send notifications. They can't track real-time status.

The good news? Switching doesn't have to be painful. Start with your next 10 installations on a digital platform and see the difference.

#SmallBusiness #WaterFiltration #OperationsManagement #DigitalTransformation #Productivity

**Image Idea:** Checklist graphic with the 5 signs, branded with Selvavore colors

---

## Post 6: Feature Spotlight - Maintenance Automation

**Type:** announcement

What happens when a water filtration device goes 14 days without scheduled maintenance?

In most companies: nothing. Nobody noticed.

With Selvavore, here's what happens automatically:

Day -7: Customer gets an email reminder
Day 0: System flags it as due
Day 3: Overdue alert to customer and admin
Day 7: CRITICAL alert to all admins
Day 14: System auto-assigns the nearest available technician

No manual follow-up. No spreadsheet tracking. No missed maintenance.

Every device has a maintenance schedule. Every schedule has an escalation path. Every escalation has an action.

The result? Zero devices fall through the cracks.

We built this because we watched companies lose maintenance contracts over forgotten filter replacements. That doesn't have to happen anymore.

DM me to see the maintenance automation in action.

#MaintenanceAutomation #WaterFiltration #FieldService #IoT #PredictiveMaintenance #SaaS

**Image Idea:** Timeline graphic showing the 5 escalation levels with icons (bell, flag, warning, siren, wrench)


---

## File: `./Marketing/product-profile.md`

# Selvavore App - Product Profile

## Product Name
Selvavore (by Selvacore)

## Category
SaaS Platform - Water Filtration Installation Management

## One-Liner
The all-in-one platform connecting water filtration customers, certified technicians, and contractors for seamless installation management.

## Problem Solved
Water filtration companies struggle to coordinate installations between customers, technicians, and sub-contractors. Manual scheduling, lack of real-time tracking, and disconnected communication lead to missed appointments, poor accountability, and lost revenue.

## Target Audience
- **Primary:** Water treatment/filtration companies and HVAC contractors managing installation teams
- **Secondary:** Certified technicians and installers seeking gig work
- **Tertiary:** Residential and commercial customers needing water system installations

## Key Features
1. Customer order management with site photo uploads
2. Certified technician matching and job assignment
3. Real-time installation tracking and status updates
4. QR-based device registration (Ezer units)
5. Automated maintenance intelligence with 5-level escalation (reminder, due, overdue, critical, auto-assign)
6. Product maintenance templates - define default filter schedules per product, auto-populate on device registration
7. Customer device portal - customers see their devices, maintenance status, and upcoming service dates
8. Email notifications at every escalation level via Firebase Trigger Email
9. Auto-assignment of technicians for critically overdue maintenance (14+ days), with load-balanced technician selection
10. Admin dashboard with analytics (revenue, orders, technician stats)
11. Sub-contractor company management
12. Internal inventory management for parts, filters, and supplies with stock adjustment audit trail
13. Technician maintenance visits via common QR scan with 4-point checklist
14. Customizable logo upload for admin, sub-contractor, and technician dashboards
15. Multi-language support (EN, ES, PT-BR, KO)
16. Role-based access (customer, technician, admin, sub-admin)
17. Complete audit trail and transaction history

## Unique Selling Points
- End-to-end lifecycle: from order to installation to ongoing maintenance - fully automated
- Automated maintenance intelligence: 5-level escalation ensures no device goes unserviced, with auto-dispatch at critical thresholds
- QR-code device registration links physical units to digital records with auto-generated maintenance schedules
- Customer self-service: device portal gives customers visibility into maintenance status without calling support
- Internal inventory management: track parts and supplies with full stock adjustment audit trail
- Built-in technician certification and approval workflow
- Multi-language support for global deployment (Brazilian Portuguese included)

## Tech Stack
Next.js 15, React 19, TypeScript, Firebase, Tailwind CSS

## Suggested Pricing
- Free tier for individual technicians
- $29/month for small companies (up to 10 technicians)
- $99/month for enterprise (unlimited technicians, analytics, sub-admin portal)

## Brand Voice
Professional, reliable, clean - Apple-inspired design aesthetic

## Marketing Angle
"Stop managing installations on spreadsheets. Selvavore connects your entire water filtration operation - from customer orders to technician dispatch to device maintenance - in one platform."


---

## File: `./Marketing/twitter-threads.md`

# Selvavore App - Twitter/X Threads

---

## Thread 1: Problem-Solution

**Tweet 1 (Hook):**
Water filtration companies are losing thousands per month to scheduling chaos.

Here's what a digital-first installation workflow looks like (thread):

**Tweet 2:**
Step 1: Customer places an order online, uploads site photos, and selects a service package.

No phone calls. No back-and-forth emails.

**Tweet 3:**
Step 2: The system matches available, certified technicians based on location and specialization.

No more calling down a list hoping someone answers.

**Tweet 4:**
Step 3: Technician gets the job with all site details - photos, address, product specs - before they arrive.

No wasted trips. No surprises on-site.

**Tweet 5:**
Step 4: Real-time tracking. Customer sees status updates. Admin sees the whole operation at a glance.

Everyone stays informed without a single phone call.

**Tweet 6:**
Step 5: Installation complete. QR scan registers the device. Maintenance schedule auto-generates.

The system remembers when filters need replacing - your team doesn't have to.

**Tweet 7 (CTA):**
This is what we built with Selvavore.

Purpose-built for water filtration. Not generic field service software.

Check it out: [LINK]

---

## Thread 2: Industry Insight

**Tweet 1 (Hook):**
The water treatment market is worth $90B.

Most companies still manage installations with spreadsheets and WhatsApp groups.

Here's why that's about to change:

**Tweet 2:**
Customers expect real-time tracking. Amazon taught everyone to expect "your technician is 10 minutes away."

If you can't provide that, you lose to the company that can.

**Tweet 3:**
Device lifecycles need digital records. Regulators are moving toward traceability. Paper logs won't cut it.

**Tweet 4:**
Technician turnover is real. When your best installer leaves, their knowledge shouldn't leave with them.

Digital records keep institutional knowledge in the system.

**Tweet 5:**
The companies that digitize their installation operations now will own this market in 5 years.

The tools exist. The question is who moves first.

**Tweet 6 (CTA):**
We built Selvavore to be that tool for water filtration companies.

From order to installation to maintenance. One platform.

#WaterTreatment #FieldService

---

## Thread 3: Automated Maintenance Lifecycle

**Tweet 1 (Hook):**
What if your water filtration devices could tell you when they need service - and automatically dispatch a technician if you don't respond?

Here's how automated maintenance works (thread):

**Tweet 2:**
Every device gets a maintenance schedule the moment it's registered.

Filter replacements. Ezer maintenance. Each with its own interval - 90 days, 180 days, 365 days.

The system tracks everything. Your team doesn't have to.

**Tweet 3:**
7 days before maintenance is due, the customer gets an email reminder.

"Your Ezer device filter replacement is due on May 15th."

Proactive. Professional. Automated.

**Tweet 4:**
If the due date passes with no action, escalation begins:

Day 3 overdue: customer + admin get alerts
Day 7: CRITICAL notification to all admins
Day 14: system auto-assigns a technician

Each level has email notifications and in-app alerts.

**Tweet 5:**
The auto-assignment is smart about it too.

It picks the technician with the fewest active jobs. Load-balanced. No favoritism. No manual dispatch needed.

**Tweet 6:**
When maintenance is completed, the cycle resets:
- Customer gets a confirmation email
- Maintenance timer restarts
- Next due date auto-calculates

The whole thing runs itself.

**Tweet 7 (CTA):**
This is maintenance intelligence, not just maintenance tracking.

Built into Selvavore. No add-ons. No extra cost.

#WaterFiltration #MaintenanceAutomation #FieldService #IoT


---

## File: `./README.md`

# Selvavore (by Selvacore)

A water filtration installation management platform connecting customers, certified technicians, and contractors. Built with Next.js 15, TypeScript, Firebase, and Tailwind CSS.

## What It Does

- **Customers** browse products, place orders, upload site photos, pay, track installations, and view device maintenance status
- **Technicians** accept jobs, install equipment, register devices via QR scan, and complete maintenance
- **Admins** manage products/services/orders, approve technicians, view analytics, and oversee maintenance schedules

## Key Features

- End-to-end order lifecycle (order -> assignment -> installation -> device registration -> maintenance)
- QR-based device registration linking physical units to digital records
- Automated maintenance escalation (5-level: reminder -> due -> overdue -> critical -> auto-assign)
- Email notifications via Firebase Trigger Email extension
- Product maintenance templates with default filter schedules
- Customer device portal with maintenance status visibility
- Inventory management for internal parts/supplies with stock tracking and audit trail
- Technician maintenance visits via common QR scan with checklist (Ezer Maintenance, Water Pressure, Filter Condition, Filter Replacement)
- Logo upload for admin, sub-contractor, and technician dashboards
- Multi-language support (EN, ES, PT-BR, KO)
- Role-based access (customer, technician, admin, sub-admin)
- Sub-contractor management with scoped admin views

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Firebase (Firestore, Auth, Storage, Cloud Functions)
- **Auth:** Google Sign-In (Firebase Auth)
- **Email:** Firebase Trigger Email extension (SMTP)
- **Design:** Apple-inspired UI with system font stack

## Setup

### 1. Install Dependencies

```bash
npm install
cd functions && npm install
```

### 2. Configure Environment

Create `.env.local` with Firebase credentials:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Firebase is initialized in `lib/firebase/config.ts` (singleton pattern).

### 3. Run Development Server

```bash
npm run dev
```

## Project Structure

```
selvacoreapp01/
├── app/
│   ├── admin/          # Admin dashboard, products, orders, inventory, maintenance, settings
│   ├── customer/       # Customer ordering flow, device portal
│   ├── technician/     # Job management, QR scan, device registration, profile
│   ├── sub-admin/      # Sub-contractor dashboard, orders, technicians, settings
│   ├── login/          # Auth + language selection
│   └── select-role/    # New user role selection
├── components/         # Reusable UI components
├── contexts/           # Auth context provider
├── hooks/              # Custom hooks (useTranslation, etc.)
├── lib/
│   ├── firebase/       # Firebase config (singleton)
│   ├── services/       # Service layer (orders, products, devices, maintenance, inventory)
│   ├── translations/   # i18n (en, es, pt-br, ko)
│   └── utils/          # Formatters, helpers
├── types/              # TypeScript types (user, product, order, device, inventory)
├── functions/          # Firebase Cloud Functions
│   └── src/
│       ├── orders/     # Order lifecycle triggers
│       ├── technicians/# Technician status triggers
│       ├── maintenance/# Daily escalation, email templates, auto-assign
│       └── notifications/# In-app notification helper
├── firestore.rules     # Firestore security rules
└── firebase.json       # Firebase config
```

## Deployment

```bash
npm run build                        # Build frontend
cd functions && npm run build        # Build Cloud Functions
firebase deploy                      # Deploy everything
firebase deploy --only functions     # Deploy Cloud Functions only
firebase deploy --only hosting       # Deploy frontend only
firebase deploy --only firestore:rules  # Deploy rules only
```

## Maintenance Automation

The system includes a 5-phase automated maintenance workflow:

1. **Product Templates** - Products define default maintenance schedules (Ezer interval + filter replacements)
2. **Customer Portal** - Customers view their devices and maintenance status at `/customer/devices`
3. **Escalation** - Daily Cloud Function checks schedules and escalates through 5 levels
4. **Email Notifications** - Automated emails at each escalation level via Firebase Trigger Email
5. **Auto-Assignment** - At 14+ days overdue, automatically assigns a technician based on workload

## License

MIT


---

## File: `./Skill.md`

# MCP Workflow — Skill

**Purpose:** Guide how to connect Claude Code to external tools via MCP and build automated workflows.
**When to use:** Setting up MCP servers, building cross-tool automations, or troubleshooting connections.

---

## What MCP Does for This Project

MCP turns Claude Code from a code-writing tool into a full operating system for your project:

**Without MCP:**
```
You -> tell Claude what to build -> Claude writes code -> You copy/deploy/test manually
```

**With MCP:**
```
You -> tell Claude what to do -> Claude writes code AND deploys AND creates PR
AND posts to Slack AND updates Notion — all in one conversation
```

---

## Setting Up MCP Servers

Add a server via Claude Code terminal:

```bash
# GitHub — for PRs, issues, code review
claude mcp add github --transport http https://github.mcp.server/url

# Notion — for product docs, roadmap
claude mcp add notion --transport http https://notion.mcp.server/url

# Slack — for team notifications
claude mcp add slack --transport http https://slack.mcp.server/url
```

Verify connections:

```bash
# Check which MCP servers are connected
/mcp
```

Quick-add from MCP collection:

```bash
# Browse available MCP servers
claude mcp add --transport http https://mcp.notion.com/mcp
```

---

## Workflow Patterns

### Pattern 1: Code -> Deploy -> Notify

When building a new feature:

1. Claude Code writes the feature (uses general-coding-agent skill)
2. Claude Code runs tests locally
3. Claude Code creates a GitHub PR via MCP
4. Claude Code posts to Slack: "New PR ready for review: [link]"
5. Claude Code updates Notion roadmap: feature status -> "In Review"

**How to trigger this:** Tell Claude Code:

> "Build [feature], create a PR, and let the team know on Slack"

### Pattern 2: Bug Report -> Fix -> Deploy

1. Bug comes in via Slack or GitHub issue
2. Claude Code reads the bug details via MCP
3. Claude Code investigates the codebase
4. Claude Code writes the fix
5. Claude Code creates a PR with the fix
6. Claude Code comments on the original issue: "Fix submitted in PR #XX"

### Pattern 3: Research -> Build -> Document

1. Claude Code searches for best practices (web search)
2. Claude Code writes the implementation
3. Claude Code updates Notion documentation via MCP
4. Claude Code creates a GitHub PR

---

## MCP Best Practices

### Do

- Connect MCP servers at the start of your session
- Use MCP for repetitive cross-tool tasks (deploy + notify + document)
- Let Claude Code chain multiple MCP actions in one conversation
- Verify MCP connections with `/mcp` before relying on them

### Don't

- Don't manually copy-paste between tools when MCP can do it
- Don't create separate conversations for each tool interaction
- Don't forget to check if the MCP action succeeded (Claude Code reports back)
- Don't store MCP credentials in your codebase — Claude Code manages them

---

## Agentic OS: Putting It All Together

Your full agentic workflow looks like this:

```
┌──────────────────────────────────────────┐
│           YOU (CEO / Product Lead)        │
│  "Add an image analyzer to the platform" │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│           CLAUDE CODE (Agent)            │
│                                          │
│  1. Reads CLAUDE.md (project context)    │
│  2. Loads ai-detection-engine Skill.md   │
│  3. Follows the "New Analyzer" template  │
│  4. Writes image-analyzer.ts             │
│  5. Updates router.ts                    │
│  6. Runs tests                           │
│  7. Creates GitHub PR        <- MCP      │
│  8. Posts to Slack           <- MCP      │
│  9. Updates Notion roadmap   <- MCP      │
│  10. Reports back to you                 │
└──────────────────────────────────────────┘
```

This is the Agentic OS pattern: `CLAUDE.md` is memory, `Skills` are capabilities, `MCP` is connectivity. You direct the agent with natural language, and it handles the execution across all your tools.

---

## Troubleshooting MCP

| Problem                    | Solution                                                        |
|----------------------------|-----------------------------------------------------------------|
| `/mcp` shows no servers    | Re-run the `claude mcp add` commands                            |
| MCP action times out       | Check your internet connection and server URL                   |
| Permission denied          | Re-authenticate with the service (GitHub, Notion, etc.)         |
| Wrong data returned        | Verify you're pointing to the correct workspace/repo            |
| Server not found           | Check the MCP server URL — some require specific paths          |

---

## Recommended MCP Setup Order

1. **GitHub** (first priority) — you'll use this every session for PRs
2. **Slack** (second) — instant team visibility on what Claude builds
3. **Notion** (third) — keeps your roadmap and docs in sync
4. **Firebase** (when available) — direct database operations

Start with GitHub MCP and add others as your workflow demands it.

