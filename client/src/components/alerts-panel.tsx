import type { Alert, AlertType, Device } from "@/lib/api";
import { ALERT_TYPES, formatDateTime, timeAgo } from "@/lib/status";
import { StatusIcon } from "./status-badge";

export type AlertFilter = AlertType | "all";

export function AlertsPanel({
  alerts,
  devices,
  now,
  typeFilter,
  deviceFilter,
  onTypeFilter,
  onDeviceFilter,
}: {
  alerts: Alert[] | null;
  devices: Device[];
  now: number | null;
  typeFilter: AlertFilter;
  deviceFilter: number | null;
  onTypeFilter: (f: AlertFilter) => void;
  onDeviceFilter: (id: number | null) => void;
}) {
  const filters: { key: AlertFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...Object.entries(ALERT_TYPES).map(([key, v]) => ({ key: key as AlertType, label: v.label })),
  ];

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border bg-surface" aria-labelledby="alerts-heading">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="alerts-heading" className="font-semibold text-ink">Alerts</h2>
          <select
            value={deviceFilter ?? ""}
            onChange={(e) => onDeviceFilter(e.target.value ? Number(e.target.value) : null)}
            aria-label="Filter alerts by device"
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink-2"
          >
            <option value="">All devices</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.ip_address}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter alerts by type">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={typeFilter === f.key}
              onClick={() => onTypeFilter(f.key)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                typeFilter === f.key
                  ? "border-ink bg-ink text-background"
                  : "border-border text-ink-2 hover:border-ink-3"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto" aria-live="polite">
        {alerts === null ? (
          <li className="p-4 text-sm text-ink-3">Loading alerts…</li>
        ) : alerts.length === 0 ? (
          <li className="p-6 text-center text-sm text-ink-3">
            No alerts{typeFilter !== "all" || deviceFilter ? " match these filters" : " yet. Everything looks quiet"}.
          </li>
        ) : (
          alerts.map((a) => {
            const t = ALERT_TYPES[a.alert_type];
            return (
              <li key={a.id} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 shrink-0"><StatusIcon health={t.health} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-sm font-medium text-ink">
                      {t.label} <span className="font-mono font-normal text-ink-2">· {a.device_ip}</span>
                    </span>
                    <time dateTime={a.timestamp} title={formatDateTime(a.timestamp)} className="tabular text-xs text-ink-3">
                      {now ? timeAgo(a.timestamp, now) : ""}
                    </time>
                  </div>
                  <p className="mt-0.5 break-words text-xs text-ink-2">{a.alert_message}</p>
                </div>
              </li>
            );
          })
        )}
      </ol>
    </section>
  );
}
