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
