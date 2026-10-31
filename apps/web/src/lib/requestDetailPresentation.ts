/** 詳細の決定履歴を時刻順に整える。通信・認可・状態更新は行わず、入力配列を変更しない。 */
import type { ApprovalDto, RequestDto } from "@miniflow/shared";

/** 同時刻はAPIの順を保つ。不正日時は先頭に置き、最新理由の候補にはしない。 */
export function requestDetailPresentation(status: RequestDto["status"], approvals: readonly ApprovalDto[]) {
  const entries = approvals.map((approval, index) => ({ approval, index, time: Date.parse(approval.createdAt) }));
  entries.sort((a, b) => {
    const left = Number.isFinite(a.time) ? a.time : -Infinity;
    const right = Number.isFinite(b.time) ? b.time : -Infinity;
    return left === right ? a.index - b.index : left - right;
  });
  const latest = entries.filter(entry => Number.isFinite(entry.time)).at(-1)?.approval;
  return {
    history: entries.map(entry => entry.approval),
    rejection: status === "Rejected" && latest?.actionType === "Rejected" ? latest : null
  };
}
