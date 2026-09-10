import { describe, expect, it } from "vitest";
import { isUserOwnedWindowsTask, windowsScheduleLabel } from "./windows.js";

describe("windowsScheduleLabel", () => {
  it("Windows 트리거를 읽기 쉬운 주기로 변환한다", () => {
    expect(windowsScheduleLabel([
      { Type: "MSFT_TaskDailyTrigger", StartBoundary: "2026-01-01T09:30:00", Interval: "P1D" },
      { Type: "MSFT_TaskLogonTrigger", StartBoundary: null, Interval: null },
    ])).toBe("매일 09:30 · P1D, 로그온 시");
  });

  it("트리거가 없으면 빈 상태를 표시한다", () => {
    expect(windowsScheduleLabel([])).toBe("트리거 없음");
  });

  it("현재 사용자 소유의 일반 작업만 제어할 수 있다", () => {
    const task = {
      TaskName: "My Backup",
      TaskPath: "\\Personal\\",
      State: "Ready",
      Enabled: true,
      UserId: "DESKTOP\\Kyle",
    };
    expect(isUserOwnedWindowsTask(task, "DESKTOP\\Kyle")).toBe(true);
    expect(isUserOwnedWindowsTask({ ...task, UserId: "SYSTEM" }, "DESKTOP\\Kyle")).toBe(false);
    expect(isUserOwnedWindowsTask({ ...task, TaskPath: "\\Microsoft\\Windows\\" }, "DESKTOP\\Kyle")).toBe(false);
  });
});
