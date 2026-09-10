import type {
  LogsResponse,
  ScheduleAction,
  ScheduleItem,
  SchedulerSource,
  SourceId,
  EnvironmentId,
} from "../../shared/types.js";

export interface AdapterSnapshot {
  source: SchedulerSource;
  schedules: ScheduleItem[];
}

export interface SchedulerAdapter {
  id: SourceId;
  key: string;
  environment: EnvironmentId;
  collect(): Promise<AdapterSnapshot>;
  action(id: string, action: ScheduleAction): Promise<string>;
  logs(id: string): Promise<LogsResponse>;
}
