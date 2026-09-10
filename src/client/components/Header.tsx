import { Moon, RefreshCw, Sun } from "lucide-react";
import type { PlatformInfo } from "../../shared/types";
import { BrandMark } from "./BrandMark";

interface HeaderProps {
  hostname?: string;
  platform?: PlatformInfo;
  platforms?: PlatformInfo[];
  generatedAt?: string;
  refreshing: boolean;
  theme: "dark" | "light";
  onRefresh: () => void;
  onThemeChange: () => void;
}

export function Header({
  hostname,
  platform,
  platforms,
  generatedAt,
  refreshing,
  theme,
  onRefresh,
  onThemeChange,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <BrandMark />
        <div>
          <p className="brand-name">Muster</p>
          <p className="brand-caption">Local scheduler control</p>
        </div>
      </div>

      <div className="header-status" aria-label="연결 상태">
        <span className="live-dot" />
        <span className={`header-platform platform-${platform?.id || "unknown"}`}>
          {platforms?.map((item) => item.label).join(" + ") || platform?.label || "Local"}
        </span>
        <span className="header-divider" />
        <span className="host-name">{hostname || "local"}</span>
        <span className="header-divider" />
        <span>{generatedAt ? "방금 동기화" : "연결 중"}</span>
      </div>

      <div className="header-actions">
        <button className="icon-button" type="button" onClick={onRefresh} aria-label="새로고침">
          <RefreshCw size={17} className={refreshing ? "spin" : ""} />
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onThemeChange}
          aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <div className="avatar" aria-label="로컬 사용자">K</div>
      </div>
    </header>
  );
}
