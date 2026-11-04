/** Node.jsで直接動かすCI helperを、既存のTypeScript試験から利用するための契約。実装はharness-ref.mjsが正本。 */
/** 固定pathのgitlinkを検証して40桁のSHAを返す。不正な入力ではErrorを投げる。 */
export function parseHarnessRef(entry: string): string;
