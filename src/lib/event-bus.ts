/**
 * Simple in-memory event bus for broadcasting monitor events
 * to all connected SSE clients.
 *
 * In a multi-instance production deployment you would replace
 * this with Redis Pub/Sub or a message queue.
 */

import type { MonitorEvent } from "./types";
import { EventEmitter } from "events";

class MonitorEventBus extends EventEmitter {
  private history: MonitorEvent[] = [];
  private readonly maxHistory = 200;

  publish(event: MonitorEvent) {
    this.history.unshift(event);
    if (this.history.length > this.maxHistory) {
      this.history.length = this.maxHistory;
    }
    this.emit("event", event);
  }

  getHistory(limit = 50): MonitorEvent[] {
    return this.history.slice(0, limit);
  }
}

// Singleton across hot-reloads in development
const globalForBus = globalThis as unknown as {
  __monitorBus?: MonitorEventBus;
};

export const eventBus =
  globalForBus.__monitorBus ?? new MonitorEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForBus.__monitorBus = eventBus;
}
