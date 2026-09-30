/**
 * Background interface monitor.
 *
 * Polls the switch at a configurable interval, diffs the interface
 * list against the previous snapshot, and publishes events for:
 *   - interface creation / deletion
 *   - operational link up / down
 *   - admin up / down
 *
 * Designed to run once inside the Next.js process (dev or a
 * long-lived Node server). On pure serverless platforms you would
 * move this to a separate worker.
 */

import { getInterfaces } from "./cisco";
import { eventBus } from "./event-bus";
import type { NormalizedInterface, MonitorEvent, EventType } from "./types";
import { randomUUID } from "crypto";

type Snapshot = Map<string, NormalizedInterface>;

let previous: Snapshot = new Map();
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

function makeEvent(
  type: EventType,
  iface: string,
  message: string,
  severity: MonitorEvent["severity"] = "info"
): MonitorEvent {
  return {
    id: randomUUID(),
    type,
    interfaceName: iface,
    message,
    timestamp: new Date().toISOString(),
    severity,
  };
}

function diff(current: NormalizedInterface[]) {
  const currMap: Snapshot = new Map(
    current.map((i) => [i.name, i])
  );

  // Created
  for (const [name, iface] of currMap) {
    if (!previous.has(name)) {
      eventBus.publish(
        makeEvent(
          "interface-created",
          name,
          `Interface ${name} was created`,
          "info"
        )
      );
    }
  }

  // Deleted
  for (const [name] of previous) {
    if (!currMap.has(name)) {
      eventBus.publish(
        makeEvent(
          "interface-deleted",
          name,
          `Interface ${name} was deleted`,
          "warning"
        )
      );
    }
  }

  // State changes
  for (const [name, iface] of currMap) {
    const prev = previous.get(name);
    if (!prev) continue;

    if (prev.operUp !== iface.operUp) {
      if (iface.operUp) {
        eventBus.publish(
          makeEvent(
            "link-up",
            name,
            `Link on ${name} is now UP`,
            "info"
          )
        );
      } else {
        eventBus.publish(
          makeEvent(
            "link-down",
            name,
            `Link on ${name} is now DOWN`,
            "critical"
          )
        );
      }
    }

    if (prev.adminUp !== iface.adminUp) {
      if (iface.adminUp) {
        eventBus.publish(
          makeEvent(
            "admin-up",
            name,
            `Admin state of ${name} is now UP (no shutdown)`,
            "info"
          )
        );
      } else {
        eventBus.publish(
          makeEvent(
            "admin-down",
            name,
            `Admin state of ${name} is now DOWN (shutdown)`,
            "warning"
          )
        );
      }
    }
  }

  previous = currMap;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const ifaces = await getInterfaces();
    if (previous.size === 0) {
      // First run – just store baseline, no events
      previous = new Map(ifaces.map((i) => [i.name, i]));
      eventBus.publish(
        makeEvent(
          "system",
          "-",
          `Monitor started – tracking ${ifaces.length} interfaces`,
          "info"
        )
      );
    } else {
      diff(ifaces);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    eventBus.publish(
      makeEvent("system", "-", `Poll error: ${msg}`, "warning")
    );
  } finally {
    running = false;
  }
}

export function startMonitor(intervalMs = 3000) {
  if (timer) return; // already running
  // Immediate first poll
  tick();
  timer = setInterval(tick, intervalMs);
  console.log(`[monitor] started – polling every ${intervalMs} ms`);
}

export function stopMonitor() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[monitor] stopped");
  }
}

export function isMonitorRunning() {
  return timer !== null;
}

/** Force a poll (useful after a config change from the UI) */
export async function forcePoll() {
  await tick();
}
