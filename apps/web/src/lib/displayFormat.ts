/** 一覧と詳細で日時・識別子の既存表記を共有する。日時の欠けは推測せず「-」とする。 */
/** ブラウザの時刻帯で月日・時分を表示する。不正な日時は「-」を返す。 */
export function formatDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/** 既存の一覧と同じ長さで識別子を短縮する。 */
export function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}
