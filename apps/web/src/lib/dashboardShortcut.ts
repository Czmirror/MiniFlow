/** ダッシュボードの固定操作を既存一覧の条件へ対応させる。通信・集計・認可は担当しない。 */
import type { RequestListView } from "./requestListSelection";
import type { RequestStatusFilter } from "./requestStatusFilter";

/** 件数カードの順序。summaryの既存キーを使い、抜粋の全件操作とは区別する。 */
export const dashboardMetrics = ["total", "mine", "pending", "approved", "rejected", "drafts"] as const;
export type DashboardShortcut = (typeof dashboardMetrics)[number] | "pendingApprovals";
type Destination = { view: RequestListView; status: RequestStatusFilter };

/** チーム全体のPendingと本人向け承認待ちを区別する。未知値には移動先を返さない。 */
export function resolveDashboardShortcut(value: string): Destination | null {
  switch (value) {
    case "total": return { view: "requests", status: "" };
    case "mine": return { view: "mine", status: "" };
    case "pending": return { view: "requests", status: "Pending" };
    case "approved": return { view: "requests", status: "Approved" };
    case "rejected": return { view: "requests", status: "Rejected" };
    case "drafts": return { view: "requests", status: "Draft" };
    case "pendingApprovals": return { view: "pending", status: "" };
    default: return null;
  }
}
