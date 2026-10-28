"use client";

/** 未保存の下書きから移動する前の確認。開閉とfocusだけを持ち、入力・通信・移動は親へ委ねる。 */
import React, { useEffect, useId, useRef } from "react";
import type { Labels } from "../lib/messages";

/** 編集継続とEscはonCancel、破棄確定だけonConfirmを呼ぶ。確認の取り消しでは操作元へfocusを戻す。 */
export function RequestLeaveDialog({ labels, logout, disabled, onCancel, onConfirm }: {
  labels: Labels; logout: boolean; disabled: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const confirmed = useRef(false);
  const id = useId();
  useEffect(() => {
    if (dialog.current?.open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
  }, []);
  return <dialog ref={dialog} className="request-leave-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onClose={() => {
      if (!confirmed.current) { opener.current?.focus(); onCancel(); }
    }}>
    <form method="dialog" className="stack">
      <h2 id={`${id}-title`}>{labels.unsavedTitle}</h2>
      <p id={`${id}-description`}>{labels.unsavedWarning}</p>
      <div className="form-actions">
        <button className="button secondary" type="submit" autoFocus>{labels.keepEditing}</button>
        <button className="button reject" type="button" disabled={disabled} onClick={() => {
          confirmed.current = true;
          dialog.current?.close();
          onConfirm();
        }}>{logout ? labels.discardAndLogout : labels.discardAndLeave}</button>
      </div>
    </form>
  </dialog>;
}
