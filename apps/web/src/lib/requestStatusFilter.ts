/** 一覧画面が選択できる状態を定義する。APIの状態型を使い、削除済みを選択肢に含めない。 */
import type { RequestStatus } from "@miniflow/shared";

/** 保存済みの申請状態のうち、通常一覧で絞り込める状態。文言はmessagesのstatusLabelsを使う。 */
export const requestStatusOptions = ["Draft", "Pending", "Approved", "Rejected"] as const satisfies readonly RequestStatus[];
/** 空文字は絞り込みなしで、APIへstatusを送らない。 */
export type RequestStatusFilter = "" | (typeof requestStatusOptions)[number];
/** native selectの文字列を検証する。未知の値はnullとし、選択中の条件を変更しない。 */
export function parseRequestStatusFilter(value: string): RequestStatusFilter | null {
  return value === "" ? "" : requestStatusOptions.find(status => status === value) ?? null;
}
