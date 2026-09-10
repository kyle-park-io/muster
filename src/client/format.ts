import type { ScheduleItem, ScheduleState, SourceId } from "../shared/types";

const relativeFormatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const fullFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

export const sourceNames: Record<SourceId, string> = {
  "windows-task": "Windows Tasks",
  "systemd-user": "systemd User",
  "systemd-system": "systemd System",
  cron: "Cron",
  codex: "Codex",
  claude: "Claude",
};

export const stateNames: Record<ScheduleState, string> = {
  running: "실행 중",
  idle: "대기 중",
  paused: "꺼짐",
  failed: "실패",
  unknown: "알 수 없음",
};

export function formatDate(value: string | null): string {
  return value ? fullFormatter.format(new Date(value)) : "예정 없음";
}

export function formatTime(value: string | null): string {
  return value ? timeFormatter.format(new Date(value)) : "미정";
}

export function relativeDate(value: string | null): string {
  if (!value) return "예정 없음";
  const difference = new Date(value).getTime() - Date.now();
  const minutes = Math.round(difference / 60_000);
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");
  return relativeFormatter.format(Math.round(hours / 24), "day");
}

export function isToday(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

export function actionCommand(item: ScheduleItem, action: "enable" | "disable" | "run"): string {
  if (item.source === "windows-task") {
    const command = action === "run"
      ? "Start-ScheduledTask"
      : action === "enable"
        ? "Enable-ScheduledTask"
        : "Disable-ScheduledTask";
    return `${command} -TaskName "${item.metadata.taskName}" -TaskPath "${item.metadata.taskPath}"`;
  }
  if (item.source === "systemd-user") {
    if (action === "run") return `systemctl --user start ${item.metadata.service}`;
    return `systemctl --user ${action} --now ${item.metadata.timer}`;
  }
  if (item.source === "cron") {
    if (action === "run") return item.command;
    return action === "enable" ? "crontab 원본 행 복원" : "crontab 행 안전하게 일시정지";
  }
  return "조회 전용";
}
