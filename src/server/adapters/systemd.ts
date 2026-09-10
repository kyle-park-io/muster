import type {
  LogsResponse,
  ScheduleAction,
  ScheduleItem,
  SourceId,
} from "../../shared/types.js";
import { commandError, runCommand } from "../command.js";
import type { AdapterSnapshot, SchedulerAdapter } from "./types.js";

interface TimerRow {
  next: number | null;
  last: number;
  unit: string;
  activates: string;
}

type UnitProperties = Record<string, string>;

const UNIT_PATTERN = /^[A-Za-z0-9_.:@\\-]+\.(timer|service)$/;

function toIso(microseconds: number | null | undefined): string | null {
  if (!microseconds) return null;
  const date = new Date(microseconds / 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseBlocks(output: string): Map<string, UnitProperties> {
  const result = new Map<string, UnitProperties>();
  for (const block of output.trim().split(/\n\s*\n/)) {
    const properties: UnitProperties = {};
    for (const line of block.split("\n")) {
      const separator = line.indexOf("=");
      if (separator < 0) continue;
      properties[line.slice(0, separator)] = line.slice(separator + 1);
    }
    if (properties.Id) result.set(properties.Id, properties);
  }
  return result;
}

function calendarLabel(properties: UnitProperties): string {
  const calendar = properties.TimersCalendar?.match(/OnCalendar=([^;}]*)/)?.[1]?.trim();
  if (calendar) return calendar;
  const monotonic = properties.TimersMonotonic?.match(/On\w+=([^;}]*)/)?.[1]?.trim();
  return monotonic || "systemd timer";
}

function execLabel(raw = ""): string {
  const argv = raw.match(/argv\[\]=([^;}]*)/)?.[1]?.trim();
  const path = raw.match(/path=([^;}]*)/)?.[1]?.trim();
  return argv || path || "";
}

function displayText(value: string): string {
  return value.replace(/[\u2013\u2014]/g, ":");
}

export class SystemdAdapter implements SchedulerAdapter {
  readonly id: SourceId;
  private readonly user: boolean;

  constructor(scope: "user" | "system") {
    this.user = scope === "user";
    this.id = this.user ? "systemd-user" : "systemd-system";
  }

  private args(...args: string[]): string[] {
    return this.user ? ["--user", ...args] : args;
  }

  async collect(): Promise<AdapterSnapshot> {
    const label = this.user ? "사용자 systemd" : "시스템 systemd";
    try {
      const list = await runCommand(
        "systemctl",
        this.args("list-timers", "--all", "--no-pager", "--output=json"),
      );
      if (list.exitCode !== 0) throw new Error(commandError(list));

      const rows = JSON.parse(list.stdout) as TimerRow[];
      const timerNames = rows.map((row) => row.unit).filter((name) => UNIT_PATTERN.test(name));
      const serviceNames = rows
        .map((row) => row.activates)
        .filter((name) => UNIT_PATTERN.test(name));

      const timerProperties = timerNames.length
        ? await runCommand(
            "systemctl",
            this.args(
              "show",
              ...timerNames,
              "--property=Id,Description,LoadState,ActiveState,UnitFileState,TimersCalendar,TimersMonotonic",
              "--no-pager",
            ),
          )
        : { stdout: "", stderr: "", exitCode: 0 };
      const serviceProperties = serviceNames.length
        ? await runCommand(
            "systemctl",
            this.args(
              "show",
              ...serviceNames,
              "--property=Id,Result,ExecStart",
              "--no-pager",
            ),
          )
        : { stdout: "", stderr: "", exitCode: 0 };

      const timers = parseBlocks(timerProperties.stdout);
      const services = parseBlocks(serviceProperties.stdout);
      const schedules: ScheduleItem[] = rows.map((row) => {
        const timer = timers.get(row.unit) ?? {};
        const service = services.get(row.activates) ?? {};
        const enabled = timer.UnitFileState === "enabled" || timer.UnitFileState === "static";
        const failed = service.Result === "failed" || timer.ActiveState === "failed";
        return {
          id: `${this.id}:${row.unit}`,
          source: this.id,
          name: row.unit.replace(/\.timer$/, ""),
          description: displayText(timer.Description || row.activates),
          scope: this.user ? "user" : "system",
          state: failed ? "failed" : enabled ? "idle" : "paused",
          enabled,
          controllable: this.user,
          canRun: this.user,
          schedule: calendarLabel(timer),
          nextRun: toIso(row.next),
          lastRun: toIso(row.last),
          lastResult:
            service.Result === "success"
              ? "success"
              : service.Result === "failed"
                ? "failure"
                : "unknown",
          command: execLabel(service.ExecStart),
          controlHint: this.user
            ? "사용자 범위 timer는 Muster에서 제어할 수 있습니다."
            : "시스템 범위 timer는 현재 조회 전용입니다.",
          metadata: {
            timer: row.unit,
            service: row.activates,
            unitFileState: timer.UnitFileState || "unknown",
          },
        };
      });

      return {
        source: {
          id: this.id,
          name: label,
          shortName: this.user ? "User" : "System",
          status: schedules.length ? "connected" : "empty",
          count: schedules.length,
          controllable: this.user,
          message: schedules.length
            ? `${schedules.length}개의 timer를 찾았습니다.`
            : "등록된 timer가 없습니다.",
        },
        schedules,
      };
    } catch (error) {
      return {
        source: {
          id: this.id,
          name: label,
          shortName: this.user ? "User" : "System",
          status: "error",
          count: 0,
          controllable: this.user,
          message: error instanceof Error ? error.message : "systemd를 읽지 못했습니다.",
        },
        schedules: [],
      };
    }
  }

  async action(id: string, action: ScheduleAction): Promise<string> {
    if (!this.user) throw new Error("시스템 timer는 조회 전용입니다.");
    const unit = id.slice(`${this.id}:`.length);
    if (!UNIT_PATTERN.test(unit) || !unit.endsWith(".timer")) {
      throw new Error("올바르지 않은 systemd unit입니다.");
    }

    let args: string[];
    if (action === "run") {
      const service = unit.replace(/\.timer$/, ".service");
      args = this.args("start", service);
    } else {
      args = this.args(action, "--now", unit);
    }
    const result = await runCommand("systemctl", args, { timeoutMs: 20_000 });
    if (result.exitCode !== 0) throw new Error(commandError(result));

    if (action === "run") return `${unit.replace(/\.timer$/, ".service")} 실행을 요청했습니다.`;
    return `${unit}를 ${action === "enable" ? "켰습니다" : "껐습니다"}.`;
  }

  async logs(id: string): Promise<LogsResponse> {
    const unit = id.slice(`${this.id}:`.length).replace(/\.timer$/, ".service");
    if (!UNIT_PATTERN.test(unit)) throw new Error("올바르지 않은 systemd unit입니다.");
    const result = await runCommand(
      "journalctl",
      [...(this.user ? ["--user"] : []), "-u", unit, "-n", "80", "--no-pager", "--output=short-iso"],
    );
    if (result.exitCode !== 0) {
      return { available: false, lines: [], message: commandError(result) };
    }
    const lines = result.stdout.split("\n").filter(Boolean);
    return {
      available: lines.length > 0,
      lines,
      message: lines.length ? "최근 로그 80줄입니다." : "표시할 로그가 없습니다.",
    };
  }
}
