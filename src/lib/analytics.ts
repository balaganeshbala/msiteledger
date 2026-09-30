import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
  type Analytics,
} from "firebase/analytics";
import { app } from "@/lib/firebase";

// Google Analytics (via Firebase) can be unavailable in some browsers (or
// behind blockers). Every helper here is fire-and-forget and silently no-ops
// in those cases, so analytics can never break or slow down a real action.
//
// Never pass site/client/worker names, phone numbers or amounts as params —
// only counts, flags and the pseudonymous Firebase UID.

let analyticsPromise: Promise<Analytics | null> | null = null;

function getAnalyticsInstance(): Promise<Analytics | null> {
  if (!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
    return Promise.resolve(null);
  }
  analyticsPromise ??= isSupported()
    .then((ok) => (ok ? getAnalytics(app) : null))
    .catch(() => null);
  return analyticsPromise;
}

export type AnalyticsEvent =
  | "login"
  | "sign_up"
  | "site_created"
  | "labour_created"
  | "labour_entry_saved"
  | "labour_entry_deleted"
  | "expense_added"
  | "receipt_added";

export function trackEvent(
  name: AnalyticsEvent,
  params?: Record<string, string | number | boolean>
) {
  void getAnalyticsInstance().then((a) => {
    if (a) logEvent(a, name as string, params);
  });
}

/** Ties events to the signed-in user so GA can count distinct active users. */
export function identifyUser(uid: string | null) {
  void getAnalyticsInstance().then((a) => {
    if (a) setUserId(a, uid);
  });
}

export function setUserProperty(name: string, value: string) {
  void getAnalyticsInstance().then((a) => {
    if (a) setUserProperties(a, { [name]: value });
  });
}
