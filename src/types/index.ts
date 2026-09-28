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
  siteId: string;
  labourId: string;
  date: string; // YYYY-MM-DD
  weekStartDate: string; // Sunday YYYY-MM-DD
  /** Always the labour's dailyRate — a doc only exists for a day actually worked. */
  dailySalary: number;
  /** Cash advanced against this week's salary; paid out with the rest on Saturday. */
  extraAdvance: number;
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
