import type {
  ActionResponse,
  LogsResponse,
  OverviewResponse,
  ScheduleAction,
} from "../shared/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message || "요청을 처리하지 못했습니다.");
  return data;
}

export function fetchOverview(): Promise<OverviewResponse> {
  return request("/api/overview");
}

export function fetchLogs(id: string): Promise<LogsResponse> {
  return request(`/api/schedules/${encodeURIComponent(id)}/logs`);
}

export function runAction(id: string, action: ScheduleAction): Promise<ActionResponse> {
  return request(`/api/schedules/${encodeURIComponent(id)}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}
