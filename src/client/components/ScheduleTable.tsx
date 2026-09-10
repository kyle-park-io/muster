import { ChevronRight, Filter, Search, SlidersHorizontal } from "lucide-react";
import type { EnvironmentId, ScheduleItem, ScheduleState, SourceId } from "../../shared/types";
import { environmentNames, formatDate, relativeDate, sourceNames, stateNames } from "../format";

export type StatusFilter = "all" | "enabled" | "paused" | "failed";

interface ScheduleTableProps {
  schedules: ScheduleItem[];
  search: string;
  status: StatusFilter;
  source: SourceId | "all";
  environment: EnvironmentId | "all";
  onSearch: (value: string) => void;
  onStatus: (value: StatusFilter) => void;
  onSelect: (item: ScheduleItem) => void;
}

const statuses: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "enabled", label: "활성" },
  { id: "paused", label: "꺼짐" },
  { id: "failed", label: "실패" },
];

function StateBadge({ state }: { state: ScheduleState }) {
  return (
    <span className={`state-badge state-${state}`}>
      <i />
      {stateNames[state]}
    </span>
  );
}

export function ScheduleTable({
  schedules,
  search,
  status,
  source,
  environment,
  onSearch,
  onStatus,
  onSelect,
}: ScheduleTableProps) {
  const normalizedSearch = search.trim().toLocaleLowerCase("ko");
  const filtered = schedules.filter((item) => {
    if (source !== "all" && item.source !== source) return false;
    if (environment !== "all" && item.environment !== environment) return false;
    if (status === "enabled" && !item.enabled) return false;
    if (status === "paused" && item.enabled) return false;
    if (status === "failed" && item.state !== "failed") return false;
    if (!normalizedSearch) return true;
    return [item.name, item.description, item.command, item.schedule]
      .join(" ")
      .toLocaleLowerCase("ko")
      .includes(normalizedSearch);
  });

  return (
    <section className="panel schedules-panel" aria-labelledby="schedules-heading">
      <div className="panel-heading schedule-heading">
        <div>
          <p className="eyebrow">ALL SCHEDULES</p>
          <h2 id="schedules-heading">스케줄 목록</h2>
        </div>
        <span className="count-badge">{filtered.length}</span>
      </div>

      <div className="table-toolbar">
        <label className="search-box">
          <Search size={16} />
          <span className="sr-only">스케줄 검색</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="이름, 명령어 검색"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="status-tabs" aria-label="상태 필터">
          {statuses.map((item) => (
            <button
              type="button"
              className={status === item.id ? "selected" : ""}
              aria-pressed={status === item.id}
              onClick={() => onStatus(item.id)}
              key={item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="filter-button" type="button" aria-label="필터 옵션" disabled>
          <SlidersHorizontal size={16} />
          <span>필터</span>
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">이름</th>
              <th scope="col">소스</th>
              <th scope="col">상태</th>
              <th scope="col">주기</th>
              <th scope="col">다음 실행</th>
              <th scope="col"><span className="sr-only">상세 보기</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="name-cell">
                  <button type="button" onClick={() => onSelect(item)}>
                    <span className={`source-glyph source-${item.source}`} aria-hidden="true">
                      {item.source.startsWith("systemd") ? "S" : item.source === "cron" ? "C" : "A"}
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="source-origin">
                    <span className={`environment-badge environment-${item.environment}`}>
                      {environmentNames[item.environment]}
                    </span>
                    <span className="source-name">{sourceNames[item.source]}</span>
                  </span>
                </td>
                <td><StateBadge state={item.state} /></td>
                <td><code className="schedule-code">{item.schedule}</code></td>
                <td>
                  <div className="next-run">
                    <strong>{relativeDate(item.nextRun)}</strong>
                    <small>{formatDate(item.nextRun)}</small>
                  </div>
                </td>
                <td>
                  <button
                    className="row-action"
                    type="button"
                    onClick={() => onSelect(item)}
                    aria-label={`${item.name} 상세 보기`}
                  >
                    <ChevronRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length && (
        <div className="empty-list">
          <span><Filter size={20} /></span>
          <strong>조건에 맞는 스케줄이 없습니다</strong>
          <p>검색어나 필터를 바꿔보세요.</p>
        </div>
      )}
    </section>
  );
}
