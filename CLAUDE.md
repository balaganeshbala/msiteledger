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
- `firestore.rules` (enforcing per-user isolation, `createdBy == request.auth.uid`) is deployed and active — Firestore is no longer in open test mode.
- To run locally: `npm run dev`, then sign up with any email/password at `/login` — it creates a real (free-tier) Firebase Auth user.

## Data model (`src/types/index.ts`)

- `sites`: { id, siteName, clientName, createdBy }
- `labours`: { id, name, phone (optional — UI never requires it), dailyRate, isActive, createdBy }
- `dailyLabourLogs`: { id, siteId, labourId, date, weekStartDate (Sunday), dailySalary, extraAdvance, createdBy }. A doc only exists for a day the labour actually worked — `siteId` is always set and `dailySalary` is always that labour's `dailyRate`.
- `siteExpenses`: { id, siteId, date, title, amount, createdBy }
- `clientReceipts`: { id, siteId, date, description, amount, createdBy }

All docs are scoped by `createdBy` (the Firebase Auth UID); every hook in `src/hooks/` queries with `where("createdBy", "==", user.uid)`.

## Core calculation logic (`src/lib/labourCalculations.ts`)

- Week = Sunday–Saturday, derived from any date via `getWeekStartDate`. **Each week is fully self-contained — there is no running balance or debt carried between weeks.** Salary earned during a week is paid out as one lump sum at the end of that same week ("To Pay on End of Week" in the UI); a worker never owes anything into, or is owed anything from, next week.
- `extraAdvance` can only be given alongside a worked day, and is cash handed over immediately, deducted from that same week's payout — never a debt against future weeks.
- `computeWeekTotals(logs)` sums a set of logs into `{ totalSalary, totalAdvance, netPayable }`, where `netPayable = totalSalary - totalAdvance` is the amount owed to the worker at week's end.
- `maxAdvanceToday(otherWeekLogs, todaysSalary)` caps how much can be advanced on a given day to `max(0, totalSalary + todaysSalary - totalAdvance)` computed only over that same week's *already-saved* logs (never days later in the week that haven't been worked yet). `useLabourLedger.saveEntry` enforces this and throws if exceeded, so a week's `netPayable` can never go negative; the Labour page also disables Save and shows an inline warning before that throw would ever fire.
- **A site's labour cost is always `dailySalary`, never net of advances.** `extraAdvance` is a personal cash advance against the worker's own weekly payout, settled at week's end — it never contributes to any site's totals. `useDailyLabourLogs(siteId).totalLabourOutflow` sums `dailySalary` for exactly this reason; don't net it against advances.
- Saving a day's entry is a single doc write (create-or-update, matched by `date` within `weekStartDate`) — because weeks don't depend on each other and a day's `dailySalary` is always just `dailyRate`, editing or deleting one day never needs to touch or recompute any other day. `useLabourLedger(labourId)` is the only place entries are saved (`saveEntry`) or deleted (`deleteEntry`), scoped to one worker across all sites and weeks. `useWeeklyLabourLogs(weekStartDate)` is a separate, read-only, *all-workers* view of a single week (backs the Labour page's weekly matrix table). `useDailyLabourLogs(siteId)` remains the read-only, site-scoped view used for a site's own totals/activity feed (Overview, the site's read-only Labour tab, `NetCashBadge`).

## Structure notes

- `src/app/(app)/` is a route group — layout.tsx there gates on auth (`useAuth`) and wraps children in `SiteProvider`, `Header`, `TabNav`. Top-level tabs: `sites`, `labour`, `directory` (no global "active site" selector — the Labour tab picks a site per entry, and site financials live under `/site`).
- `src/app/(app)/sites/page.tsx` is a **browse-only** list of sites — there's no "Add Site" here; it links to Master Directory when empty. `src/app/(app)/site/layout.tsx` resolves the site from a `?id=` search param (`useSearchParams`, not a dynamic route segment — despite the folder being named `site`, singular) and renders its own sub-nav (Overview, Site Expenses, Client Receipts, Labour) plus a per-site `NetCashBadge`. `site/labour/page.tsx` is a **read-only** view of labour costs incurred at that site — editing/adding/deleting entries always happens on the global Labour tab.
- `src/app/login/` and `src/app/page.tsx` are outside the `(app)` group (unauthenticated / redirect-only).
- `SiteContext` just exposes the live `sites` list and CRUD (`addSite`/`updateSite`/`removeSite`) — there's no persisted "active site" anymore. Site-scoped data hooks (`useDailyLabourLogs`, `useSiteExpenses`, `useClientReceipts`) take a `siteId` explicitly (from the route param, or from local form state on the Labour tab). `addSite` is only invoked from the Master Directory's "Add Site" popup.
- Adding things is popup-driven, not inline: the Labour tab's entry form, and the Directory's "Add Worker"/"Add Site" forms, all live in `src/components/ui/Modal.tsx` popups triggered by an explicit button, rather than being permanently visible on the page. Editing an existing labour entry is done by clicking its cell in the Labour tab's weekly matrix (all workers × Sun–Sat, with Total Salary/Total Advance/Net Payable columns), which reopens the same popup pre-filled; a trash icon inside that popup deletes the day's entry (`useLabourLedger.deleteEntry`), guarded by a confirm dialog.
- `LabourAutocomplete` renders its suggestion dropdown through a React portal to `document.body`, positioned `fixed` from the input's live bounding rect — needed because it's used inside `Modal`, whose `overflow-y-auto` panel would otherwise clip/scroll an `absolute`-positioned dropdown.
- Deleting a labour is guarded the same way as deleting a site: `useLabours.removeLabour` throws `LabourHasRecordsError` if the worker has any `dailyLabourLogs`, and the Directory page surfaces that as an error telling the user to deactivate (`isActive` toggle) instead of delete.
- `LanguageContext` persists EN/Tamil choice to a cookie + localStorage; translations live in `src/lib/translations.ts` as a flat key → {en, ta} dictionary, typed via `TranslationKey`.
- A few `useEffect` calls have `// eslint-disable-next-line react-hooks/set-state-in-effect` comments — these are intentional (hydrating from localStorage/cookie on mount, or resetting cached Firestore data when the auth/site scope changes), not oversights.

## Known gaps / not yet done

- Firestore security rules written but not deployed (see above).
- Phone OTP login is implemented but untested against a real number.
- No automated tests.
