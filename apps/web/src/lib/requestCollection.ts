/** ページと全件集計の読込を組み立てる。認証・表示状態は呼び出し元が所有する。 */
import type { RequestListScope } from "@miniflow/shared";
import { fetchRequestSummary, listRequests } from "./requestApi";

/** Webの一覧件数。APIの既定値と同じ20件とし、全件取得は行わない。 */
export const requestPageSize = 20;

/** 古い応答はnullで破棄する。空の最終ページの補正は1回だけ行い、更新が続いても無限に再取得しない。 */
export async function loadRequestCollection(baseUrl: string, scope: RequestListScope, page: number, dashboard: boolean, isCurrent: () => boolean) {
  const [initial, summary] = await Promise.all([
    listRequests(baseUrl, false, { scope, page, limit: dashboard ? 5 : requestPageSize }),
    fetchRequestSummary(baseUrl)
  ]);
  if (!isCurrent()) return null;
  const lastPage = Math.max(1, Math.ceil(initial.total / initial.limit));
  const listing = page > lastPage
    ? await listRequests(baseUrl, false, { scope, page: lastPage, limit: initial.limit })
    : initial;
  if (!isCurrent()) return null;
  if (listing.page > Math.max(1, Math.ceil(listing.total / listing.limit))) {
    throw new Error("申請件数が変更されました。再読み込みしてください。");
  }
  return { listing, summary };
}
