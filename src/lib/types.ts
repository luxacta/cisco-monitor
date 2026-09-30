/** Interface operational / configuration data returned by RESTCONF */
export interface CiscoInterface {
  name: string;
  description?: string;
  type?: string;
  enabled?: boolean;
  /** Operational status: "if-oper-state-ready" | "if-oper-state-lower-layer-down" | etc. */
  "oper-status"?: string;
  "admin-status"?: string;
  "phys-address"?: string;
  speed?: string | number;
  mtu?: number;
  "last-change"?: string;
  ipv4?: {
    address?: Array<{ ip: string; netmask?: string; prefix?: string }>;
  };
}

/** Normalized interface for the UI */
export interface NormalizedInterface {
  name: string;
  description: string;
  type: string;
  adminUp: boolean;
  operUp: boolean;
  operStatus: string;
  mac?: string;
  speed?: string;
  lastChange?: string;
  ipv4: string[];
}

/** Event emitted when something interesting happens on the switch */
export type EventType =
  | "interface-created"
  | "interface-deleted"
  | "link-up"
  | "link-down"
  | "admin-up"
  | "admin-down"
  | "system";

export interface MonitorEvent {
  id: string;
  type: EventType;
  interfaceName: string;
  message: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
}

/** Payload for create-loopback API */
export interface CreateLoopbackRequest {
  number: number;
  ip?: string;
  netmask?: string;
  description?: string;
}

/** Payload for shutdown / no-shutdown */
export interface InterfaceActionRequest {
  name: string;
  enabled: boolean;
}
