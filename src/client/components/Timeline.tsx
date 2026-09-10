import { ArrowUpRight, Clock3 } from "lucide-react";
import type { ScheduleItem } from "../../shared/types";
import { formatDate, formatTime, relativeDate, sourceNames } from "../format";

interface TimelineProps {
  schedules: ScheduleItem[];
  onSelect: (item: ScheduleItem) => void;
}

export function Timeline({ schedules, onSelect }: TimelineProps) {
  const upcoming = schedules
    .filter((item) => item.enabled && item.nextRun && new Date(item.nextRun).getTime() > Date.now())
    .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())
    .slice(0, 5);

  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">UP NEXT</p>
          <h2 id="timeline-heading">다가오는 실행</h2>
        </div>
        <span className="section-meta">로컬 시간</span>
      </div>
      {upcoming.length ? (
        <ol className="timeline-list">
          {upcoming.map((item, index) => (
            <li key={item.id}>
              <div className="timeline-rail">
                <span className={index === 0 ? "next" : ""} />
              </div>
              <time dateTime={item.nextRun || undefined}>
                <strong>{formatTime(item.nextRun)}</strong>
                <small>{relativeDate(item.nextRun)}</small>
              </time>
              <button type="button" className="timeline-item" onClick={() => onSelect(item)}>
                <span className={`mini-source source-${item.source}`}>{sourceNames[item.source]}</span>
                <strong>{item.name}</strong>
                <small>{formatDate(item.nextRun)}</small>
                <ArrowUpRight size={15} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="timeline-empty">
          <Clock3 size={21} />
          <p>예정된 실행이 없습니다.</p>
        </div>
      )}
    </section>
  );
}
