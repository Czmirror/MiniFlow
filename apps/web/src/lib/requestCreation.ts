/** 新規作成の確認と、その後の提出結果を区別する。画面から通信関数を受け取り、更新を自動再送しない。 */
import type { RequestDto } from "@miniflow/shared";

/** 作成応答が得られない場合と、作成済みだが提出結果が不明な場合を分ける。 */
export type RequestCreationResult =
  | { kind: "creation-unknown"; error: unknown }
  | { kind: "saved" | "submitted"; request: RequestDto }
  | { kind: "submission-unknown"; request: RequestDto; error: unknown };

/**
 * 作成成功をonCreatedで直ちに通知してから、任意の提出を1回だけ行う。
 * onCreatedは同期的な画面状態の更新に使う。isCurrentが偽なら後続通信・通知を止め、古い成功と失敗はnullで破棄する。
 */
export async function runRequestCreation(options: {
  create: () => Promise<RequestDto>;
  submit?: (id: string) => Promise<RequestDto>;
  onCreated: (request: RequestDto) => void;
  isCurrent: () => boolean;
}): Promise<RequestCreationResult | null> {
  if (!options.isCurrent()) return null;
  let created: RequestDto;
  try {
    created = await options.create();
  } catch (error) {
    return options.isCurrent() ? { kind: "creation-unknown", error } : null;
  }
  if (!options.isCurrent()) return null;
  options.onCreated(created);
  if (!options.isCurrent()) return null;
  if (!options.submit) return { kind: "saved", request: created };

  try {
    const submitted = await options.submit(created.id);
    return options.isCurrent() ? { kind: "submitted", request: submitted } : null;
  } catch (error) {
    // 提出失敗を作成失敗へ戻すと、再操作で別の申請を作ってしまう。
    return options.isCurrent() ? { kind: "submission-unknown", request: created, error } : null;
  }
}
