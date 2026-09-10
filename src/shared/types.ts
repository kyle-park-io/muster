export type SourceId =
  | "systemd-user"
  | "systemd-system"
  | "cron"
  | "codex"
  | "claude";

export type ScheduleState = "running" | "idle" | "paused" | "failed" | "unknown";

export type SourceStatus = "connected" | "empty" | "unavailable" | "error";

export interface SchedulerSource {
  id: SourceId;
  name: string;
  shortName: string;
  status: SourceStatus;
  count: number;
  controllable: boolean;
  message: string;
}

export interface ScheduleItem {
  id: string;
  source: SourceId;
  name: string;
  description: string;
  scope: "user" | "system" | "agent";
  state: ScheduleState;
  enabled: boolean;
  controllable: boolean;
  canRun: boolean;
  schedule: string;
  nextRun: string | null;
  lastRun: string | null;
  lastResult: "success" | "failure" | "unknown";
  command: string;
  controlHint: string;
  metadata: Record<string, string>;
}

export interface OverviewResponse {
  generatedAt: string;
  hostname: string;
  timezone: string;
  sources: SchedulerSource[];
  schedules: ScheduleItem[];
}

export type ScheduleAction = "enable" | "disable" | "run";

export interface ActionResponse {
  ok: boolean;
  message: string;
}

export interface LogsResponse {
  lines: string[];
  available: boolean;
  message: string;
}
