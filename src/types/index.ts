export interface Site {
  id: string;
  siteName: string;
  clientName: string;
  createdBy: string;
  createdAt?: number;
}

export interface Labour {
  id: string;
  name: string;
  phone: string;
  dailyRate: number;
  isActive: boolean;
  createdBy: string;
  createdAt?: number;
}

export interface DailyLabourLog {
  id: string;
  /** null when the day wasn't worked — an advance not tied to any site. */
  siteId: string | null;
  labourId: string;
  date: string; // YYYY-MM-DD
  weekStartDate: string; // Sunday YYYY-MM-DD
  workedToday: boolean;
  dailySalary: number;
  extraAdvance: number;
  totalCashPaid: number;
  runningBalance: number;
  createdBy: string;
  createdAt?: number;
}

export interface SiteExpense {
  id: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number;
  createdBy: string;
  createdAt?: number;
}

export interface ClientReceipt {
  id: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  createdBy: string;
  createdAt?: number;
}

export type Language = "en" | "ta";

export type Theme = "light" | "dark";

export interface ActivityItem {
  id: string;
  type: "labour" | "expense" | "receipt";
  date: string;
  title: string;
  amount: number;
  sign: 1 | -1;
  createdAt?: number;
}
