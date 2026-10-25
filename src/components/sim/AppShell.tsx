import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { launchDemo } from "@/lib/simulation/engine";
import { useSim, useSimulationLoop } from "@/lib/simulation/react";
import { simClock } from "@/lib/simulation/format";
import { useBackend } from "@/hooks/use-backend";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/pickups", label: "Pickups" },
  { to: "/agents", label: "Agents" },
  { to: "/centers", label: "Centers" },
  { to: "/recycling", label: "Recycling" },
  { to: "/rewards", label: "Rewards" },
  { to: "/control", label: "Control" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const s = useSim();
  const { isOnline } = useBackend();
  useSimulationLoop();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-6 py-2.5 text-[13px]">
          {isOnline ? (
            <span className="font-display inline-flex items-center gap-1.5 rounded-full bg-leaf px-2.5 py-1 text-[11px] font-bold tracking-wide text-leaf-foreground">
              ⚡ BACKEND SYNCED
            </span>
          ) : (
            <span className="font-display inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold tracking-wide text-lime-foreground">
              🧪 SIMULATION MODE
            </span>
          )}
          <span className="opacity-70">
            {isOnline
              ? "Live connected to Python FastAPI backend (http://localhost:8000). Real DB records & verified rewards active."
              : "All data, pickups, recycling and rewards are simulated. No real-world operations occur."}
          </span>
          <span className="ml-auto hidden font-mono text-[11px] opacity-50 sm:inline">
            {isOnline ? "FASTAPI · :8000" : `SIM-ENV · seed ${s.settings.seed}`}
          </span>
        </div>
      </div>

      <header className="border-b-2 border-border bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-6 px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="font-display grid size-10 place-items-center rounded-2xl bg-leaf text-xl font-bold text-leaf-foreground">
              ♻
            </div>
            <div>
              <div className="font-display text-xl leading-none font-bold">EcoCycle</div>
              <div className="text-[11px] font-medium text-muted-foreground">E-Waste Recycling Simulator</div>
            </div>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 text-sm font-medium lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "bg-ink text-ink-foreground" }}
                inactiveProps={{ className: "hover:bg-ink/5" }}
                className="rounded-full px-3 py-2"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-cream px-3 py-1.5 md:flex">
              <span className="text-[11px] font-semibold text-muted-foreground">SIM CLOCK</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{simClock(s.clock)}</span>
              <span className="rounded bg-sun px-1.5 py-0.5 text-[10px] font-bold text-sun-foreground">
                {s.settings.speed}x
              </span>
            </div>
            <button
              type="button"
              onClick={() => launchDemo()}
              className="font-display rounded-full bg-coral px-4 py-2.5 text-sm font-bold text-coral-foreground shadow-pop-coral active:translate-y-0.5"
            >
              Launch Demo
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>

      <footer className="mx-auto max-w-[1440px] px-6 pb-8 text-center text-xs text-muted-foreground">
        EcoCycle is a simulation &amp; educational demo. It performs no real-world collection, recycling, payment,
        logistics, communication or environmental certification.
      </footer>
    </div>
  );
}
