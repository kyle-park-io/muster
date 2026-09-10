import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, MonitorCog, RefreshCw } from "lucide-react";
import type {
  OverviewResponse,
  ScheduleAction,
  ScheduleItem,
  SourceId,
} from "../shared/types";
import { fetchOverview, runAction } from "./api";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DetailPanel } from "./components/DetailPanel";
import { Header } from "./components/Header";
import { ScheduleTable, type StatusFilter } from "./components/ScheduleTable";
import { SourceStrip } from "./components/SourceStrip";
import { Summary } from "./components/Summary";
import { Timeline } from "./components/Timeline";

interface PendingAction {
  item: ScheduleItem;
  action: ScheduleAction;
}

function initialTheme(): "dark" | "light" {
  const stored = localStorage.getItem("muster-theme");
  if (stored === "dark" || stored === "light") return stored;
  return "dark";
}

export default function App() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);
  const [source, setSource] = useState<SourceId | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const data = await fetchOverview();
      setOverview(data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "로컬 API에 연결하지 못했습니다.");
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("muster-theme", theme);
  }, [theme]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".search-box input")?.focus();
      }
    };
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedItem = useMemo(
    () => overview?.schedules.find((item) => item.id === selectedId) ?? null,
    [overview, selectedId],
  );

  const closeDetail = useCallback(() => setSelectedId(null), []);

  const confirmAction = async () => {
    if (!pending) return;
    setActionBusy(true);
    try {
      const response = await runAction(pending.item.id, pending.action);
      setToast({ message: response.message });
      setPending(null);
      await load(true);
    } catch (actionError) {
      setToast({
        message: actionError instanceof Error ? actionError.message : "작업을 완료하지 못했습니다.",
        error: true,
      });
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Header
        hostname={overview?.hostname}
        platform={overview?.platform}
        generatedAt={overview?.generatedAt}
        refreshing={refreshing}
        theme={theme}
        onRefresh={() => void load()}
        onThemeChange={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />

      <main id="main-content" className="main-content">
        <div className="page-intro">
          <div>
            <p className="eyebrow">CONTROL ROOM</p>
            <h1>로컬 스케줄러</h1>
            <p>이 컴퓨터에서 반복되는 작업을 한곳에서 살펴보고 제어합니다.</p>
          </div>
          <div className="environment-chips" aria-label="로컬 실행 환경">
            <div className="platform-chip" title={overview ? `${overview.platform.release} · ${overview.platform.architecture}` : undefined}>
              <MonitorCog size={13} />
              {overview?.platform.label || "운영체제 확인 중"}
            </div>
            <div className="timezone-chip">
              <span />
              {overview?.timezone || "시간대 확인 중"}
            </div>
          </div>
        </div>

        {overview && (
          <SourceStrip sources={overview.sources} selected={source} onSelect={setSource} />
        )}

        {error && !overview && (
          <section className="connection-error" role="alert">
            <span><AlertCircle size={21} /></span>
            <div><strong>로컬 API에 연결할 수 없습니다</strong><p>{error}</p></div>
            <button type="button" onClick={() => void load()}><RefreshCw size={16} />다시 시도</button>
          </section>
        )}

        {!overview && !error && (
          <div className="loading-dashboard" aria-label="스케줄 정보를 불러오는 중">
            <div className="skeleton-row">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
            <div className="skeleton-panel" />
            <div className="skeleton-table" />
          </div>
        )}

        {overview && (
          <>
            <Summary schedules={overview.schedules} />
            <Timeline schedules={overview.schedules} onSelect={(item) => setSelectedId(item.id)} />
            <ScheduleTable
              schedules={overview.schedules}
              search={search}
              status={status}
              source={source}
              onSearch={setSearch}
              onStatus={setStatus}
              onSelect={(item) => setSelectedId(item.id)}
            />
            <footer className="app-footer">
              <span>127.0.0.1에서만 실행 중</span>
              <span className="footer-dot" />
              <span>30초마다 자동 동기화</span>
              <span className="footer-dot" />
              <span>시스템 범위는 조회 전용</span>
            </footer>
          </>
        )}
      </main>

      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          onClose={closeDetail}
          onAction={(action) => {
            setPending({ item: selectedItem, action });
            setSelectedId(null);
          }}
        />
      )}

      {pending && (
        <ConfirmDialog
          item={pending.item}
          action={pending.action}
          busy={actionBusy}
          onCancel={() => setPending(null)}
          onConfirm={() => void confirmAction()}
        />
      )}

      <div className={`toast-region ${toast ? "visible" : ""}`} aria-live="polite" aria-atomic="true">
        {toast && <div className={toast.error ? "toast error" : "toast"}><span />{toast.message}</div>}
      </div>
    </div>
  );
}
