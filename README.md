# Cisco Catalyst 9000 Network Monitor

Real-time web application that monitors a Cisco IOS-XE device (Catalyst 9000 series / DevNet Sandbox) for:

- Interface creation / deletion
- Link (operational) status changes (up / down)
- Admin state changes (shutdown / no shutdown)

When an event is detected the UI updates immediately and plays a short beep + optional text-to-speech announcement.

## Features

- Live interface inventory table with admin/oper status
- Server-Sent Events (SSE) event stream
- Audio beep + browser Text-to-Speech
- Demo panel: create a loopback, shut it down, bring it back up, delete it
- Works against Cisco DevNet Sandbox (Always-On or reservation)

## Prerequisites

- Node.js 18+ (recommended 20+)
- npm
- A Cisco DevNet account and a launched Catalyst 9000 sandbox
  https://devnetsandbox.cisco.com/

## Quick start

```bash
cd cisco-monitor
npm install
cp .env.example .env.local
# Edit .env.local with host, username and password from the sandbox portal
npm run dev
```

Open http://localhost:3000

Example `.env.local`:

```
CISCO_HOST=devnetsandboxiosxec8k.cisco.com
CISCO_PORT=443
CISCO_USERNAME=your_unique_user
CISCO_PASSWORD=your_unique_pass
POLL_INTERVAL_MS=3000
```

## Demo walkthrough

1. Confirm the status bar shows **Connected** and the hostname.
2. In Demo Controls set a free loopback number (e.g. 100) and an IP.
3. Click **Create Loopback**.
4. Within a few seconds Live Events shows "Interface Loopback100 was created" (beep + TTS).
5. Click **Shutdown**. You receive a link-down / admin-down event.
6. Click **No Shutdown** then **Delete** to clean up.

## Project structure

```
src/
  app/
    page.tsx                 # Main dashboard
    layout.tsx
    globals.css
    api/
      status/route.ts        # Connectivity + start monitor
      interfaces/route.ts    # GET interface list
      events/route.ts        # SSE stream
      loopback/route.ts      # Create / shutdown / delete
  components/
    StatusBar.tsx
    InterfaceTable.tsx
    EventFeed.tsx            # SSE client + audio/TTS
    DemoPanel.tsx
  lib/
    cisco.ts                 # RESTCONF client
    monitor.ts               # Polling + diff engine
    event-bus.ts             # In-memory pub/sub
    types.ts
```

## How it works

1. RESTCONF talks to the switch over HTTPS (JSON + YANG).
2. A background poller (lib/monitor.ts) runs inside the Next.js Node process every few seconds, fetches the operational interface list, and diffs it against the previous snapshot.
3. Detected changes are published on an in-memory EventEmitter.
4. The /api/events route exposes those events as Server-Sent Events.
5. The browser EventSource receives them, updates the UI, plays a beep (Web Audio API) and optionally speaks the message (Web Speech API).

Polling is reliable on shared sandboxes. You can later replace it with YANG-Push on-change telemetry for sub-second notifications.

## Packages used

| Package | Purpose |
|---------|---------|
| next | React framework (App Router, Route Handlers, SSE) |
| react / react-dom | UI library |
| typescript | Type safety |
| tailwindcss | Utility-first styling |
| postcss / autoprefixer | CSS processing |
| clsx | Conditional class names |
| lucide-react | Icons |
| eslint + eslint-config-next | Linting |

No extra realtime libraries are required – SSE is native.

## Sandbox notes

- Always-On sandboxes are shared. Use high loopback numbers and clean up.
- Never modify the management interface or AAA – the sandbox may reset the device.
- Self-signed certificates are common; the client disables TLS verification in development.
- Prefer a reservation lab when you need isolation for demos.

## License

MIT
