import { Bot, Clock3, Cpu, MonitorCog, TerminalSquare } from "lucide-react";
import type {
  EnvironmentId,
  SchedulerSource,
  SourceId,
  SourceStatus,
} from "../../shared/types";
import { environmentNames } from "../format";

interface SourceStripProps {
  sources: SchedulerSource[];
  selectedSource: SourceId | "all";
  selectedEnvironment: EnvironmentId | "all";
  onSourceSelect: (source: SourceId | "all") => void;
  onEnvironmentSelect: (environment: EnvironmentId | "all") => void;
}

const iconMap = {
  "windows-task": MonitorCog,
  "systemd-user": Cpu,
  "systemd-system": TerminalSquare,
  cron: Clock3,
  codex: Bot,
  claude: Bot,
};

const sourceOrder: SourceId[] = [
  "windows-task",
  "systemd-user",
  "systemd-system",
  "cron",
  "claude",
  "codex",
];

const environmentOrder: EnvironmentId[] = ["windows", "wsl", "macos", "linux", "unknown"];

function combinedStatus(statuses: SourceStatus[]): SourceStatus {
  if (statuses.includes("connected")) return "connected";
  if (statuses.includes("empty")) return "empty";
  if (statuses.includes("error")) return "error";
  return "unavailable";
}

export function SourceStrip({
  sources,
  selectedSource,
  selectedEnvironment,
  onSourceSelect,
  onEnvironmentSelect,
}: SourceStripProps) {
  const environments = environmentOrder.filter((environment) =>
    sources.some((source) => source.environment === environment));
  const environmentSources = selectedEnvironment === "all"
    ? sources
    : sources.filter((source) => source.environment === selectedEnvironment);
  const groupedSources = sourceOrder.flatMap((id) => {
    const matching = environmentSources.filter((source) => source.id === id);
    if (!matching.length) return [];
    const first = matching[0];
    return [{
      ...first,
      count: matching.reduce((sum, source) => sum + source.count, 0),
      controllable: matching.some((source) => source.controllable),
      status: combinedStatus(matching.map((source) => source.status)),
      message: matching.map((source) => `${environmentNames[source.environment]}: ${source.message}`).join("\n"),
    }];
  });
  const visibleTotal = environmentSources.reduce((sum, source) => sum + source.count, 0);

  return (
    <section className="filter-stack" aria-label="스케줄 분류">
      <nav className="environment-strip" aria-label="실행 환경 필터">
        <span className="filter-label">환경</span>
        <button
          className={selectedEnvironment === "all" ? "selected" : ""}
          type="button"
          aria-pressed={selectedEnvironment === "all"}
          onClick={() => onEnvironmentSelect("all")}
        >
          전체 <small>{sources.reduce((sum, source) => sum + source.count, 0)}</small>
        </button>
        {environments.map((environment) => {
          const count = sources
            .filter((source) => source.environment === environment)
            .reduce((sum, source) => sum + source.count, 0);
          return (
            <button
              className={`environment-${environment} ${selectedEnvironment === environment ? "selected" : ""}`}
              type="button"
              aria-pressed={selectedEnvironment === environment}
              onClick={() => onEnvironmentSelect(environment)}
              key={environment}
            >
              {environmentNames[environment]} <small>{count}</small>
            </button>
          );
        })}
      </nav>

      <nav className="source-strip" aria-label="스케줄 소스 필터">
        <span className="filter-label">소스</span>
        <button
          className={`source-pill ${selectedSource === "all" ? "selected" : ""}`}
          type="button"
          aria-pressed={selectedSource === "all"}
          onClick={() => onSourceSelect("all")}
        >
          <span className="source-icon all-source">M</span>
          <span><strong>전체</strong><small>{visibleTotal}개</small></span>
        </button>
        {groupedSources.map((source) => {
          const Icon = iconMap[source.id];
          return (
            <button
              className={`source-pill ${selectedSource === source.id ? "selected" : ""}`}
              type="button"
              aria-pressed={selectedSource === source.id}
              onClick={() => onSourceSelect(source.id)}
              key={source.id}
              title={source.message}
            >
              <span className={`source-icon source-${source.id}`}><Icon size={16} /></span>
              <span><strong>{source.shortName}</strong><small>{source.count}개</small></span>
              <i className={`connection-dot ${source.status}`} aria-label={source.message} />
            </button>
          );
        })}
      </nav>
    </section>
  );
}
