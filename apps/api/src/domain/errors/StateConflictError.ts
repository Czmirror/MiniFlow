/** 業務の不正な状態遷移や保存時の競合を表す。HTTPへの変換はpresentationが担当する。 */

/** 現在の状態では操作を完了できないことを示す。messageは既存の呼び出し元が指定する。 */
export class StateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateConflictError";
  }
}
