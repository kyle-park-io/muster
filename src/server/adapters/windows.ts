import { createHash } from "node:crypto";
import type {
  LogsResponse,
  ScheduleAction,
  ScheduleItem,
} from "../../shared/types.js";
import { commandError, runCommand } from "../command.js";
import type { AdapterSnapshot, SchedulerAdapter } from "./types.js";

interface WindowsAction {
  Execute?: string | null;
  Arguments?: string | null;
}

interface WindowsTrigger {
  Type?: string | null;
  StartBoundary?: string | null;
  Interval?: string | null;
}

interface WindowsTask {
  TaskName: string;
  TaskPath: string;
  State: string;
  Enabled: boolean;
  UserId?: string | null;
  Author?: string | null;
  Actions?: WindowsAction[] | WindowsAction | null;
  Triggers?: WindowsTrigger[] | WindowsTrigger | null;
  NextRunTime?: string | null;
  LastRunTime?: string | null;
  LastTaskResult?: number | null;
}

interface WindowsTaskPayload {
  CurrentUser: string;
  Tasks: WindowsTask[] | WindowsTask | null;
}

const QUERY_SCRIPT = String.raw`
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$tasks = @(Get-ScheduledTask | ForEach-Object {
  $task = $_
  $info = $task | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue
  [pscustomobject]@{
    TaskName = $task.TaskName
    TaskPath = $task.TaskPath
    State = [string]$task.State
    Enabled = [bool]$task.Settings.Enabled
    UserId = $task.Principal.UserId
    Author = $task.Author
    Actions = @($task.Actions | ForEach-Object {
      [pscustomobject]@{ Execute = $_.Execute; Arguments = $_.Arguments }
    })
    Triggers = @($task.Triggers | ForEach-Object {
      [pscustomobject]@{
        Type = $_.CimClass.CimClassName
        StartBoundary = $_.StartBoundary
        Interval = $_.Repetition.Interval
      }
    })
    NextRunTime = $(if ($info -and $info.NextRunTime.Year -gt 2000) { $info.NextRunTime.ToString('o') } else { $null })
    LastRunTime = $(if ($info -and $info.LastRunTime.Year -gt 2000) { $info.LastRunTime.ToString('o') } else { $null })
    LastTaskResult = $(if ($info) { $info.LastTaskResult } else { $null })
  }
})
[pscustomobject]@{ CurrentUser = $currentUser; Tasks = $tasks } | ConvertTo-Json -Compress -Depth 6
`;

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function fingerprint(task: Pick<WindowsTask, "TaskPath" | "TaskName">): string {
  return createHash("sha256")
    .update(`${task.TaskPath}\0${task.TaskName}`)
    .digest("hex")
    .slice(0, 16);
}

function displayText(value: string): string {
  return value.replace(/[\u2013\u2014]/g, ":");
}

function toIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function triggerName(type = ""): string {
  if (type.includes("Daily")) return "매일";
  if (type.includes("Weekly")) return "매주";
  if (type.includes("Monthly")) return "매월";
  if (type.includes("Logon")) return "로그온 시";
  if (type.includes("Boot")) return "Windows 시작 시";
  if (type.includes("Idle")) return "유휴 시";
  if (type.includes("Event")) return "이벤트 발생 시";
  if (type.includes("Time")) return "지정 시간";
  return "사용자 지정";
}

export function windowsScheduleLabel(triggers: WindowsTrigger[] | WindowsTrigger | null | undefined): string {
  const labels = asArray(triggers).map((trigger) => {
    const name = triggerName(trigger.Type ?? "");
    const time = trigger.StartBoundary?.match(/T(\d{2}:\d{2})/)?.[1];
    const interval = trigger.Interval ? ` · ${trigger.Interval}` : "";
    return `${name}${time ? ` ${time}` : ""}${interval}`;
  });
  return [...new Set(labels)].join(", ") || "트리거 없음";
}

export function isUserOwnedWindowsTask(task: WindowsTask, currentUser: string): boolean {
  if (task.TaskPath.toLocaleLowerCase().startsWith("\\microsoft\\")) return false;
  if (!task.UserId) return false;
  const principal = task.UserId.toLocaleLowerCase();
  const user = currentUser.toLocaleLowerCase();
  const shortUser = user.split("\\").at(-1);
  return principal === user || principal === shortUser || principal.endsWith(`\\${shortUser}`);
}

function quotePowerShell(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export class WindowsTaskAdapter implements SchedulerAdapter {
  readonly id = "windows-task" as const;
  readonly environment = "windows" as const;
  readonly key = `${this.id}:${this.environment}`;

  private async readTasks(): Promise<WindowsTaskPayload> {
    const result = await runCommand(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", QUERY_SCRIPT],
      { timeoutMs: 45_000 },
    );
    if (result.exitCode !== 0) throw new Error(commandError(result));
    const output = result.stdout.trim().replace(/^\uFEFF/, "").replaceAll("\r", "");
    return JSON.parse(output) as WindowsTaskPayload;
  }

  async collect(): Promise<AdapterSnapshot> {
    try {
      const payload = await this.readTasks();
      const tasks = asArray(payload.Tasks);
      const schedules: ScheduleItem[] = tasks.map((task) => {
        const controllable = isUserOwnedWindowsTask(task, payload.CurrentUser);
        const state = task.State.toLocaleLowerCase();
        const command = asArray(task.Actions)
          .map((action) => [action.Execute, action.Arguments].filter(Boolean).join(" "))
          .join("; ");
        const lastRun = toIso(task.LastRunTime);
        return {
          id: `${this.key}:${fingerprint(task)}`,
          source: this.id,
          environment: this.environment,
          name: task.TaskName,
          description: displayText(task.Author || `${task.TaskPath}${task.TaskName}`),
          scope: "windows",
          state: !task.Enabled || state === "disabled"
            ? "paused"
            : state === "running"
              ? "running"
              : "idle",
          enabled: task.Enabled && state !== "disabled",
          controllable,
          canRun: controllable,
          schedule: windowsScheduleLabel(task.Triggers),
          nextRun: toIso(task.NextRunTime),
          lastRun,
          lastResult: !lastRun || task.LastTaskResult == null
            ? "unknown"
            : task.LastTaskResult === 0
              ? "success"
              : "failure",
          command,
          controlHint: controllable
            ? "현재 Windows 사용자 소유 작업은 Muster에서 제어할 수 있습니다."
            : "Microsoft 또는 시스템 작업은 안전을 위해 조회 전용입니다.",
          metadata: {
            taskName: task.TaskName,
            taskPath: task.TaskPath,
            principal: task.UserId || "unknown",
            author: task.Author || "unknown",
          },
        };
      });

      return {
        source: {
          id: this.id,
          environment: this.environment,
          name: "Windows Task Scheduler",
          shortName: "Tasks",
          status: schedules.length ? "connected" : "empty",
          count: schedules.length,
          controllable: schedules.some((item) => item.controllable),
          message: schedules.length
            ? `${schedules.length}개의 Windows 작업을 찾았습니다.`
            : "등록된 Windows 예약 작업이 없습니다.",
        },
        schedules,
      };
    } catch (error) {
      return {
        source: {
          id: this.id,
          environment: this.environment,
          name: "Windows Task Scheduler",
          shortName: "Tasks",
          status: "error",
          count: 0,
          controllable: false,
          message: error instanceof Error ? error.message : "Windows 예약 작업을 읽지 못했습니다.",
        },
        schedules: [],
      };
    }
  }

  private async resolve(id: string): Promise<{ task: WindowsTask; currentUser: string }> {
    const target = id.slice(`${this.key}:`.length);
    if (!/^[a-f0-9]{16}$/.test(target)) throw new Error("올바르지 않은 Windows 작업입니다.");
    const payload = await this.readTasks();
    const task = asArray(payload.Tasks).find((item) => fingerprint(item) === target);
    if (!task) throw new Error("Windows 작업이 변경되었거나 존재하지 않습니다.");
    return { task, currentUser: payload.CurrentUser };
  }

  async action(id: string, action: ScheduleAction): Promise<string> {
    const { task, currentUser } = await this.resolve(id);
    if (!isUserOwnedWindowsTask(task, currentUser)) {
      throw new Error("Microsoft 또는 시스템 작업은 조회 전용입니다.");
    }
    const cmdlet = action === "run"
      ? "Start-ScheduledTask"
      : action === "enable"
        ? "Enable-ScheduledTask"
        : "Disable-ScheduledTask";
    const script = [
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
      "$ErrorActionPreference = 'Stop'",
      `${cmdlet} -TaskName ${quotePowerShell(task.TaskName)} -TaskPath ${quotePowerShell(task.TaskPath)} | Out-Null`,
    ].join("\n");
    const result = await runCommand(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeoutMs: 30_000 },
    );
    if (result.exitCode !== 0) throw new Error(commandError(result));
    if (action === "run") return `${task.TaskName} 실행을 요청했습니다.`;
    return `${task.TaskName} 작업을 ${action === "enable" ? "켰습니다" : "껐습니다"}.`;
  }

  async logs(): Promise<LogsResponse> {
    return {
      available: false,
      lines: [],
      message: "Windows Task Scheduler 이벤트 로그 연결은 준비 중입니다.",
    };
  }
}
