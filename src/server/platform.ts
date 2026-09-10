import { arch, platform, release } from "node:os";
import type { PlatformId, PlatformInfo } from "../shared/types.js";

export function detectPlatform(
  platformName: string = platform(),
  releaseName: string = release(),
  wslDistro: string | undefined = process.env.WSL_DISTRO_NAME,
  architecture: string = arch(),
): PlatformInfo {
  let id: PlatformId = "unknown";
  let label: string = platformName;

  if (platformName === "win32") {
    id = "windows";
    label = "Windows";
  } else if (platformName === "darwin") {
    id = "macos";
    label = "macOS";
  } else if (platformName === "linux") {
    if (wslDistro || /microsoft|wsl/i.test(releaseName)) {
      id = "wsl";
      label = "WSL";
    } else {
      id = "linux";
      label = "Linux";
    }
  }

  return { id, label, release: releaseName, architecture };
}
