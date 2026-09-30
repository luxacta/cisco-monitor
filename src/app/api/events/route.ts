/**
 * Server-Sent Events endpoint.
 * Clients connect once and receive a continuous stream of MonitorEvent objects.
 */
import { eventBus } from "@/lib/event-bus";
import { isMonitorRunning, startMonitor } from "@/lib/monitor";
import type { MonitorEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isMonitorRunning()) {
    startMonitor(Number(process.env.POLL_INTERVAL_MS) || 3000);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send history first so the UI has context
      const history = eventBus.getHistory(30);
      for (const ev of history.reverse()) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(ev)}\n\n`)
        );
      }

      const onEvent = (ev: MonitorEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(ev)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      };

      eventBus.on("event", onEvent);

      // Keep-alive comment every 20 s (prevents some proxies from closing)
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 20000);

      // Cleanup when the client disconnects
      const cleanup = () => {
        eventBus.off("event", onEvent);
        clearInterval(keepAlive);
      };

      // Next.js / undici abort signal
      // @ts-expect-error – available on the request in some runtimes
      if (typeof AbortSignal !== "undefined") {
        // The request is closed when the controller is cancelled
      }

      // Store cleanup on the controller for cancel()
      (controller as unknown as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel(controller) {
      const c = controller as unknown as { _cleanup?: () => void };
      c._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
