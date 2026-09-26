# MSiteLedger

Full-stack construction site financial management & daily labour salary tracker. Bilingual (English / Tamil).

Track, per construction site: client receipts, site expenses, and daily labour wages/advances — with a running balance per worker across every site they work at.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — deployed as a fully static export (`output: "export"`); every page is client-rendered, there's no Node.js server or Cloud Function involved.
- **Tailwind CSS v4**, Lucide React icons
- **Firebase Auth** (Email/Password + Phone OTP) + **Cloud Firestore**
- **Deploy target**: Firebase Hosting, as static files (no Cloud Functions, no Blaze plan required)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Firebase web app config
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then sign up with any email/password at `/login` — this creates a real Firebase Auth user against whichever Firebase project your `.env.local` points at.

### Environment variables

`.env.local` (gitignored — never commit your real values) needs the Firebase web app config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These are public web config values (safe to ship in a client bundle by design), not secrets — but `.env.local` is still kept out of git so each environment can point at its own Firebase project.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build — outputs a static site to `out/` |
| `npm run start` | Serve the last `npm run build` output locally |
| `npm run lint` | ESLint |

## Deploying

```bash
firebase deploy
```

This builds and ships everything: the static site to Firebase Hosting, `firestore.rules`, and `firestore.indexes.json`. The Hosting config has a `predeploy` hook (`npm run build`), so it always deploys a fresh build — no manual build step needed.

First-time setup on a new machine:

```bash
firebase login
firebase use --add   # link this folder to your Firebase project
```

## Data model

See `CLAUDE.md` for the full data model, calculation logic (daily labour salary/advance/running-balance rules), and architecture notes. In short:

- `sites`, `labours`, `dailyLabourLogs`, `siteExpenses`, `clientReceipts` — all Firestore collections scoped by `createdBy` (the signed-in user's UID).
- A worker's running balance is global across every site they work at, not per-site — see `useLabourLedger`.
- A site's own labour cost is always the worker's earned salary, never advances given to them.

## Known gaps

- Phone OTP login is implemented but untested against a real phone number.
- No automated tests.
- Editing/deleting individual `dailyLabourLogs` rows directly (outside the daily entry form) isn't exposed in the UI.
