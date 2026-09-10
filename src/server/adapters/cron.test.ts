import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { parseCrontab } from "./cron.js";

describe("parseCrontab", () => {
  it("환경 변수와 주석을 제외하고 일반 작업과 매크로를 읽는다", () => {
    const entries = parseCrontab([
      "# backup jobs",
      "PATH=/usr/local/bin:/usr/bin",
      "*/15 * * * * /usr/local/bin/sync-data --quiet",
      "@daily /usr/local/bin/backup",
      "",
    ].join("\n"));

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      schedule: "*/15 * * * *",
      command: "/usr/local/bin/sync-data --quiet",
      enabled: true,
    });
    expect(entries[1]?.schedule).toBe("@daily");
  });

  it("Muster가 일시정지한 행을 원본 정보와 함께 복원한다", () => {
    const raw = "0 3 * * * /usr/local/bin/backup --full";
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
    const encoded = Buffer.from(raw).toString("base64url");
    const [entry] = parseCrontab(`# muster:paused:${hash}:${encoded}\n`);

    expect(entry).toMatchObject({
      hash,
      raw,
      schedule: "0 3 * * *",
      command: "/usr/local/bin/backup --full",
      enabled: false,
    });
  });

  it("손상된 일시정지 표시는 무시한다", () => {
    expect(parseCrontab("# muster:paused:0000000000000000:broken\n")).toEqual([]);
  });
});
