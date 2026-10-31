"use client";

import { useState } from "react";
import { api, CPU_THRESHOLD, type Device, type Metric } from "@/lib/api";
import { deviceHealth, formatDateTime, timeAgo } from "@/lib/status";
import { CpuChart } from "./cpu-chart";
import { RefreshIcon, TrashIcon } from "./icons";
import { StatusBadge } from "./status-badge";

const WINDOWS = [
  { key: "1h", label: "1h", ms: 3_600_000 },
  { key: "6h", label: "6h", ms: 6 * 3_600_000 },
  { key: "24h", label: "24h", ms: 24 * 3_600_000 },
] as const;

export function DeviceDetail({
  device,
  metrics,
  now,
  onChanged,
  onDeleted,
}: {
  device: Device;
  /** newest first, as returned by the API */
  metrics: Metric[] | null;
  now: number | null;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [windowKey, setWindowKey] = useState<(typeof WINDOWS)[number]["key"]>("1h");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [busy, setBusy] = useState<"poll" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const span = WINDOWS.find((w) => w.key === windowKey)!.ms;
  const end = now ?? 0;
  const inWindow = (metrics ?? []).filter((m) => new Date(m.timestamp).getTime() >= end - span);
  const chronological = [...inWindow].reverse();
  const cpuValues = inWindow.map((m) => m.cpu_usage).filter((v): v is number => v !== null);
  const stats = cpuValues.length
    ? {
        avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
        max: Math.max(...cpuValues),
        breaches: cpuValues.filter((v) => v > CPU_THRESHOLD).length,
        unreachable: inWindow.length - cpuValues.length,
      }
    : null;

  async function pollNow() {
    setBusy("poll");
    setError(null);
    try {
      await api.pollNow(device.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poll failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Stop monitoring ${device.ip_address}? Its metrics and alerts will be deleted.`)) return;
    setBusy("delete");
    setError(null);
    try {
      await api.deleteDevice(device.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(null);
    }
  }

  const latest = device.latest_metric;

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="detail-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="detail-heading" className="font-mono text-lg font-semibold text-ink">{device.ip_address}</h2>
            <StatusBadge health={deviceHealth(device)} />
          </div>
          <p className="mt-1 text-xs text-ink-3">
            {latest && now
              ? `Last polled ${timeAgo(latest.timestamp, now)} · ${formatDateTime(latest.timestamp)}`
              : "No data collected yet"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pollNow}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            <RefreshIcon size={15} className={busy === "poll" ? "animate-spin" : undefined} />
            {busy === "poll" ? "Polling…" : "Poll now"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            aria-label={`Remove ${device.ip_address}`}
            className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            <TrashIcon size={15} />
          </button>
        </div>
        {error && (
          <p role="alert" className="w-full text-xs" style={{ color: "var(--critical)" }}>{error}</p>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">CPU usage (hrProcessorLoad avg.)</h3>
          <div className="flex gap-2">
            <Segmented
              label="Time range"
              options={WINDOWS.map((w) => ({ key: w.key, label: w.label }))}
              value={windowKey}
              onChange={setWindowKey}
            />
            <Segmented
              label="View"
              options={[{ key: "chart", label: "Chart" }, { key: "table", label: "Table" }]}
              value={view}
              onChange={setView}
            />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Average" value={stats ? `${stats.avg.toFixed(1)}%` : "—"} />
          <Stat label="Peak" value={stats ? `${stats.max.toFixed(1)}%` : "—"} />
          <Stat label={`Polls > ${CPU_THRESHOLD}%`} value={stats ? String(stats.breaches) : "—"} />
          <Stat label="Failed polls" value={stats ? String(stats.unreachable) : inWindow.length ? String(inWindow.length) : "—"} />
        </dl>

        <div className="mt-4">
          {metrics === null || now === null ? (
            <div className="grid h-60 place-items-center text-sm text-ink-3">Loading metrics…</div>
          ) : inWindow.length === 0 ? (
            <div className="grid h-60 place-items-center rounded-lg bg-surface-2 px-6 text-center text-sm text-ink-3">
              No samples in the last {windowKey}. The backend poller records one every 60 seconds. Use “Poll now” to collect one immediately.
            </div>
          ) : view === "chart" ? (
            <CpuChart metrics={chronological} domain={[end - span, end]} />
          ) : (
            <MetricsTable metrics={inWindow} />
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="tabular text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.key ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MetricsTable({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="max-h-60 overflow-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-surface-2 text-xs text-ink-3">
          <tr>
            <th className="px-3 py-2 font-medium">Timestamp</th>
            <th className="px-3 py-2 text-right font-medium">CPU</th>
            <th className="px-3 py-2 font-medium">Interface status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {metrics.map((m) => (
            <tr key={m.id}>
              <td className="tabular px-3 py-1.5 text-ink-2">{formatDateTime(m.timestamp)}</td>
              <td className="tabular px-3 py-1.5 text-right text-ink">
                {m.cpu_usage === null ? "—" : `${m.cpu_usage.toFixed(1)}%`}
              </td>
              <td className="px-3 py-1.5 text-ink">
                {m.interface_status}
                {m.interfaces_total ? (
                  <span className="text-ink-3"> ({m.interfaces_up}/{m.interfaces_total} up)</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
