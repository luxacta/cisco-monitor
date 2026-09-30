import { StatusBar } from "@/components/StatusBar";
import { InterfaceTable } from "@/components/InterfaceTable";
import { EventFeed } from "@/components/EventFeed";
import { DemoPanel } from "@/components/DemoPanel";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f1a]">
      {/* Header – matches screenshot style */}
      <header className="border-b border-slate-800/90 bg-[#0b1220]/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Cisco Catalyst 9000{" "}
              <span className="text-[#049fd9]">Monitor</span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Real-time interface events · DevNet Sandbox
            </p>
          </div>
          <StatusBar />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DemoPanel />
          <EventFeed />
        </div>
        <InterfaceTable />
        <footer className="text-center text-xs text-slate-600 pb-6">
          Built with Next.js · RESTCONF · Server-Sent Events · Web Speech API
        </footer>
      </div>
    </main>
  );
}
