import { HEALTH, type Health } from "@/lib/status";
import { CheckIcon, ClockIcon, CpuIcon, OfflineIcon, PlugOffIcon } from "./icons";

const ICONS: Record<Health, typeof CheckIcon> = {
  healthy: CheckIcon,
  "high-cpu": CpuIcon,
  "interface-down": PlugOffIcon,
  unreachable: OfflineIcon,
  pending: ClockIcon,
};

// Status is never color-alone: every badge carries an icon and a text label
export function StatusBadge({ health, size = "md" }: { health: Health; size?: "sm" | "md" }) {
  const { label, color } = HEALTH[health];
  const Icon = ICONS[health];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 font-medium text-ink ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[13px]"
      }`}
    >
      <Icon size={size === "sm" ? 13 : 15} style={{ color }} />
      {label}
    </span>
  );
}

export function StatusIcon({ health, size = 16 }: { health: Health; size?: number }) {
  const Icon = ICONS[health];
  return <Icon size={size} style={{ color: HEALTH[health].color }} />;
}
