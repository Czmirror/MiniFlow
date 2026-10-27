/** 詳細取得の結果を、呼び出し元が管理する画面の世代に照合する。通信と画面状態自体は所有しない。 */
import type { RequestDetailDto } from "@miniflow/shared";

/** 所属変更・認証破棄・新しい詳細取得で無効になった成功と失敗は、どちらも画面へ返さない。 */
export async function currentRequestDetail(load: () => Promise<RequestDetailDto>, isCurrent: () => boolean): Promise<RequestDetailDto | null> {
  try {
    const detail = await load();
    return isCurrent() ? detail : null;
  } catch (error) {
    if (!isCurrent()) return null;
    throw error;
  }
}
