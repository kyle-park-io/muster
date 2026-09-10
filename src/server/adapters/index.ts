import { homedir } from "node:os";
import { join } from "node:path";
import { AgentAdapter } from "./agents.js";
import { CronAdapter } from "./cron.js";
import { SystemdAdapter } from "./systemd.js";
import type { SchedulerAdapter } from "./types.js";
import { WindowsTaskAdapter } from "./windows.js";
import { detectPlatform } from "../platform.js";
import { windowsAgentHome } from "../windows-home.js";

const platform = detectPlatform();
const supportsWindows = platform.id === "windows" || platform.id === "wsl";
const supportsSystemd = platform.id === "linux" || platform.id === "wsl";
const supportsCron = platform.id !== "windows";

export const adapters: SchedulerAdapter[] = [
  ...(supportsWindows ? [new WindowsTaskAdapter()] : []),
  ...(supportsSystemd ? [
    new SystemdAdapter("user", platform.id),
    new SystemdAdapter("system", platform.id),
  ] : []),
  ...(supportsCron ? [new CronAdapter(platform.id)] : []),
  ...(supportsWindows ? [
    new AgentAdapter("claude", "windows", () => windowsAgentHome(platform.id, ".claude")),
    new AgentAdapter("codex", "windows", () => windowsAgentHome(platform.id, ".codex")),
  ] : []),
  ...(platform.id !== "windows" ? [
    new AgentAdapter("claude", platform.id, join(homedir(), ".claude")),
    new AgentAdapter("codex", platform.id, join(homedir(), ".codex")),
  ] : []),
];

export function findAdapter(id: string): SchedulerAdapter | undefined {
  return adapters.find((adapter) => id.startsWith(`${adapter.key}:`));
}
