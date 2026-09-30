"use client";

import { useEffect, useRef, useState } from "react";
import type { MonitorEvent } from "@/lib/types";
import clsx from "clsx";
import {
  PlusCircle,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Info,
  Volume2,
  VolumeX,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "interface-created": PlusCircle,
  "interface-deleted": Trash2,
  "link-up": ArrowUpCircle,
  "link-down": ArrowDownCircle,
  "admin-up": ArrowUpCircle,
  "admin-down": ArrowDownCircle,
  system: Info,
};

const colorMap: Record<string, string> = {
  info: "text-[#049fd9] border-[#049fd9]/30 bg-[#049fd9]/10",
  warning: "text-[#f5a623] border-[#f5a623]/30 bg-[#f5a623]/10",
  critical: "text-[#e2231a] border-[#e2231a]/30 bg-[#e2231a]/10",
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // ignore
  }
}

function speak(text: string) {
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1;
    u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function EventFeed() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (msg) => {
      try {
        const ev: MonitorEvent = JSON.parse(msg.data);
        if (seen.current.has(ev.id)) return;
        seen.current.add(ev.id);

        setEvents((prev) => [ev, ...prev].slice(0, 100));

        if (ev.type !== "system") {
          if (audioEnabled) playBeep();
          if (ttsEnabled) speak(ev.message);
        }
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, [audioEnabled, ttsEnabled]);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0d1525] flex flex-col h-[320px] lg:h-auto min-h-[320px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-100">Live Events</h2>
          <span
            className={clsx(
              "h-2 w-2 rounded-full",
              connected ? "bg-[#6cc04a] animate-pulse" : "bg-slate-600"
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            title={audioEnabled ? "Mute beep" : "Enable beep"}
            onClick={() => setAudioEnabled((v) => !v)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            {audioEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            title={ttsEnabled ? "Disable speech" : "Enable speech"}
            onClick={() => setTtsEnabled((v) => !v)}
            className={clsx(
              "text-xs px-2 py-1 rounded-md border transition",
              ttsEnabled
                ? "border-[#049fd9]/50 text-[#049fd9]"
                : "border-slate-600 text-slate-500"
            )}
          >
            TTS
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            Waiting for events… Create or shut a loopback to see alerts.
          </p>
        )}
        {events.map((ev) => {
          const Icon = iconMap[ev.type] || AlertTriangle;
          return (
            <div
              key={ev.id}
              className={clsx(
                "flex gap-3 rounded-lg border px-3 py-2.5 text-sm",
                colorMap[ev.severity] || colorMap.info
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-100 break-words">
                  {ev.message}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                  {ev.interfaceName ? ` · ${ev.interfaceName}` : " · system"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
