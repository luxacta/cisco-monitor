"use client";

import { useState } from "react";
import { Play, PowerOff, Power, Trash2, Loader2 } from "lucide-react";

export function DemoPanel() {
  const [number, setNumber] = useState(100);
  const [ip, setIp] = useState("192.0.2.100");
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) =>
      [`${new Date().toLocaleTimeString()} – ${msg}`, ...prev].slice(0, 6)
    );
  }

  async function create() {
    setBusy("create");
    try {
      const res = await fetch("/api/loopback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          ip,
          netmask: "255.255.255.255",
          description: "Demo loopback from cisco-monitor",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      addLog(data.message || `Loopback${number} created`);
    } catch (e) {
      addLog(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function shutdown() {
    setBusy("shutdown");
    try {
      const res = await fetch("/api/loopback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Loopback${number}`,
          enabled: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Shutdown failed");
      addLog(data.message || `Loopback${number} shut down`);
    } catch (e) {
      addLog(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function noShut() {
    setBusy("noshut");
    try {
      const res = await fetch("/api/loopback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Loopback${number}`,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No-shut failed");
      addLog(data.message || `Loopback${number} enabled`);
    } catch (e) {
      addLog(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const res = await fetch(`/api/loopback?number=${number}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      addLog(data.message || `Loopback${number} deleted`);
    } catch (e) {
      addLog(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0d1525] p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-slate-400">Loopback number</span>
          <input
            type="number"
            min={1}
            max={2147483647}
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-slate-600 bg-[#111b2e] px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#049fd9]/50"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">IPv4 address</span>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-600 bg-[#111b2e] px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#049fd9]/50"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={create}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#049fd9] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#0389bc] disabled:opacity-50 transition"
        >
          {busy === "create" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Create Loopback
        </button>
        <button
          onClick={shutdown}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#e2231a] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#c41e16] disabled:opacity-50 transition"
        >
          {busy === "shutdown" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PowerOff className="h-4 w-4" />
          )}
          Shutdown
        </button>
        <button
          onClick={noShut}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6cc04a] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#5aa83c] disabled:opacity-50 transition"
        >
          {busy === "noshut" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          No Shutdown
        </button>
        <button
          onClick={remove}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-transparent px-3.5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {busy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </button>
      </div>

      {log.length > 0 && (
        <div className="rounded-lg border border-slate-700/60 bg-[#0a101c] p-2 space-y-0.5 font-mono text-xs max-h-24 overflow-y-auto">
          {log.map((line, i) => (
            <div
              key={i}
              className={
                line.includes("ERROR") ? "text-[#e2231a]" : "text-slate-400"
              }
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
