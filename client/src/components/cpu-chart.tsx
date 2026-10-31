"use client";

import { useEffect, useRef, useState } from "react";
import { CPU_THRESHOLD, POLL_INTERVAL_SECONDS, type Metric } from "@/lib/api";
import { formatDateTime } from "@/lib/status";

const HEIGHT = 240;
const M = { top: 14, right: 16, bottom: 28, left: 40 };
const Y_TICKS = [0, 25, 50, 75, 100];
// A gap longer than this between samples breaks the line instead of interpolating across it
const MAX_GAP_MS = POLL_INTERVAL_SECONDS * 1000 * 2.5;

interface Point {
  t: number;
  cpu: number | null;
  metric: Metric;
}

/** metrics must be sorted oldest -> newest */
export function CpuChart({ metrics, domain }: { metrics: Metric[]; domain: [number, number] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Point | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points: Point[] = metrics.map((m) => ({ t: new Date(m.timestamp).getTime(), cpu: m.cpu_usage, metric: m }));
  const [t0, t1] = domain;
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const x = (t: number) => M.left + ((t - t0) / Math.max(1, t1 - t0)) * innerW;
  const y = (v: number) => M.top + innerH - (Math.min(100, Math.max(0, v)) / 100) * innerH;

  // Split into continuous runs: unreachable samples (null CPU) and long gaps break the line
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (const p of points) {
    const prev = run[run.length - 1];
    if (p.cpu === null || (prev && p.t - prev.t > MAX_GAP_MS)) {
      if (run.length) runs.push(run);
      run = p.cpu === null ? [] : [p];
    } else {
      run.push(p);
    }
  }
  if (run.length) runs.push(run);

  const linePath = (r: Point[]) => r.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.cpu!).toFixed(1)}`).join("");
  const areaPath = (r: Point[]) =>
    `${linePath(r)}L${x(r[r.length - 1].t).toFixed(1)},${y(0)}L${x(r[0].t).toFixed(1)},${y(0)}Z`;

  const xTicks = width > 0 ? timeTicks(t0, t1, width < 480 ? 3 : 5) : [];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!points.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    setHover(best);
  }

  const hx = hover ? x(hover.t) : 0;
  const tooltipLeft = Math.min(Math.max(hx, 90), Math.max(90, width - 90));

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`CPU usage over time, ${points.length} samples`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="touch-none"
        >
          <defs>
            <linearGradient id="cpu-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {Y_TICKS.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
              <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px] tabular">
                {v}%
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-3 text-[11px] tabular">
              {new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </text>
          ))}

          {/* alert threshold */}
          <line
            x1={M.left} x2={width - M.right} y1={y(CPU_THRESHOLD)} y2={y(CPU_THRESHOLD)}
            stroke="var(--critical)" strokeWidth={1.5} strokeDasharray="5 4"
          />
          <text
            x={M.left + 6} y={y(CPU_THRESHOLD) - 6}
            stroke="var(--surface)" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round"
            className="fill-ink-2 text-[11px] font-medium"
          >
            Alert threshold {CPU_THRESHOLD}%
          </text>

          {runs.map((r, i) => (
            <g key={i}>
              <path d={areaPath(r)} fill="url(#cpu-fill)" />
              <path d={linePath(r)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {r.length === 1 && <circle cx={x(r[0].t)} cy={y(r[0].cpu!)} r={3} fill="var(--accent)" />}
            </g>
          ))}

          {/* unreachable samples: marks along the baseline */}
          {points.filter((p) => p.cpu === null).map((p) => (
            <rect key={p.metric.id} x={x(p.t) - 1.5} y={y(0) - 10} width={3} height={10} rx={1.5} fill="var(--critical)" />
          ))}

          {hover && (
            <g pointerEvents="none">
              <line x1={hx} x2={hx} y1={M.top} y2={y(0)} stroke="var(--ink-3)" strokeWidth={1} />
              {hover.cpu !== null && (
                <circle cx={hx} cy={y(hover.cpu)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          )}
        </svg>
      )}

      {hover && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltipLeft }}
        >
          <div className="text-ink-3 tabular">{formatDateTime(hover.metric.timestamp)}</div>
          <div className="mt-1 flex items-center gap-2 font-medium text-ink">
            {hover.cpu === null ? (
              <>
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--critical)" }} />
                No response (unreachable)
              </>
            ) : (
              <>
                <span className="h-0.5 w-3 rounded-full" style={{ background: "var(--accent)" }} />
                CPU <span className="tabular">{hover.cpu.toFixed(1)}%</span>
              </>
            )}
          </div>
          {hover.metric.interface_status !== "Unreachable" && (
            <div className="mt-0.5 text-ink-2">Interfaces: {hover.metric.interface_status}</div>
          )}
        </div>
      )}
    </div>
  );
}

function timeTicks(t0: number, t1: number, count: number): number[] {
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720].map((m) => m * 60_000);
  const step = steps.find((s) => (t1 - t0) / s <= count) ?? steps[steps.length - 1];
  const ticks: number[] = [];
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) ticks.push(t);
  return ticks;
}
