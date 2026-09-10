import { Bot, Clock3, Cpu, MonitorCog, TerminalSquare } from "lucide-react";
import type { SchedulerSource, SourceId } from "../../shared/types";

interface SourceStripProps {
  sources: SchedulerSource[];
  selected: SourceId | "all";
  onSelect: (source: SourceId | "all") => void;
}

const iconMap = {
  "windows-task": MonitorCog,
  "systemd-user": Cpu,
  "systemd-system": TerminalSquare,
  cron: Clock3,
  codex: Bot,
  claude: Bot,
};

export function SourceStrip({ sources, selected, onSelect }: SourceStripProps) {
  const total = sources.reduce((sum, source) => sum + source.count, 0);
  return (
    <nav className="source-strip" aria-label="스케줄 소스">
      <button
        className={`source-pill ${selected === "all" ? "selected" : ""}`}
        type="button"
        onClick={() => onSelect("all")}
      >
        <span className="source-icon all-source">M</span>
        <span>
          <strong>전체</strong>
          <small>{total}개</small>
        </span>
      </button>
      {sources.map((source) => {
        const Icon = iconMap[source.id];
        return (
          <button
            className={`source-pill ${selected === source.id ? "selected" : ""}`}
            type="button"
            onClick={() => onSelect(source.id)}
            key={source.id}
            title={source.message}
          >
            <span className={`source-icon source-${source.id}`}><Icon size={16} /></span>
            <span>
              <strong>{source.shortName}</strong>
              <small>{source.count}개</small>
            </span>
            <i className={`connection-dot ${source.status}`} aria-label={source.message} />
          </button>
        );
      })}
    </nav>
  );
}
