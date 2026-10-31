import { CPU_THRESHOLD, type AlertType, type Device } from "./api";

export type Health = "healthy" | "high-cpu" | "interface-down" | "unreachable" | "pending";

export const HEALTH: Record<Health, { label: string; color: string; rank: number }> = {
  unreachable: { label: "Unreachable", color: "var(--critical)", rank: 0 },
  "interface-down": { label: "Interface down", color: "var(--serious)", rank: 1 },
  "high-cpu": { label: "High CPU", color: "var(--warning)", rank: 2 },
  pending: { label: "Awaiting first poll", color: "var(--ink-3)", rank: 3 },
  healthy: { label: "Healthy", color: "var(--good)", rank: 4 },
};

export const ALERT_TYPES: Record<AlertType, { label: string; color: string; health: Health }> = {
  unreachable: { label: "Unreachable", color: "var(--critical)", health: "unreachable" },
  interface: { label: "Interface down", color: "var(--serious)", health: "interface-down" },
  cpu: { label: "High CPU", color: "var(--warning)", health: "high-cpu" },
};

// The most severe condition in the latest poll wins
export function deviceHealth(device: Device): Health {
  const m = device.latest_metric;
  if (!m) return "pending";
  if (m.interface_status === "Unreachable") return "unreachable";
  if (m.interface_status === "Down") return "interface-down";
  if (m.cpu_usage !== null && m.cpu_usage > CPU_THRESHOLD) return "high-cpu";
  return "healthy";
}

export function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}
