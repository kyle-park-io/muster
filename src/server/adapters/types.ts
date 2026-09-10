import type {
  LogsResponse,
  ScheduleAction,
  ScheduleItem,
  SchedulerSource,
  SourceId,
} from "../../shared/types.js";

export interface AdapterSnapshot {
  source: SchedulerSource;
  schedules: ScheduleItem[];
}

export interface SchedulerAdapter {
  id: SourceId;
  collect(): Promise<AdapterSnapshot>;
  action(id: string, action: ScheduleAction): Promise<string>;
  logs(id: string): Promise<LogsResponse>;
}
