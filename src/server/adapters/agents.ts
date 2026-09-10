import { access, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  LogsResponse,
  ScheduleItem,
  SourceId,
} from "../../shared/types.js";
import type { AdapterSnapshot, SchedulerAdapter } from "./types.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function scalar(content: string, key: string): string {
  const expression = new RegExp(`^${key}\\s*=\\s*["']([^"']*)["']`, "m");
  return content.match(expression)?.[1]?.trim() ?? "";
}

function displayText(value: string): string {
  return value.replace(/[\u2013\u2014]/g, ":");
}

export class AgentAdapter implements SchedulerAdapter {
  readonly id: SourceId;
  private readonly basePath: string;
  private readonly label: string;

  constructor(agent: "codex" | "claude") {
    this.id = agent;
    this.label = agent === "codex" ? "Codex" : "Claude";
    this.basePath = join(homedir(), agent === "codex" ? ".codex" : ".claude");
  }

  async collect(): Promise<AdapterSnapshot> {
    const installed = await exists(this.basePath);
    if (!installed) {
      return {
        source: {
          id: this.id,
          name: `${this.label} 스케줄`,
          shortName: this.label,
          status: "unavailable",
          count: 0,
          controllable: false,
          message: `${this.label} 로컬 디렉터리를 찾지 못했습니다.`,
        },
        schedules: [],
      };
    }

    const schedules = this.id === "codex" ? await this.readCodexAutomations() : [];
    return {
      source: {
        id: this.id,
        name: `${this.label} 스케줄`,
        shortName: this.label,
        status: schedules.length ? "connected" : "empty",
        count: schedules.length,
        controllable: false,
        message: schedules.length
          ? `${schedules.length}개의 로컬 자동화를 찾았습니다. 현재 조회 전용입니다.`
          : this.id === "claude"
            ? "로컬 디렉터리는 있지만 감지 가능한 예약 작업은 없습니다."
            : "로컬 디렉터리는 있지만 저장된 자동화는 없습니다.",
      },
      schedules,
    };
  }

  private async readCodexAutomations(): Promise<ScheduleItem[]> {
    const root = join(this.basePath, "automations");
    if (!(await exists(root))) return [];
    const directories = await readdir(root, { withFileTypes: true });
    const schedules: ScheduleItem[] = [];
    for (const directory of directories) {
      if (!directory.isDirectory()) continue;
      const file = join(root, directory.name, "automation.toml");
      try {
        const content = await readFile(file, "utf8");
        const name = scalar(content, "name") || directory.name;
        const prompt = scalar(content, "prompt");
        const schedule = scalar(content, "rrule") || scalar(content, "schedule") || "예약 정보 없음";
        const status = scalar(content, "status").toLowerCase();
        const enabled = status !== "paused" && status !== "disabled";
        schedules.push({
          id: `${this.id}:${directory.name}`,
          source: this.id,
          name,
          description: displayText(prompt || "Codex 자동화"),
          scope: "agent",
          state: enabled ? "idle" : "paused",
          enabled,
          controllable: false,
          canRun: false,
          schedule,
          nextRun: null,
          lastRun: null,
          lastResult: "unknown",
          command: prompt,
          controlHint: "공식 로컬 제어 계약이 없어 안전을 위해 조회 전용입니다.",
          metadata: { directory: directory.name },
        });
      } catch {
        continue;
      }
    }
    return schedules;
  }

  async action(): Promise<string> {
    throw new Error(`${this.label} 스케줄은 현재 조회 전용입니다.`);
  }

  async logs(): Promise<LogsResponse> {
    return {
      available: false,
      lines: [],
      message: `${this.label} 작업 로그 연결은 아직 지원하지 않습니다.`,
    };
  }
}
