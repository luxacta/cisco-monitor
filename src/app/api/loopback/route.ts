import { NextRequest, NextResponse } from "next/server";
import {
  createLoopback,
  setInterfaceEnabled,
  deleteLoopback,
} from "@/lib/cisco";
import { forcePoll } from "@/lib/monitor";

export const dynamic = "force-dynamic";

/** POST – create a new loopback */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const number = Number(body.number);
    if (!Number.isInteger(number) || number < 0 || number > 2147483647) {
      return NextResponse.json(
        { error: "Invalid loopback number" },
        { status: 400 }
      );
    }

    await createLoopback({
      number,
      ip: body.ip,
      netmask: body.netmask || "255.255.255.255",
      description: body.description,
    });

    // Give the device a moment then force a poll so the event appears quickly
    setTimeout(() => forcePoll(), 800);

    return NextResponse.json({
      ok: true,
      message: `Loopback${number} created`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** PATCH – enable / disable (shutdown) an interface */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "");
    const enabled = Boolean(body.enabled);

    if (!name) {
      return NextResponse.json(
        { error: "Interface name required" },
        { status: 400 }
      );
    }

    await setInterfaceEnabled(name, enabled);
    setTimeout(() => forcePoll(), 800);

    return NextResponse.json({
      ok: true,
      message: `${name} is now ${enabled ? "enabled" : "shutdown"}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** DELETE – remove a loopback */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const number = Number(searchParams.get("number"));
    if (!Number.isInteger(number)) {
      return NextResponse.json(
        { error: "Query param ?number= required" },
        { status: 400 }
      );
    }

    await deleteLoopback(number);
    setTimeout(() => forcePoll(), 800);

    return NextResponse.json({
      ok: true,
      message: `Loopback${number} deleted`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
