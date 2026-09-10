import type { SourceId } from "../../shared/types.js";
import { AgentAdapter } from "./agents.js";
import { CronAdapter } from "./cron.js";
import { SystemdAdapter } from "./systemd.js";
import type { SchedulerAdapter } from "./types.js";
import { WindowsTaskAdapter } from "./windows.js";
import { detectPlatform } from "../platform.js";

const platform = detectPlatform();
const supportsWindows = platform.id === "windows" || platform.id === "wsl";
const supportsSystemd = platform.id === "linux" || platform.id === "wsl";
const supportsCron = platform.id !== "windows";

export const adapters: SchedulerAdapter[] = [
  ...(supportsWindows ? [new WindowsTaskAdapter()] : []),
  ...(supportsSystemd ? [new SystemdAdapter("user"), new SystemdAdapter("system")] : []),
  ...(supportsCron ? [new CronAdapter()] : []),
  new AgentAdapter("claude"),
  new AgentAdapter("codex"),
];

export function findAdapter(id: string): SchedulerAdapter | undefined {
  const source = id.split(":", 1)[0] as SourceId;
  return adapters.find((adapter) => adapter.id === source);
}
