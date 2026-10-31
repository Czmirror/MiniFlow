/** 一覧と詳細で共通の状態名・配色を表示する。渡された言語の文言だけを使う。 */
import React from "react";
import type { RequestDto } from "@miniflow/shared";
import type { Labels } from "../lib/messages";

/** 状態を文字と色で示す。 */
export function StatusBadge({ status, labels }: { status: RequestDto["status"]; labels: Labels }) {
  return <span className={`status ${status.toLowerCase()}`}>{labels.statusLabels[status]}</span>;
}
