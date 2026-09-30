"use client";

import { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff, Radio } from "lucide-react";

interface Status {
  connected: boolean;
  hostname?: string;
  error?: string;
  monitorRunning: boolean;
}

export function StatusBar() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled)
          setStatus({
            connected: false,
            error: "Cannot reach backend",
            monitorRunning: false,
          });
      }
    }
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Activity className="h-4 w-4 animate-pulse" />
        Checking connection…
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        {status.connected ? (
          <>
            <Wifi className="h-4 w-4 text-[#6cc04a]" />
            <span className="text-[#6cc04a] font-medium">Connected</span>
            {status.hostname && (
              <span className="text-slate-400 font-mono text-xs">
                ({status.hostname})
              </span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-[#e2231a]" />
            <span className="text-[#e2231a] font-medium">Disconnected</span>
            {status.error && (
              <span className="text-slate-500 max-w-xs truncate text-xs">
                {status.error}
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Radio
          className={`h-4 w-4 ${
            status.monitorRunning ? "text-[#049fd9]" : "text-slate-500"
          }`}
        />
        <span className="text-slate-300">
          Monitor {status.monitorRunning ? "running" : "stopped"}
        </span>
      </div>
    </div>
  );
}
