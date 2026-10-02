export interface Site {
  id: string;
  siteName: string;
  clientName: string;
  /**
   * true once the site's work is finished. Missing on sites created before
   * this field existed — treat missing as active.
   */
  isCompleted?: boolean;
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
  /**
   * The site worked at. Absent on an advance-only day (worked === false),
   * since no work was done at any site.
   */
  siteId?: string;
  labourId: string;
  date: string; // YYYY-MM-DD
  weekStartDate: string; // Sunday YYYY-MM-DD
  /**
   * Salary earned that day — defaults to the labour's dailyRate but can be
   * edited (e.g. half day). Always 0 when `worked` is false.
   */
  dailySalary: number;
  /**
   * false for an advance-only day (cash handed over, no work done). Missing on
   * entries saved before this field existed — treat missing as worked.
   */
  worked?: boolean;
  /**
   * How many people worked that day (for a group/team labour). Purely
   * informational — never used in any calculation. Absent when not given.
   */
  memberCount?: number;
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
