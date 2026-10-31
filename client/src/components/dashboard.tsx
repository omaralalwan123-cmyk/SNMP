"use client";

import { useEffect, useState } from "react";
import { api, MAX_DEVICES, POLL_INTERVAL_SECONDS, type Alert, type Device, type Metric } from "@/lib/api";
import { deviceHealth, HEALTH, timeAgo } from "@/lib/status";
import { AddDeviceForm } from "./add-device-form";
import { AlertsPanel, type AlertFilter } from "./alerts-panel";
import { DeviceCard } from "./device-card";
import { DeviceDetail } from "./device-detail";
import { BellIcon, ServerIcon } from "./icons";

// How often the UI re-reads the API (the backend itself polls devices every 60s)
const REFRESH_MS = 10_000;

export function Dashboard() {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [metrics, setMetrics] = useState<{ deviceId: number; data: Metric[] } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [alertType, setAlertType] = useState<AlertFilter>("all");
  const [alertDevice, setAlertDevice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const refresh = () => setTick((t) => t + 1);
  const selected = devices?.find((d) => d.id === selectedId) ?? devices?.[0] ?? null;

  useEffect(() => {
    const refreshTimer = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(refreshTimer);
      clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.devices().then(
      (d) => {
        if (cancelled) return;
        setDevices(d);
        setError(null);
        setLastSync(Date.now());
        setNow(Date.now());
      },
      (e: Error) => !cancelled && setError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    api
      .alerts({ type: alertType === "all" ? undefined : alertType, device: alertDevice ?? undefined, limit: 150 })
      .then((a) => !cancelled && setAlerts(a), () => {});
    return () => {
      cancelled = true;
    };
  }, [tick, alertType, alertDevice]);

  const selectedDeviceId = selected?.id;
  useEffect(() => {
    if (selectedDeviceId === undefined) return;
    let cancelled = false;
    api.metrics(selectedDeviceId).then((data) => !cancelled && setMetrics({ deviceId: selectedDeviceId, data }), () => {});
    return () => {
      cancelled = true;
    };
  }, [tick, selectedDeviceId]);

  const healths = (devices ?? []).map(deviceHealth);
  const attention = healths.filter((h) => h !== "healthy" && h !== "pending").length;
  const totalAlerts = (devices ?? []).reduce((n, d) => n + d.alert_count, 0);
  const worst = healths.length ? healths.reduce((a, b) => (HEALTH[a].rank <= HEALTH[b].rank ? a : b)) : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-ink-3">
            <ServerIcon size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">Network Management</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">SNMP Monitor</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-2">
          <span
            className={`h-2 w-2 rounded-full ${error ? "" : "animate-pulse"}`}
            style={{ background: error ? "var(--critical)" : "var(--good)" }}
            aria-hidden="true"
          />
          <span>
            {error ? "API offline" : lastSync && now ? `Live · synced ${timeAgo(new Date(lastSync).toISOString(), now)}` : "Connecting…"}
          </span>
          <span className="text-ink-3">· SNMP v2c · polled every {POLL_INTERVAL_SECONDS}s</span>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--critical)" }} />
          <div>
            <p className="font-medium text-ink">Can’t reach the monitoring API</p>
            <p className="mt-0.5 text-ink-2">
              {error} Start the backend with <code className="rounded bg-surface-2 px-1 font-mono text-xs">python manage.py runserver</code> in <code className="rounded bg-surface-2 px-1 font-mono text-xs">snmp_project/</code>. Retrying every {REFRESH_MS / 1000}s.
            </p>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Devices monitored" value={devices ? `${devices.length}` : "—"} hint={`of ${MAX_DEVICES} in scope`} />
        <Kpi label="Healthy" value={devices ? `${healths.filter((h) => h === "healthy").length}` : "—"} hint="on last poll" />
        <Kpi
          label="Need attention"
          value={devices ? `${attention}` : "—"}
          hint={worst && attention ? HEALTH[worst].label : "No active issues"}
          dot={attention && worst ? HEALTH[worst].color : undefined}
        />
        <Kpi label="Alerts logged" value={devices ? `${totalAlerts}` : "—"} hint="all time" icon />
      </dl>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <section aria-labelledby="devices-heading" className="flex flex-col gap-3">
          <h2 id="devices-heading" className="text-sm font-semibold text-ink">Devices</h2>
          {devices === null && !error && <div className="h-36 animate-pulse rounded-xl bg-surface-2" />}
          {devices?.map((d) => (
            <DeviceCard key={d.id} device={d} now={now} selected={d.id === selected?.id} onSelect={() => setSelectedId(d.id)} />
          ))}
          <AddDeviceForm
            onAdded={(d) => {
              setSelectedId(d.id);
              refresh();
            }}
          />
        </section>

        <div className="min-w-0">
          {selected ? (
            <DeviceDetail
              key={selected.id}
              device={selected}
              metrics={metrics?.deviceId === selected.id ? metrics.data : null}
              now={now}
              onChanged={refresh}
              onDeleted={() => {
                setSelectedId(null);
                refresh();
              }}
            />
          ) : (
            <div className="grid h-full min-h-60 place-items-center rounded-xl border border-border bg-surface p-8 text-center text-sm text-ink-3">
              {devices === null ? "Loading…" : "Add a device to start monitoring CPU and interface status."}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 xl:col-span-1 xl:max-h-[calc(100vh-14rem)] xl:min-h-[480px] flex flex-col">
          <AlertsPanel
            alerts={alerts}
            devices={devices ?? []}
            now={now}
            typeFilter={alertType}
            deviceFilter={alertDevice}
            onTypeFilter={setAlertType}
            onDeviceFilter={setAlertDevice}
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, dot, icon }: { label: string; value: string; hint: string; dot?: string; icon?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="flex items-center gap-1.5 text-xs text-ink-3">
        {icon && <BellIcon size={13} />}
        {label}
      </dt>
      <dd className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</dd>
      <dd className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden="true" />}
        {hint}
      </dd>
    </div>
  );
}
