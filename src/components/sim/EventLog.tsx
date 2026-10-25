import { useSim } from "@/lib/simulation/react";
import { simTime } from "@/lib/simulation/format";

const TONES: Record<string, string> = {
  SIM_PICKUP_CREATED: "text-lime",
  SIM_AGENT_ASSIGNED: "text-lime",
  SIM_AGENT_ARRIVED: "text-lime",
  SIM_WEIGHT_VERIFIED: "text-sun",
  SIM_BATCH_CREATED: "text-sky",
  SIM_RECYCLING_COMPLETED: "text-sky",
  SIM_CERTIFICATE_GENERATED: "text-coral",
  SIM_REWARD_CREDITED: "text-coral",
};

export function EventLog({ limit = 9, className = "" }: { limit?: number; className?: string }) {
  const s = useSim();
  const events = s.events.slice(0, limit);

  return (
    <div className={`rounded-3xl bg-ink p-6 text-ink-foreground shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between border-b border-ink/40 pb-3">
        <div>
          <div className="font-display text-lg font-bold">Marketplace Audit Trail</div>
          <div className="text-[11px] opacity-60">Immutable chain-of-custody log</div>
        </div>
        <span className="font-mono text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-bold uppercase">
          Live Stream
        </span>
      </div>
      <div className="space-y-2.5 font-mono text-[12px]">
        {events.length === 0 ? <div className="opacity-50">Awaiting marketplace events...</div> : null}
        {events.map((e) => {
          const cleanType = e.type.replace(/^SIM_/, "");
          return (
            <div key={e.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="opacity-80 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-current" />
                <span className={TONES[e.type] ?? "text-ink-foreground"}>{cleanType}</span>
              </span>
              <span className="tabular-nums font-mono opacity-50 text-[11px]">{simTime(e.at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
