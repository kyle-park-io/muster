import { homedir } from "node:os";
import { join } from "node:path";
import type { PlatformId } from "../shared/types.js";
import { runCommand } from "./command.js";

let cachedWindowsHome: Promise<string | null> | null = null;

async function findWindowsHome(platform: PlatformId): Promise<string | null> {
  if (platform === "windows") return homedir();
  if (platform !== "wsl") return null;

  const homeResult = await runCommand(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; [Environment]::GetFolderPath('UserProfile')",
    ],
  );
  const windowsPath = homeResult.stdout.trim().replace(/^\uFEFF/, "").replaceAll("\r", "");
  if (homeResult.exitCode !== 0 || !windowsPath) return null;

  const wslPathResult = await runCommand("wslpath", ["-u", windowsPath]);
  if (wslPathResult.exitCode !== 0) return null;
  return wslPathResult.stdout.trim() || null;
}

export function windowsUserHome(platform: PlatformId): Promise<string | null> {
  cachedWindowsHome ??= findWindowsHome(platform).catch(() => null);
  return cachedWindowsHome;
}

export async function windowsAgentHome(
  platform: PlatformId,
  directory: ".claude" | ".codex",
): Promise<string | null> {
  const home = await windowsUserHome(platform);
  return home ? join(home, directory) : null;
}
