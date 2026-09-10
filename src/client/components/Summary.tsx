import { AlertTriangle, CalendarClock, CirclePause, Radio } from "lucide-react";
import type { ScheduleItem } from "../../shared/types";
import { isToday } from "../format";

interface SummaryProps {
  schedules: ScheduleItem[];
}

export function Summary({ schedules }: SummaryProps) {
  const cards = [
    {
      label: "활성 스케줄",
      value: schedules.filter((item) => item.enabled).length,
      detail: "정상적으로 대기 중",
      tone: "green",
      icon: Radio,
    },
    {
      label: "오늘 실행 예정",
      value: schedules.filter((item) => item.enabled && isToday(item.nextRun)).length,
      detail: "자정까지 예정",
      tone: "blue",
      icon: CalendarClock,
    },
    {
      label: "꺼진 스케줄",
      value: schedules.filter((item) => !item.enabled).length,
      detail: "직접 다시 켤 수 있음",
      tone: "amber",
      icon: CirclePause,
    },
    {
      label: "확인 필요",
      value: schedules.filter((item) => item.state === "failed").length,
      detail: "최근 실행 실패",
      tone: "red",
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="summary-grid" aria-label="스케줄 요약">
      {cards.map(({ label, value, detail, tone, icon: Icon }) => (
        <article className="summary-card" key={label}>
          <div className={`summary-icon ${tone}`}><Icon size={17} /></div>
          <div className="summary-copy">
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
