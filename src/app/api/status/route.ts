import { NextResponse } from "next/server";
import { checkConnectivity } from "@/lib/cisco";
import { isMonitorRunning, startMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  // Lazily start the background monitor on first status check
  if (!isMonitorRunning()) {
    const interval = Number(process.env.POLL_INTERVAL_MS) || 3000;
    startMonitor(interval);
  }

  const conn = await checkConnectivity();
  return NextResponse.json({
    connected: conn.ok,
    hostname: conn.hostname,
    error: conn.error,
    monitorRunning: isMonitorRunning(),
  });
}
