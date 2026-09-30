import { NextResponse } from "next/server";
import { getInterfaces } from "@/lib/cisco";
import { isMonitorRunning, startMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMonitorRunning()) {
    startMonitor(Number(process.env.POLL_INTERVAL_MS) || 3000);
  }

  try {
    const interfaces = await getInterfaces();
    return NextResponse.json({ interfaces });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
