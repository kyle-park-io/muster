// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SchedulerSource } from "../../shared/types";
import { SourceStrip } from "./SourceStrip";

const source = (
  id: SchedulerSource["id"],
  environment: SchedulerSource["environment"],
  count: number,
): SchedulerSource => ({
  id,
  environment,
  name: id,
  shortName: id === "claude"
    ? "Claude"
    : id === "codex"
      ? "Codex"
      : id === "windows-task"
        ? "Tasks"
        : "User",
  status: count ? "connected" : "empty",
  count,
  controllable: false,
  message: `${environment} ${id}`,
});

const sources = [
  source("windows-task", "windows", 2),
  source("claude", "windows", 1),
  source("codex", "windows", 2),
  source("systemd-user", "wsl", 3),
  source("claude", "wsl", 4),
  source("codex", "wsl", 5),
];

afterEach(cleanup);

describe("SourceStrip", () => {
  it("환경별 개수를 표시하고 Claude를 Codex보다 앞에 둔다", () => {
    const { container } = render(
      <SourceStrip
        sources={sources}
        selectedSource="all"
        selectedEnvironment="wsl"
        onSourceSelect={vi.fn()}
        onEnvironmentSelect={vi.fn()}
      />,
    );

    expect(screen.queryByText("Tasks")).toBeNull();
    expect(screen.getByText("Claude").nextElementSibling?.textContent).toBe("4개");
    expect(screen.getByText("Codex").nextElementSibling?.textContent).toBe("5개");
    const labels = [...container.querySelectorAll(".source-pill strong")].map((item) => item.textContent);
    expect(labels.indexOf("Claude")).toBeLessThan(labels.indexOf("Codex"));
  });

  it("환경 선택을 상위 컴포넌트에 전달한다", () => {
    const onEnvironmentSelect = vi.fn();
    render(
      <SourceStrip
        sources={sources}
        selectedSource="all"
        selectedEnvironment="all"
        onSourceSelect={vi.fn()}
        onEnvironmentSelect={onEnvironmentSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^WSL 12$/ }));
    expect(onEnvironmentSelect).toHaveBeenCalledWith("wsl");
  });
});
