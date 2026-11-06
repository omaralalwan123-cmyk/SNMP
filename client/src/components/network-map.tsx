"use client";

import type { KeyboardEvent } from "react";
import type { Device } from "@/lib/api";
import { deviceHealth, HEALTH } from "@/lib/status";
import { ServerIcon } from "./icons";

const WIDTH = 800;
const HEIGHT = 360;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const CARD_WIDTH = 168;
const CARD_HEIGHT = 80;

export function NetworkMap({
  devices,
  selectedId,
  onSelect,
}: {
  devices: Device[];
  selectedId: number | null;
  onSelect: (deviceId: number) => void;
}) {
  const radiusX = 300;
  const radiusY = 140;
  const nodes = devices.map((device, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / devices.length;
    return {
      device,
      number: index + 1,
      x: CENTER.x + Math.cos(angle) * radiusX,
      y: CENTER.y + Math.sin(angle) * radiusY,
      health: deviceHealth(device),
    };
  });

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="network-map-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="network-map-heading" className="text-sm font-semibold text-ink">Network map</h2>
          <p className="mt-1 text-xs text-ink-3">Device status and latest CPU reading</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2" aria-label="Status legend">
          {(["healthy", "high-cpu", "interface-down", "unreachable", "pending"] as const).map((health) => (
            <span key={health} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: HEALTH[health].color }} aria-hidden="true" />
              {HEALTH[health].label}
            </span>
          ))}
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="grid min-h-56 place-items-center text-sm text-ink-3">
          Add a device to see it on the network map.
        </div>
      ) : (
        <>
          <div className="mt-4 sm:hidden">
            <div className="rounded-lg border border-accent bg-surface-2 px-4 py-3 text-center">
              <div className="text-sm font-semibold text-ink">SNMP Monitor</div>
              <div className="mt-1 text-xs text-ink-3">{devices.length} devices connected</div>
            </div>
            <div className="ml-5 mt-3 space-y-3 border-l-2 border-border pl-4">
              {nodes.map(({ device, number, health }) => {
                const cpu = device.latest_metric?.cpu_usage;
                const selected = device.id === selectedId;
                return (
                  <button
                    key={device.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(device.id)}
                    className={`w-full rounded-lg border bg-surface p-3 text-left transition-colors ${
                      selected ? "border-accent ring-1 ring-accent" : "border-border"
                    }`}
                    style={{ borderLeftWidth: 3, borderLeftColor: HEALTH[health].color }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-sm font-medium text-ink">
                        #{number} · {device.ip_address}
                      </span>
                      <span className="shrink-0 text-xs font-medium" style={{ color: HEALTH[health].color }}>
                        {HEALTH[health].label}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-ink-2">
                      CPU {cpu === null || cpu === undefined ? "—" : `${cpu.toFixed(1)}%`}
                      {device.latest_metric?.interfaces_total
                        ? ` · Interfaces ${device.latest_metric.interfaces_up}/${device.latest_metric.interfaces_total}`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 hidden overflow-x-auto sm:block">
          <svg
            className="mx-auto block h-auto min-w-[700px] w-full max-w-[800px]"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="group"
            aria-label="Network topology map. Select a device to view its metrics."
          >
            {nodes.map(({ device, x, y, health }) => {
              const dx = x - CENTER.x;
              const dy = y - CENTER.y;
              const distance = Math.hypot(dx, dy);
              const startX = CENTER.x + (dx / distance) * 62;
              const startY = CENTER.y + (dy / distance) * 46;
              const endX = x - (dx / distance) * (CARD_WIDTH / 2);
              const endY = y - (dy / distance) * (CARD_HEIGHT / 2);
              return (
                <line
                  key={`link-${device.id}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="var(--border)"
                  strokeWidth="2"
                  strokeDasharray={health === "unreachable" ? "5 5" : undefined}
                />
              );
            })}

            <g>
              <rect
                x={CENTER.x - 68}
                y={CENTER.y - 48}
                width="136"
                height="96"
                rx="16"
                fill="var(--surface-2)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
              <foreignObject x={CENTER.x - 60} y={CENTER.y - 38} width="120" height="76">
                <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-xs font-medium text-ink">
                  <ServerIcon size={22} />
                  <span>SNMP Monitor</span>
                  <span className="text-ink-3">{devices.length} devices</span>
                </div>
              </foreignObject>
            </g>

            {nodes.map(({ device, number, x, y, health }) => {
              const selected = device.id === selectedId;
              const cpu = device.latest_metric?.cpu_usage;
              const color = HEALTH[health].color;
              const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(device.id);
                }
              };

              return (
                <g
                  key={device.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Device ${number}, ${device.ip_address}, ${HEALTH[health].label}, CPU ${cpu === null || cpu === undefined ? "unavailable" : `${cpu.toFixed(1)} percent`}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(device.id)}
                  onKeyDown={handleKeyDown}
                  className="network-map-node cursor-pointer outline-none"
                >
                  <title>{`${device.ip_address} — ${HEALTH[health].label}`}</title>
                  <rect
                    x={x - CARD_WIDTH / 2}
                    y={y - CARD_HEIGHT / 2}
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    rx="14"
                    fill="var(--surface)"
                    stroke={selected ? "var(--accent)" : color}
                    strokeWidth={selected ? "3" : "2"}
                  />
                  <foreignObject
                    x={x - CARD_WIDTH / 2 + 12}
                    y={y - CARD_HEIGHT / 2 + 10}
                    width={CARD_WIDTH - 24}
                    height={CARD_HEIGHT - 20}
                    pointerEvents="none"
                  >
                    <div className="flex h-full flex-col justify-center gap-1 overflow-hidden text-xs">
                      <span className="truncate font-mono font-semibold text-ink">
                        #{number} · {device.ip_address}
                      </span>
                      <span className="truncate font-medium" style={{ color }}>
                        {HEALTH[health].label}
                      </span>
                      <span className="text-ink-2">
                        CPU {cpu === null || cpu === undefined ? "—" : `${cpu.toFixed(1)}%`}
                      </span>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
          </div>
        </>
      )}
    </section>
  );
}
