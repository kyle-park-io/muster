import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  CirclePower,
  Clock3,
  FileTerminal,
  Info,
  Play,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LogsResponse, ScheduleAction, ScheduleItem } from "../../shared/types";
import { fetchLogs } from "../api";
import { formatDate, sourceNames, stateNames } from "../format";

interface DetailPanelProps {
  item: ScheduleItem;
  onClose: () => void;
  onAction: (action: ScheduleAction) => void;
}

export function DetailPanel({ item, onClose, onAction }: DetailPanelProps) {
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(
        panel.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled)"),
      );
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
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLoadingLogs(true);
    fetchLogs(item.id)
      .then((response) => { if (active) setLogs(response); })
      .catch((error: Error) => {
        if (active) setLogs({ available: false, lines: [], message: error.message });
      })
      .finally(() => { if (active) setLoadingLogs(false); });
    return () => { active = false; };
  }, [item.id]);

  return (
    <>
      <button className="drawer-scrim" type="button" onClick={onClose} aria-label="상세 패널 닫기" />
      <aside ref={panel} className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="detail-header">
          <div className="detail-source-row">
            <span className={`mini-source source-${item.source}`}>{sourceNames[item.source]}</span>
            <span className={`state-badge state-${item.state}`}><i />{stateNames[item.state]}</span>
          </div>
          <button ref={closeButton} className="icon-button" type="button" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="detail-title-block">
          <h2 id="detail-title">{item.name}</h2>
          <p>{item.description}</p>
        </div>

        <div className="detail-actions">
          {item.canRun && (
            <button className="primary-action" type="button" onClick={() => onAction("run")}>
              <Play size={16} fill="currentColor" /> 지금 실행
            </button>
          )}
          {item.controllable && (
            <button
              className={`secondary-action ${item.enabled ? "danger" : ""}`}
              type="button"
              onClick={() => onAction(item.enabled ? "disable" : "enable")}
            >
              <CirclePower size={16} /> {item.enabled ? "끄기" : "켜기"}
            </button>
          )}
        </div>

        {!item.controllable && (
          <div className="readonly-note"><ShieldCheck size={16} /><span>{item.controlHint}</span></div>
        )}

        <section className="detail-section" aria-labelledby="schedule-detail-heading">
          <h3 id="schedule-detail-heading">실행 정보</h3>
          <dl className="detail-list">
            <div><dt><CalendarClock size={15} />주기</dt><dd><code>{item.schedule}</code></dd></div>
            <div><dt><Clock3 size={15} />다음 실행</dt><dd>{formatDate(item.nextRun)}</dd></div>
            <div><dt><Clock3 size={15} />최근 실행</dt><dd>{formatDate(item.lastRun)}</dd></div>
            <div><dt><Info size={15} />범위</dt><dd>{item.scope === "user" ? "사용자" : item.scope === "system" ? "시스템" : item.scope === "windows" ? "Windows" : "에이전트"}</dd></div>
          </dl>
        </section>

        <section className="detail-section" aria-labelledby="command-heading">
          <h3 id="command-heading">실행 명령</h3>
          <pre className="command-block"><code>{item.command || "명령 정보 없음"}</code></pre>
        </section>

        <section className="detail-section log-section" aria-labelledby="logs-heading">
          <div className="logs-title">
            <h3 id="logs-heading">최근 로그</h3>
            <FileTerminal size={15} />
          </div>
          <div className="log-view" aria-live="polite">
            {loadingLogs ? (
              <p className="log-placeholder">로그를 불러오는 중...</p>
            ) : logs?.available ? (
              <pre>{logs.lines.join("\n")}</pre>
            ) : (
              <p className="log-placeholder">{logs?.message || "표시할 로그가 없습니다."}</p>
            )}
          </div>
        </section>
      </aside>
    </>
  );
}
