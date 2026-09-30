"use client";

import { useCallback, useEffect, useState } from "react";
import type { NormalizedInterface } from "@/lib/types";
import { RefreshCw, Power, PowerOff } from "lucide-react";
import clsx from "clsx";

export function InterfaceTable() {
  const [interfaces, setInterfaces] = useState<NormalizedInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/interfaces");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setInterfaces(data.interfaces || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function toggle(name: string, currentlyEnabled: boolean) {
    setBusy(name);
    try {
      const res = await fetch("/api/loopback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, enabled: !currentlyEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setTimeout(load, 1200);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (loading && interfaces.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-[#0d1525] p-8 text-center text-slate-400">
        Loading interfaces…
      </div>
    );
  }

  if (error && interfaces.length === 0) {
    return (
      <div className="rounded-xl border border-[#e2231a]/40 bg-[#e2231a]/10 p-5 text-[#e2231a] text-sm">
        <p className="font-medium mb-1">Cannot load interfaces</p>
        <p className="text-xs opacity-90 break-all">{error}</p>
        <p className="text-xs text-slate-400 mt-3">
          Check <code className="text-slate-300">.env.local</code>: host, username and password
          from a <strong>freshly launched</strong> sandbox. 401 = bad credentials · 502 = sandbox unreachable.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0d1525] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80">
        <h2 className="font-semibold text-slate-100">
          Interfaces ({interfaces.length})
        </h2>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#049fd9] transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-800">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Admin</th>
              <th className="px-4 py-2.5 font-medium">Oper</th>
              <th className="px-4 py-2.5 font-medium">IPv4</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {interfaces.map((iface) => (
              <tr
                key={iface.name}
                className="border-b border-slate-800/80 hover:bg-slate-800/40 transition"
              >
                <td className="px-4 py-2.5 font-mono text-slate-100">
                  {iface.name}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge up={iface.adminUp} label={iface.adminUp ? "up" : "down"} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge up={iface.operUp} label={iface.operUp ? "up" : "down"} />
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-300 text-xs">
                  {iface.ipv4.length ? iface.ipv4.join(", ") : "—"}
                </td>
                <td className="px-4 py-2.5 text-slate-400 max-w-[200px] truncate">
                  {iface.description || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    disabled={busy === iface.name}
                    onClick={() => toggle(iface.name, iface.adminUp)}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition",
                      iface.adminUp
                        ? "bg-[#e2231a]/20 text-[#e2231a] hover:bg-[#e2231a]/30"
                        : "bg-[#6cc04a]/20 text-[#6cc04a] hover:bg-[#6cc04a]/30",
                      busy === iface.name && "opacity-50 cursor-wait"
                    )}
                  >
                    {iface.adminUp ? (
                      <>
                        <PowerOff className="h-3.5 w-3.5" /> Shutdown
                      </>
                    ) : (
                      <>
                        <Power className="h-3.5 w-3.5" /> No shut
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ up, label }: { up: boolean; label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        up ? "bg-[#6cc04a]/15 text-[#6cc04a]" : "bg-[#e2231a]/15 text-[#e2231a]"
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          up ? "bg-[#6cc04a]" : "bg-[#e2231a]"
        )}
      />
      {label}
    </span>
  );
}
