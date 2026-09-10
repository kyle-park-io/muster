import { useEffect, useRef } from "react";
import { AlertTriangle, CirclePower, Play, X } from "lucide-react";
import type { ScheduleAction, ScheduleItem } from "../../shared/types";
import { actionCommand } from "../format";

interface ConfirmDialogProps {
  item: ScheduleItem;
  action: ScheduleAction;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const actionLabels = {
  enable: { title: "스케줄을 켤까요?", button: "켜기", Icon: CirclePower },
  disable: { title: "스케줄을 끌까요?", button: "끄기", Icon: CirclePower },
  run: { title: "지금 실행할까요?", button: "실행", Icon: Play },
};

export function ConfirmDialog({ item, action, busy, onCancel, onConfirm }: ConfirmDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const config = actionLabels[action];

  useEffect(() => {
    cancelButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled)"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [busy, onCancel]);

  return (
    <div className="modal-layer">
      <button className="modal-scrim" type="button" onClick={busy ? undefined : onCancel} aria-label="취소" />
      <div ref={dialog} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <button className="dialog-close" type="button" onClick={onCancel} disabled={busy} aria-label="닫기">
          <X size={18} />
        </button>
        <div className={`confirm-icon action-${action}`}>
          {action === "disable" ? <AlertTriangle size={21} /> : <config.Icon size={21} />}
        </div>
        <h2 id="confirm-title">{config.title}</h2>
        <p><strong>{item.name}</strong>에 아래 작업을 수행합니다.</p>
        <pre><code>{actionCommand(item, action)}</code></pre>
        <div className="confirm-note">
          {action === "run"
            ? "명령이 즉시 실행됩니다. 완료까지 시간이 걸릴 수 있습니다."
            : action === "disable"
              ? "다음 실행부터 동작하지 않습니다. 언제든 다시 켤 수 있습니다."
              : "스케줄을 활성화하고 다음 실행을 예약합니다."}
        </div>
        <div className="dialog-actions">
          <button ref={cancelButton} className="cancel-button" type="button" onClick={onCancel} disabled={busy}>취소</button>
          <button className={`confirm-button action-${action}`} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "처리 중..." : config.button}
          </button>
        </div>
      </div>
    </div>
  );
}
