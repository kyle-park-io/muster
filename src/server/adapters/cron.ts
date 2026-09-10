import { createHash } from "node:crypto";
import type {
  LogsResponse,
  ScheduleAction,
  ScheduleItem,
} from "../../shared/types.js";
import { commandError, runCommand } from "../command.js";
import type { AdapterSnapshot, SchedulerAdapter } from "./types.js";

const PAUSED_PREFIX = "# muster:paused:";

interface CronEntry {
  hash: string;
  raw: string;
  schedule: string;
  command: string;
  enabled: boolean;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function parseLine(line: string): Omit<CronEntry, "hash" | "raw" | "enabled"> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith("@")) {
    const [schedule, ...command] = trimmed.split(/\s+/);
    if (!schedule || command.length === 0) return null;
    return { schedule, command: command.join(" ") };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length < 6) return null;
  return { schedule: parts.slice(0, 5).join(" "), command: parts.slice(5).join(" ") };
}

export function parseCrontab(content: string): CronEntry[] {
  const entries: CronEntry[] = [];
  for (const line of content.split("\n")) {
    if (line.startsWith(PAUSED_PREFIX)) {
      const marker = line.slice(PAUSED_PREFIX.length);
      const separator = marker.indexOf(":");
      if (separator < 0) continue;
      const storedHash = marker.slice(0, separator);
      try {
        const raw = Buffer.from(marker.slice(separator + 1), "base64url").toString("utf8");
        const parsed = parseLine(raw);
        if (parsed && fingerprint(raw) === storedHash) {
          entries.push({ ...parsed, hash: storedHash, raw, enabled: false });
        }
      } catch {
        continue;
      }
      continue;
    }
    const parsed = parseLine(line);
    if (parsed) entries.push({ ...parsed, hash: fingerprint(line), raw: line, enabled: true });
  }
  return entries;
}

async function readCrontab(): Promise<{ content: string; unavailable: boolean }> {
  const result = await runCommand("crontab", ["-l"]);
  if (result.exitCode === 0) return { content: result.stdout, unavailable: false };
  if (/no crontab for/i.test(result.stderr)) return { content: "", unavailable: false };
  return { content: "", unavailable: true };
}

export class CronAdapter implements SchedulerAdapter {
  readonly id = "cron" as const;

  async collect(): Promise<AdapterSnapshot> {
    try {
      const { content, unavailable } = await readCrontab();
      if (unavailable) throw new Error("사용자 crontab을 읽을 수 없습니다.");
      const entries = parseCrontab(content);
      const schedules: ScheduleItem[] = entries.map((entry, index) => ({
        id: `${this.id}:${entry.hash}`,
        source: this.id,
        name: `cron 작업 ${index + 1}`,
        description: entry.command,
        scope: "user",
        state: entry.enabled ? "idle" : "paused",
        enabled: entry.enabled,
        controllable: true,
        canRun: true,
        schedule: entry.schedule,
        nextRun: null,
        lastRun: null,
        lastResult: "unknown",
        command: entry.command,
        controlHint: "Muster가 원본 crontab 행을 보존하며 켜고 끕니다.",
        metadata: { fingerprint: entry.hash },
      }));
      return {
        source: {
          id: this.id,
          name: "사용자 crontab",
          shortName: "Cron",
          status: schedules.length ? "connected" : "empty",
          count: schedules.length,
          controllable: true,
          message: schedules.length
            ? `${schedules.length}개의 작업을 찾았습니다.`
            : "등록된 사용자 cron 작업이 없습니다.",
        },
        schedules,
      };
    } catch (error) {
      return {
        source: {
          id: this.id,
          name: "사용자 crontab",
          shortName: "Cron",
          status: "error",
          count: 0,
          controllable: true,
          message: error instanceof Error ? error.message : "crontab을 읽지 못했습니다.",
        },
        schedules: [],
      };
    }
  }

  async action(id: string, action: ScheduleAction): Promise<string> {
    const targetHash = id.slice(`${this.id}:`.length);
    if (!/^[a-f0-9]{16}$/.test(targetHash)) throw new Error("올바르지 않은 cron 작업입니다.");
    const { content, unavailable } = await readCrontab();
    if (unavailable) throw new Error("사용자 crontab을 읽을 수 없습니다.");
    const entry = parseCrontab(content).find((item) => item.hash === targetHash);
    if (!entry) throw new Error("cron 작업이 변경되었거나 존재하지 않습니다.");

    if (action === "run") {
      const result = await runCommand("/bin/sh", ["-lc", entry.command], { timeoutMs: 60_000 });
      if (result.exitCode !== 0) throw new Error(commandError(result));
      return "cron 명령을 실행했습니다.";
    }

    const shouldEnable = action === "enable";
    if (entry.enabled === shouldEnable) {
      return shouldEnable ? "이미 켜져 있습니다." : "이미 꺼져 있습니다.";
    }

    const lines = content.replace(/\n$/, "").split("\n");
    const replacement = shouldEnable
      ? entry.raw
      : `${PAUSED_PREFIX}${entry.hash}:${Buffer.from(entry.raw).toString("base64url")}`;
    const nextLines = lines.map((line) => {
      if (shouldEnable && line.startsWith(`${PAUSED_PREFIX}${entry.hash}:`)) return replacement;
      if (!shouldEnable && line === entry.raw) return replacement;
      return line;
    });
    const result = await runCommand("crontab", ["-"], { input: `${nextLines.join("\n")}\n` });
    if (result.exitCode !== 0) throw new Error(commandError(result));
    return `cron 작업을 ${shouldEnable ? "켰습니다" : "껐습니다"}.`;
  }

  async logs(): Promise<LogsResponse> {
    return {
      available: false,
      lines: [],
      message: "cron은 작업별 표준 로그를 제공하지 않습니다.",
    };
  }
}
