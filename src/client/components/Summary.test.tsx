// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ScheduleItem } from "../../shared/types";
import { Summary } from "./Summary";

const baseSchedule: ScheduleItem = {
  id: "systemd-user:backup.timer",
  source: "systemd-user",
  name: "backup",
  description: "Backup files",
  scope: "user",
  state: "idle",
  enabled: true,
  controllable: true,
  canRun: true,
  schedule: "daily",
  nextRun: new Date().toISOString(),
  lastRun: null,
  lastResult: "success",
  command: "/usr/bin/backup",
  controlHint: "",
  metadata: {},
};

afterEach(cleanup);

describe("Summary", () => {
  it("활성, 꺼짐, 실패 상태를 각각 계산한다", () => {
    render(
      <Summary
        schedules={[
          baseSchedule,
          { ...baseSchedule, id: "cron:paused", enabled: false, state: "paused", nextRun: null },
          { ...baseSchedule, id: "systemd-user:failed.timer", state: "failed" },
        ]}
      />,
    );

    expect(screen.getByText("활성 스케줄").nextElementSibling?.textContent).toBe("2");
    expect(screen.getByText("꺼진 스케줄").nextElementSibling?.textContent).toBe("1");
    expect(screen.getByText("확인 필요").nextElementSibling?.textContent).toBe("1");
  });
});
