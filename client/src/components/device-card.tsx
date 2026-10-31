import { CPU_THRESHOLD, type Device } from "@/lib/api";
import { deviceHealth, timeAgo } from "@/lib/status";
import { StatusBadge } from "./status-badge";

export function DeviceCard({
  device,
  selected,
  now,
  onSelect,
}: {
  device: Device;
  selected: boolean;
  now: number | null;
  onSelect: () => void;
}) {
  const m = device.latest_metric;
  const health = deviceHealth(device);
  const cpu = m?.cpu_usage ?? null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full rounded-xl border bg-surface p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-ink-3"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-ink-3">Device #{device.id}</div>
          <div className="truncate font-mono text-[15px] font-medium text-ink">{device.ip_address}</div>
        </div>
        <StatusBadge health={health} size="sm" />
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <div className="text-xs text-ink-3">CPU</div>
          <div className="tabular text-2xl font-semibold tracking-tight text-ink">
            {cpu === null ? "—" : `${cpu.toFixed(1)}%`}
          </div>
        </div>
        <div className="text-right text-xs text-ink-2">
          <div>
            {m?.interfaces_total
              ? `${m.interfaces_up}/${m.interfaces_total} interfaces up`
              : m?.interface_status === "Unreachable"
                ? "No SNMP response"
                : m ? `Interfaces ${m.interface_status}` : "Not polled yet"}
          </div>
          <div className="mt-0.5 text-ink-3">{m && now ? `Polled ${timeAgo(m.timestamp, now)}` : " "}</div>
        </div>
      </div>

      {/* CPU meter with threshold tick */}
      <div className="relative mt-3 h-1.5 rounded-full bg-surface-2" aria-hidden="true">
        {cpu !== null && (
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, cpu)}%`,
              background: cpu > CPU_THRESHOLD ? "var(--warning)" : "var(--accent)",
            }}
          />
        )}
        <div className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-ink-3" style={{ left: `${CPU_THRESHOLD}%` }} />
      </div>

      <div className="mt-3 text-xs text-ink-3">
        {device.alert_count} {device.alert_count === 1 ? "alert" : "alerts"} logged
      </div>
    </button>
  );
}
