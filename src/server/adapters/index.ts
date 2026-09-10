import type { SourceId } from "../../shared/types.js";
import { AgentAdapter } from "./agents.js";
import { CronAdapter } from "./cron.js";
import { SystemdAdapter } from "./systemd.js";
import type { SchedulerAdapter } from "./types.js";

export const adapters: SchedulerAdapter[] = [
  new SystemdAdapter("user"),
  new SystemdAdapter("system"),
  new CronAdapter(),
  new AgentAdapter("codex"),
  new AgentAdapter("claude"),
];

export function findAdapter(id: string): SchedulerAdapter | undefined {
  const source = id.split(":", 1)[0] as SourceId;
  return adapters.find((adapter) => adapter.id === source);
}
