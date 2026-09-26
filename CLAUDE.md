@AGENTS.md

# MSiteLedger

Full-stack construction site financial management & daily labour salary tracker. Bilingual (English / Tamil).

## Tech stack

- Next.js 16 (App Router, TypeScript, Turbopack) — see `AGENTS.md` note: this repo's Next.js version has breaking changes vs. training data; read `node_modules/next/dist/docs/` before assuming Next 14 conventions (e.g. `params` is a Promise, `LayoutProps`/`PageProps` are generated global helper types).
- Tailwind CSS v4, Lucide React icons
- Firebase Auth (Email/Password + Phone OTP) + Cloud Firestore
- Deploy target: Firebase Hosting via the Next.js web frameworks integration (`firebase.json` already configured)

## Firebase project

- Project ID: `msiteledger` (real project, not a placeholder)
- Real config lives in `.env.local` (gitignored — never commit it). `.env.local.example` has the empty template.
- Email/Password auth provider is enabled. Phone OTP auth code exists (`sendPhoneOtp` in `AuthContext`) but has not been tested against a real phone number/reCAPTCHA yet.
- **Firestore is currently in test mode** (open read/write for any signed-in user) — `firestore.rules` in this repo enforces real per-user isolation (`createdBy == request.auth.uid`) but has **not been deployed**. Deploy with `firebase deploy --only firestore:rules` before this app has real users or sensitive data.
- To run locally: `npm run dev`, then sign up with any email/password at `/login` — it creates a real (free-tier) Firebase Auth user.

## Data model (`src/types/index.ts`)

- `sites`: { id, siteName, clientName, createdBy }
- `labours`: { id, name, phone, dailyRate, isActive, createdBy }
- `dailyLabourLogs`: { id, siteId (nullable), labourId, date, weekStartDate (Sunday), workedToday, dailySalary, extraAdvance, totalCashPaid, runningBalance, createdBy }. `siteId` is null on a non-work day — an advance given without the worker being at any site.
- `siteExpenses`: { id, siteId, date, title, amount, createdBy }
- `clientReceipts`: { id, siteId, date, description, amount, createdBy }

All docs are scoped by `createdBy` (the Firebase Auth UID); every hook in `src/hooks/` queries with `where("createdBy", "==", user.uid)`.

## Core calculation logic (`src/lib/labourCalculations.ts`)

- Week = Sunday–Saturday, derived from any date via `getWeekStartDate`.
- Work day: `dailySalary = dailyRate`. Today's earned salary first pays down any outstanding advance debt (a negative running balance) before anything is handed to the worker: `paidTowardsDebt = min(dailySalary, -previousBalance)` (0 if `previousBalance >= 0`), `totalCashPaid = dailySalary - paidTowardsDebt + extraAdvance`.
- Non-work day: `dailySalary = 0`, `totalCashPaid = extraAdvance` only (no debt paydown, since nothing was earned).
- Zero-activity day (no work, no advance): **no Firestore doc is created** — balance carries forward untouched.
- Running balance formula: `runningBalance = previousBalance + paidTowardsDebt - extraAdvance`. Negative balance = advance owed by labour; it never exceeds zero — any salary beyond what's needed to clear existing debt is paid out as cash (via `totalCashPaid`) rather than accumulating as a positive wage-owed balance.
- **The running balance is global per worker, not per site.** A worker has exactly one balance across every site they work at, since an advance taken on a non-work day isn't tied to any particular site. `useLabourLedger(labourId)` owns this: it reads/writes across all of a worker's `dailyLabourLogs` regardless of `siteId` and is the only place entries are saved (the Labour tab). `useDailyLabourLogs(siteId)` is read-only and site-scoped — it's used purely for a site's own totals/activity feed (Overview, the site's read-only Labour tab, `NetCashBadge`) and naturally excludes non-work-day entries since those have `siteId: null`.
- **A site's labour cost is always `dailySalary`, never `totalCashPaid`.** `extraAdvance` — whether given on a work day or an off day — is a personal loan to the worker, not a site expense, so it never contributes to any site's totals. Likewise, when a work day's salary is used to pay down a prior advance debt (see below), the site is still charged the *full* `dailySalary` even though the worker may receive less (or none) of it in cash that day — the debt paydown is a worker-ledger event, invisible to site accounting. `useDailyLabourLogs(siteId).totalLabourOutflow` sums `dailySalary` for exactly this reason; don't change it back to `totalCashPaid`.
- Editing a past day's entry cascades: `useLabourLedger.saveEntry` re-fetches every log for that labour (across all sites), re-sorts by date, recomputes the running-balance chain from scratch, and batch-writes everything via `writeBatch`. A given labour can have at most one entry per date (work is assumed to happen at one site per day).

## Structure notes

- `src/app/(app)/` is a route group — layout.tsx there gates on auth (`useAuth`) and wraps children in `SiteProvider`, `Header`, `TabNav`. Top-level tabs: `sites`, `labour`, `directory` (no global "active site" selector — the Labour tab picks a site per entry, and site financials live under `sites/[siteId]`).
- `src/app/(app)/sites/page.tsx` lists sites; `sites/[siteId]/layout.tsx` resolves the site from the route param and renders its own sub-nav (Overview, Site Expenses, Client Receipts, Labour) plus a per-site `NetCashBadge`. `sites/[siteId]/labour/page.tsx` is a **read-only** view of labour costs incurred at that site — editing always happens on the global Labour tab.
- `src/app/login/` and `src/app/page.tsx` are outside the `(app)` group (unauthenticated / redirect-only).
- `SiteContext` just exposes the live `sites` list and CRUD (`addSite`/`updateSite`/`removeSite`) — there's no persisted "active site" anymore. Site-scoped data hooks (`useDailyLabourLogs`, `useSiteExpenses`, `useClientReceipts`) take a `siteId` explicitly (from the route param, or from local form state on the Labour tab).
- `LanguageContext` persists EN/Tamil choice to a cookie + localStorage; translations live in `src/lib/translations.ts` as a flat key → {en, ta} dictionary, typed via `TranslationKey`.
- A few `useEffect` calls have `// eslint-disable-next-line react-hooks/set-state-in-effect` comments — these are intentional (hydrating from localStorage/cookie on mount, or resetting cached Firestore data when the auth/site scope changes), not oversights.

## Known gaps / not yet done

- Firestore security rules written but not deployed (see above).
- Phone OTP login is implemented but untested against a real number.
- No automated tests.
- Editing/deleting individual `dailyLabourLogs` rows directly (outside the entry form) isn't exposed in the UI.
