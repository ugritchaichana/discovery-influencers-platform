export const DASHBOARD_ACCOUNT_EVENT = "dashboard:open-account" as const;

export type DashboardAccountEventDetail = {
  recordId?: string | null;
};
