/** 認証済みのチームと本人を使い、全件の集計を保存先から取得する。HTTPやDBの詳細は持たない。 */
import type { RequestRepository } from "../ports/RequestRepository.js";
import { InputValidationError } from "../errors/InputValidationError.js";

/** HTTPが認証情報から解決したIDを渡す。空のIDは保存先へ到達する前に拒否する。 */
export function getRequestSummary(repository: RequestRepository, teamId: string, actorId: string) {
  if (!teamId.trim() || !actorId.trim()) throw new InputValidationError("team and actor are required");
  return repository.summary(teamId, actorId);
}
