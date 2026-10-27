"use client";

/** 申請名と注意書きを示す削除確認。確認の開閉とfocusだけを持ち、通信と成功後の遷移は親が担当する。 */
import React, { useId, useRef } from "react";
import type { Labels } from "../lib/messages";

/** 確定時だけonConfirmを呼ぶ。キャンセル/Escでは呼ばず、閉じたら操作元へfocusを戻す。 */
export function RequestDeleteAction({ title, labels, disabled, onConfirm }: {
  title: string;
  labels: Labels;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const id = useId();
  return <>
    <button ref={opener} className="button reject" type="button" disabled={disabled} onClick={() => dialog.current?.showModal()}>
      {labels.deleteRequest}
    </button>
    <dialog ref={dialog} className="request-delete-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onClose={() => { if (!disabled) opener.current?.focus(); }}>
      <form method="dialog" className="stack">
        <h2 id={`${id}-title`}>{labels.confirmDelete}</h2>
        <div id={`${id}-description`} className="stack">
          <strong>{title}</strong>
          <p>{labels.deleteWarning}</p>
        </div>
        <div className="form-actions">
          <button className="button secondary" type="submit" autoFocus>{labels.cancel}</button>
          <button className="button reject" type="button" disabled={disabled} onClick={() => {
            dialog.current?.close();
            onConfirm();
          }}>{labels.deleteConfirm}</button>
        </div>
      </form>
    </dialog>
  </>;
}
