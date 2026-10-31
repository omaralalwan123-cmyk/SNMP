export type InterfaceStatus = "Up" | "Down" | "Unreachable";
export type AlertType = "cpu" | "interface" | "unreachable";

export interface Metric {
  id: number;
  timestamp: string;
  cpu_usage: number | null;
  interface_status: InterfaceStatus;
  interfaces_up: number | null;
  interfaces_total: number | null;
}

export interface Device {
  id: number;
  ip_address: string;
  latest_metric: Metric | null;
  alert_count: number;
}

export interface Alert {
  id: number;
  device: number;
  device_ip: string;
  alert_type: AlertType;
  alert_message: string;
  timestamp: string;
}

export const CPU_THRESHOLD = 75;
export const POLL_INTERVAL_SECONDS = 60;
export const MAX_DEVICES = 3;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Network error: the API could not be reached.", 0);
  }
  if (!res.ok) {
    throw new ApiError(await errorMessage(res), res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// DRF errors come back as {"detail": "..."} or {"field": ["..."]}
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    const first = Object.values(body ?? {})[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  } catch {}
  return res.status >= 500
    ? "The monitoring API is not responding. Is the Django server running on port 8000?"
    : `Request failed (${res.status})`;
}

export const api = {
  devices: () => request<Device[]>("devices"),
  addDevice: (ip_address: string) =>
    request<Device>("devices", { method: "POST", body: JSON.stringify({ ip_address }) }),
  deleteDevice: (id: number) => request<void>(`devices/${id}`, { method: "DELETE" }),
  metrics: (id: number, limit = 1500) => request<Metric[]>(`devices/${id}/metrics?limit=${limit}`),
  pollNow: (id: number) => request<Metric>(`devices/${id}/poll`, { method: "POST" }),
  alerts: (params: { device?: number; type?: AlertType; limit?: number } = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 100) });
    if (params.device) q.set("device", String(params.device));
    if (params.type) q.set("type", params.type);
    return request<Alert[]>(`alerts?${q}`);
  },
};
