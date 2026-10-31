"use client";

import { useState } from "react";
import { api, type Device } from "@/lib/api";
import { PlusIcon } from "./icons";

export function AddDeviceForm({ onAdded }: { onAdded: (device: Device) => void }) {
  const [ip, setIp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ip.trim()) return;
    setPending(true);
    setError(null);
    try {
      const device = await api.addDevice(ip.trim());
      setIp("");
      onAdded(device);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add device");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-border p-4">
      <label htmlFor="new-ip" className="text-sm font-medium text-ink">Add a device</label>
      <p className="mt-0.5 text-xs text-ink-3">SNMP v2c, community “public”, UDP 161</p>
      <div className="mt-3 flex gap-2">
        <input
          id="new-ip"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="192.168.1.1"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? "new-ip-error" : undefined}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !ip.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-40"
        >
          <PlusIcon size={15} />
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p id="new-ip-error" role="alert" className="mt-2 text-xs" style={{ color: "var(--critical)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
