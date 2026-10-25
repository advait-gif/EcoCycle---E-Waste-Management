import { nextEvent, resetSimulation, setRunning, setSpeed } from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";

const SPEEDS = [1, 2, 5, 10];

export function ControlCenter() {
  const s = useSim();
  return (
    <section className="rounded-3xl bg-ink p-5 text-ink-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <div className="font-display mr-2 text-lg font-bold">Marketplace Operations Dispatch</div>
        <button
          type="button"
          onClick={() => setRunning(true)}
          className="font-display rounded-xl bg-lime px-4 py-2.5 text-sm font-bold text-lime-foreground"
        >
          ▶ Start
        </button>
        <button
          type="button"
          onClick={() => setRunning(false)}
          className="rounded-xl bg-cream/10 px-4 py-2.5 text-sm font-semibold hover:bg-cream/20"
        >
          ⏸ Pause
        </button>
        <button
          type="button"
          onClick={() => nextEvent()}
          className="rounded-xl bg-cream/10 px-4 py-2.5 text-sm font-semibold hover:bg-cream/20"
        >
          ⏭ Next Event
        </button>
        <div className="flex items-center gap-1 rounded-xl bg-cream/10 p-1">
          <span className="px-2 text-[11px] font-semibold opacity-50">SPEED</span>
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => setSpeed(sp)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                s.settings.speed === sp ? "bg-sun text-sun-foreground" : ""
              }`}
            >
              {sp}x
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => resetSimulation()}
          className="rounded-xl bg-cream/10 px-4 py-2.5 text-sm font-semibold hover:bg-cream/20"
        >
          🔄 Reset
        </button>
        <div className="ml-auto flex items-center gap-2 text-[11px] opacity-60">
          <span className={`size-2 rounded-full bg-lime ${s.settings.running ? "animate-pulse" : "opacity-40"}`} />
          System state: {s.settings.running ? "RUNNING" : "PAUSED"}
        </div>
      </div>
    </section>
  );
}
