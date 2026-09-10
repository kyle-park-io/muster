import { describe, expect, it } from "vitest";
import { detectPlatform } from "./platform.js";

describe("detectPlatform", () => {
  it.each([
    ["win32", "10.0.26100", "", "windows", "Windows"],
    ["darwin", "25.1.0", "", "macos", "macOS"],
    ["linux", "6.8.0-generic", "", "linux", "Linux"],
    ["linux", "6.6.87.2-microsoft-standard-WSL2", "", "wsl", "WSL"],
    ["linux", "6.8.0-generic", "Ubuntu", "wsl", "WSL"],
  ])("%s 플랫폼 값을 올바르게 판별한다", (platformName, releaseName, distro, id, label) => {
    expect(detectPlatform(platformName, releaseName, distro, "x64")).toMatchObject({ id, label });
  });
});
