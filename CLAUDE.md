# MSiteLedger

Full-stack construction site financial management & daily labour salary tracker. Bilingual (English / Tamil).

## Tech stack

- Vite 8 + React 19 (TypeScript), a pure client-side SPA — no SSR, no server code
- React Router v8 (declarative `<BrowserRouter>` + `<Routes>`, imported from `react-router`)
- Tailwind CSS v4 (via `@tailwindcss/vite`), Lucide React icons, Plus Jakarta Sans via `@fontsource-variable`
- Firebase Auth (Email/Password + Phone OTP) + Cloud Firestore
- Deploy target: Firebase Hosting serving the static `dist/` build, with a `** → /index.html` SPA rewrite (`firebase.json`)

## Firebase project

- Project ID: `msiteledger` (real project, not a placeholder)
- Real config lives in `.env.local` (gitignored — never commit it) as `VITE_FIREBASE_*` vars, read via `import.meta.env`. `.env.local.example` has the empty template.
- Email/Password auth provider is enabled. Phone OTP auth code exists (`sendPhoneOtp` in `AuthContext`) but has not been tested against a real phone number/reCAPTCHA yet.
- `firestore.rules` (enforcing per-user isolation, `createdBy == request.auth.uid`) is deployed and active — Firestore is no longer in open test mode.
- To run locally: `npm run dev`, then sign up with any email/password at `/login` — it creates a real (free-tier) Firebase Auth user.

## Data model (`src/types/index.ts`)

- `sites`: { id, siteName, clientName, isCompleted?, createdBy }. New sites get `isCompleted: false`; older sites lack the field and are treated as active (`!site.isCompleted`), so never test `isCompleted === false`.
- `labours`: { id, name, phone (optional — UI never requires it), dailyRate, isActive, createdBy }
- `dailyLabourLogs`: { id, siteId?, labourId, date, weekStartDate (Sunday), dailySalary, worked?, extraAdvance, createdBy }. `siteId` is set only on a worked day; an advance-only day has no site (`saveEntry` clears it with `deleteField()`), and the entry popup hides the site picker when "Worked this day" is off. `dailySalary` defaults to the labour's `dailyRate` but is editable per day (e.g. half day). `worked: false` marks an advance-only day — `dailySalary` is 0 and it doesn't count as a worked day. Docs saved before `worked` existed lack it and are treated as worked; always check via `isWorkedDay(log)`, never `log.worked === true`. Optional `memberCount` (head count for a group labour) is informational only — never used in any calculation; it's cleared with `deleteField()` when blanked or when the day isn't worked.
- `siteExpenses`: { id, siteId, date, title, amount, createdBy }
- `clientReceipts`: { id, siteId, date, description, amount, createdBy }

Every doc also has `createdAt` (`serverTimestamp()`, set only on create — `saveEntry` uses `merge` so editing a day keeps its original value; entries saved before this fix may carry a later edit time).

All docs are scoped by `createdBy` (the Firebase Auth UID); every hook in `src/hooks/` queries with `where("createdBy", "==", user.uid)`.

## Core calculation logic (`src/lib/labourCalculations.ts`)

- Week = Sunday–Saturday, derived from any date via `getWeekStartDate`. **Each week is fully self-contained — there is no running balance or debt carried between weeks.** Salary earned during a week is paid out as one lump sum at the end of that same week ("To Pay on End of Week" in the UI); a worker never owes anything into, or is owed anything from, next week.
- `extraAdvance` can be given on a worked day or on an advance-only (`worked: false`) day, and is cash handed over immediately, deducted from that same week's payout — never a debt against future weeks.
- `computeWeekTotals(logs)` sums a set of logs into `{ totalSalary, totalAdvance, netPayable }`, where `netPayable = totalSalary - totalAdvance` is the amount owed to the worker at week's end.
- **Advances are not capped.** Any amount can be advanced on any day, including before the worker has worked that week, so a week's `netPayable` can be negative (the worker owes the difference). The Labour page shows negative amounts in red as `-₹X` and an amber, non-blocking warning in the entry popup. A negative week is **not** carried into the next week — weeks stay self-contained.
- **A site's labour cost is always `dailySalary`, never net of advances.** `extraAdvance` is a personal cash advance against the worker's own weekly payout, settled at week's end — it never contributes to any site's totals. `useDailyLabourLogs(siteId).totalLabourOutflow` sums `dailySalary` for exactly this reason; don't net it against advances.
- Advance-only days are excluded from every site view: `useDailyLabourLogs` filters them out, so they never appear in a site's labour tab/activity feed.
- Saving a day's entry is a single doc write (create-or-update, matched by `date` within `weekStartDate`) — because weeks don't depend on each other, editing or deleting one day never needs to touch or recompute any other day. `useLabourLedger(labourId)` is the only place entries are saved (`saveEntry`) or deleted (`deleteEntry`), scoped to one worker across all sites and weeks. `useWeeklyLabourLogs(weekStartDate)` is a separate, read-only, *all-workers* view of a single week (backs the Labour page's weekly matrix table). `useDailyLabourLogs(siteId)` remains the read-only, site-scoped view used for a site's own totals/activity feed (Overview, the site's read-only Labour tab, `NetCashBadge`).

## Structure notes

- Entry: `index.html` → `src/main.tsx` (`BrowserRouter`) → `src/App.tsx`, which holds the providers (Theme, Language, Auth), `OfflineOverlay`, and the whole route table. Pages live in `src/pages/`, layout routes (rendering `<Outlet />`) in `src/layouts/`. Unknown paths redirect to `/`.
- `layouts/AppLayout.tsx` is a pathless layout route that gates on auth (`useAuth`, redirects to `/login`) and wraps its routes in `SiteProvider`, `Header`, `TabNav`. Top-level tabs: `sites`, `labour`, `directory` (no global "active site" selector — the Labour tab picks a site per entry, and site financials live under `/site`).
- `pages/SitesPage.tsx` is a **browse-only** list of sites, split into an "Active Sites" section on top and a "Completed Sites" section below (hidden when empty) — there's no "Add Site" here; it links to Master Directory when empty. `layouts/SiteLayout.tsx` (the `/site` route) resolves the site from a `?id=` search param (`useSearchParams`, not a `:id` path segment — kept so existing URLs still work) and renders its own sub-nav (Overview, Site Expenses, Client Receipts, Labour) plus a per-site `NetCashBadge`. `pages/site/SiteLabourPage.tsx` is a **read-only** view of labour costs incurred at that site — editing/adding/deleting entries always happens on the global Labour tab.
- `/login` (`pages/LoginPage.tsx`) and `/` (`pages/HomePage.tsx`, redirect-only) sit outside `AppLayout`.
- Static assets (icons, `manifest.webmanifest`) live in `public/`; page `<title>`/meta/theme-color tags are static in `index.html`.
- `SiteContext` just exposes the live `sites` list and CRUD (`addSite`/`updateSite`/`removeSite`) — there's no persisted "active site" anymore. Site-scoped data hooks (`useDailyLabourLogs`, `useSiteExpenses`, `useClientReceipts`) take a `siteId` explicitly (from the route param, or from local form state on the Labour tab). `addSite` is only invoked from the Master Directory's "Add Site" popup.
- Adding things is popup-driven, not inline: the Labour tab's entry form, the Directory's "Add Worker"/"Add Site" forms, and a site's "Add Expense"/"Add Receipt" forms, all live in `src/components/ui/Modal.tsx` popups triggered by an explicit button, rather than being permanently visible on the page. Editing an existing labour entry is done by clicking its cell in the Labour tab's weekly matrix (every active worker — plus any inactive worker with entries that week — × Sun–Sat, with Worked Days/Total Salary/Total Advance/Net Payable columns, plus a footer row totalling all workers; an "Only who worked this week" switch, off by default and not persisted, hides rows with no entries that week — it filters on "has any entry", not `workedDays > 0`, so a row carrying an advance is never hidden while the footer still counts it), which reopens the same popup pre-filled (tracked as `editingLog`). Changing that entry's date or worker in the popup *moves* it: `saveEntry({ movedFromId })` writes the new day and deletes the old doc in one `writeBatch`, and refuses if the target day already has an entry. "Add Entry" never moves anything. A trash icon inside that popup deletes the day's entry (`useLabourLedger.deleteEntry`), guarded by a confirm dialog.
- `LabourAutocomplete` renders its suggestion dropdown through a React portal to `document.body`, positioned `fixed` from the input's live bounding rect — needed because it's used inside `Modal`, whose `overflow-y-auto` panel would otherwise clip/scroll an `absolute`-positioned dropdown.
- `pages/DirectoryPage.tsx` (Master Directory) shows Workers and Sites as two tabs, one list at a time; the last tab is remembered per device in localStorage (`msiteledger-directory-tab`, read/written inside try/catch). The Workers tab has a name/phone search. A worker's Active/Inactive switch and a site's Active/Completed switch live only in their edit forms (saved with Save); inactive workers and completed sites are shown faded in the list.
- The Labour tab's site picker leaves out completed sites, except the site of the entry being edited, so old entries stay editable. New entries default to the first active site.
- Deleting a labour is guarded the same way as deleting a site: `useLabours.removeLabour` throws `LabourHasRecordsError` if the worker has any `dailyLabourLogs`, and the Directory page surfaces that as an error telling the user to deactivate (`isActive` toggle) instead of delete.
- The app is **online-only**. `src/lib/firebase.ts` enables Firestore's IndexedDB `persistentLocalCache` purely so listeners render instantly from cache on repeat loads — not for offline use. `OfflineOverlay` (mounted in `App.tsx`, driven by `useOnlineStatus`) blocks the whole UI while `navigator.onLine` is false. There's no service worker, so an installed (Chrome "Install app") copy opened offline shows Chrome's own "You're offline" page.
- New `dailyLabourLogs` docs use the deterministic id `${labourId}_${date}` (see `useLabourLedger.saveEntry`) so concurrent saves from two devices hit one doc instead of duplicating a day. Entries created before this change keep their random ids and are still found by the date query.
- Analytics: `src/lib/analytics.ts` wraps Firebase Analytics (GA4). It's browser-only, lazy, and a silent no-op when `VITE_FIREBASE_MEASUREMENT_ID` is unset or `isSupported()` fails. `trackEvent` is called after successful writes in the hooks/AuthContext; `identifyUser` runs on auth change; language/theme are user properties. Never put names, phone numbers or amounts in event params.
- `LanguageContext` persists EN/Tamil choice to a cookie + localStorage; translations live in `src/lib/translations.ts` as a flat key → {en, ta} dictionary, typed via `TranslationKey`.
- `LanguageContext`/`ThemeContext` read their stored value in the `useState` initializer (safe since there's no SSR). A few hooks have `// eslint-disable-next-line react-hooks/set-state-in-effect` comments — these are intentional (resetting cached Firestore data when the auth/site scope changes), not oversights.

## Known gaps / not yet done

- Firestore security rules written but not deployed (see above).
- Phone OTP login is implemented but untested against a real number.
- No automated tests.
