/**
 * Cisco IOS-XE RESTCONF client for Catalyst 9000 / DevNet Sandbox.
 *
 * Uses the native Cisco YANG models + IETF interfaces where helpful.
 * All calls go through the Next.js server (never from the browser).
 */

import type { CiscoInterface, NormalizedInterface } from "./types";

const HOST = process.env.CISCO_HOST || "devnetsandboxiosxec9k.cisco.com";
const PORT = process.env.CISCO_PORT || "443";
const USERNAME = process.env.CISCO_USERNAME || "";
const PASSWORD = process.env.CISCO_PASSWORD || "";

const BASE = `https://${HOST}:${PORT}/restconf`;

const HEADERS: HeadersInit = {
  Accept: "application/yang-data+json",
  "Content-Type": "application/yang-data+json",
};

function authHeader(): string {
  if (!USERNAME || !PASSWORD) {
    throw new Error(
      "CISCO_USERNAME and CISCO_PASSWORD must be set in .env.local"
    );
  }
  return "Basic " + Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
}

/** Low-level fetch wrapper that tolerates self-signed certs in development */
async function ciscoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  // In Node we need to allow self-signed certs from the sandbox
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...HEADERS,
      Authorization: authHeader(),
      ...(options.headers || {}),
    },
    // Next.js cache control – always fresh for monitoring
    cache: "no-store",
  });

  return res;
}

/** Map raw Cisco oper-status strings to a boolean */
function isOperUp(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s.includes("ready") ||
    s === "up" ||
    s === "if-oper-state-ready" ||
    s === "if-oper-up"
  );
}

function isAdminUp(enabled?: boolean, admin?: string): boolean {
  if (typeof enabled === "boolean") return enabled;
  if (!admin) return true;
  const s = admin.toLowerCase();
  return s.includes("up") || s === "if-state-up";
}

/** Normalize whatever shape the device returns into a consistent UI model */
export function normalizeInterface(raw: CiscoInterface): NormalizedInterface {
  const ipv4: string[] = [];
  if (raw.ipv4?.address) {
    for (const a of raw.ipv4.address) {
      if (a.ip) {
        ipv4.push(a.netmask ? `${a.ip}/${a.netmask}` : a.ip);
      }
    }
  }

  return {
    name: raw.name,
    description: raw.description || "",
    type: raw.type || "unknown",
    adminUp: isAdminUp(raw.enabled, raw["admin-status"]),
    operUp: isOperUp(raw["oper-status"]),
    operStatus: raw["oper-status"] || "unknown",
    mac: raw["phys-address"],
    speed: raw.speed != null ? String(raw.speed) : undefined,
    lastChange: raw["last-change"],
    ipv4,
  };
}

/**
 * GET operational interfaces.
 * Tries the Cisco native oper model first, falls back to IETF.
 */
export async function getInterfaces(): Promise<NormalizedInterface[]> {
  // 1. Prefer Cisco-IOS-XE-interfaces-oper (richer data)
  try {
    const res = await ciscoFetch(
      "/data/Cisco-IOS-XE-interfaces-oper:interfaces"
    );
    if (res.ok) {
      const data = await res.json();
      const list =
        data?.["Cisco-IOS-XE-interfaces-oper:interfaces"]?.interface ||
        data?.interface ||
        [];
      return (Array.isArray(list) ? list : [list]).map(normalizeInterface);
    }
  } catch {
    // fall through
  }

  // 2. Fallback – IETF interfaces (config + state)
  const res = await ciscoFetch("/data/ietf-interfaces:interfaces");
  if (!res.ok) {
    const body = await res.text();
    let hint = "";
    if (res.status === 401) {
      hint = " — Invalid credentials. Launch a fresh sandbox and copy the unique username/password into .env.local";
    } else if (res.status === 502 || res.status === 503) {
      hint = " — Sandbox unreachable (502/503). Check CISCO_HOST and that the Always-On lab is Active in the DevNet portal";
    }
    throw new Error(`Failed to fetch interfaces (${res.status})${hint}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const list =
    data?.["ietf-interfaces:interfaces"]?.interface ||
    data?.interface ||
    [];
  return (Array.isArray(list) ? list : [list]).map(normalizeInterface);
}

/**
 * Create a loopback interface via Cisco native model.
 * Example path: /data/Cisco-IOS-XE-native:native/interface/Loopback
 */
export async function createLoopback(opts: {
  number: number;
  ip?: string;
  netmask?: string;
  description?: string;
}): Promise<void> {
  const name = `Loopback${opts.number}`;
  const body: Record<string, unknown> = {
    "Cisco-IOS-XE-native:Loopback": {
      name: opts.number,
      description: opts.description || `Created by cisco-monitor at ${new Date().toISOString()}`,
    },
  };

  if (opts.ip) {
    (body["Cisco-IOS-XE-native:Loopback"] as Record<string, unknown>)[
      "ip"
    ] = {
      address: {
        "primary-addr": {
          address: opts.ip,
          mask: opts.netmask || "255.255.255.255",
        },
      },
    };
  }

  // PUT creates or replaces the whole list entry
  const res = await ciscoFetch(
    `/data/Cisco-IOS-XE-native:native/interface/Loopback=${opts.number}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );

  if (!res.ok && res.status !== 204) {
    // Some devices prefer POST to the collection
    const res2 = await ciscoFetch(
      `/data/Cisco-IOS-XE-native:native/interface/Loopback`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    if (!res2.ok && res2.status !== 201 && res2.status !== 204) {
      const text = await res2.text();
      throw new Error(`Create loopback failed (${res2.status}): ${text}`);
    }
  }
}

/**
 * Enable or disable (shutdown / no shutdown) any interface.
 * Works for Loopback, GigabitEthernet, etc.
 */
export async function setInterfaceEnabled(
  name: string,
  enabled: boolean
): Promise<void> {
  // Cisco native path uses different keys for different interface types.
  // For simplicity we use the IETF model which is more uniform.
  const body = {
    "ietf-interfaces:interface": {
      name,
      enabled,
    },
  };

  const encoded = encodeURIComponent(name);
  const res = await ciscoFetch(
    `/data/ietf-interfaces:interfaces/interface=${encoded}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );

  if (!res.ok && res.status !== 204) {
    // Fallback: try Cisco native for Loopback
    if (name.toLowerCase().startsWith("loopback")) {
      const num = name.replace(/loopback/i, "");
      const nativeBody = {
        "Cisco-IOS-XE-native:Loopback": {
          name: Number(num),
          shutdown: enabled ? undefined : [null], // presence of shutdown leaf = admin down
        },
      };
      // When enabling we need to remove the shutdown leaf – use a different approach
      if (enabled) {
        // DELETE the shutdown leaf if present
        await ciscoFetch(
          `/data/Cisco-IOS-XE-native:native/interface/Loopback=${num}/shutdown`,
          { method: "DELETE" }
        ).catch(() => {});
      } else {
        const r = await ciscoFetch(
          `/data/Cisco-IOS-XE-native:native/interface/Loopback=${num}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              "Cisco-IOS-XE-native:Loopback": {
                name: Number(num),
                shutdown: [null],
              },
            }),
          }
        );
        if (!r.ok && r.status !== 204) {
          const t = await r.text();
          throw new Error(`Shutdown failed (${r.status}): ${t}`);
        }
      }
      return;
    }
    const text = await res.text();
    throw new Error(`setInterfaceEnabled failed (${res.status}): ${text}`);
  }
}

/**
 * Delete a loopback interface.
 */
export async function deleteLoopback(number: number): Promise<void> {
  const res = await ciscoFetch(
    `/data/Cisco-IOS-XE-native:native/interface/Loopback=${number}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Delete loopback failed (${res.status}): ${text}`);
  }
}

/** Simple connectivity check */
export async function checkConnectivity(): Promise<{
  ok: boolean;
  hostname?: string;
  error?: string;
}> {
  try {
    const res = await ciscoFetch(
      "/data/Cisco-IOS-XE-native:native/hostname"
    );
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const hostname =
      data?.["Cisco-IOS-XE-native:hostname"] ||
      data?.hostname ||
      "unknown";
    return { ok: true, hostname: String(hostname) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
