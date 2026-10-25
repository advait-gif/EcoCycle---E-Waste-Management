import { useSim } from "@/lib/simulation/react";
import { activePickup } from "@/lib/simulation/engine";
import { Chip } from "./ui";

export function SimMap({ compact = false }: { compact?: boolean }) {
  const s = useSim();
  const pickup = activePickup(s);
  const customer = s.customers.find((c) => c.id === pickup?.customerId) ?? s.customers[0];
  const agent = s.agents.find((a) => a.id === pickup?.agentId) ?? s.agents[0];
  const center = s.centers.find((c) => c.id === pickup?.centerId) ?? s.centers[0];
  if (!customer || !agent || !center) return null;

  const dx = customer.loc.x - agent.loc.x;
  const dy = customer.loc.y - agent.loc.y;
  const distanceKm = Math.round(Math.hypot(dx, dy) * 0.06 * 10) / 10;
  const etaMin = Math.max(1, Math.round(distanceKm * 2.5));

  return (
    <div className="ec-card h-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-lg font-bold">Simulated Map</div>
        <Chip tone="sky">SIM GPS</Chip>
      </div>
      <div
        className={`ec-grid relative overflow-hidden rounded-2xl border border-border bg-cream ${
          compact ? "aspect-[16/9]" : "aspect-[4/3]"
        }`}
      >
        <div
          className="ec-route absolute h-1"
          style={{
            left: `${Math.min(agent.loc.x, customer.loc.x)}%`,
            top: `${Math.min(agent.loc.y, customer.loc.y)}%`,
            width: `${Math.abs(dx)}%`,
          }}
        />
        <Marker x={center.loc.x} y={center.loc.y} emoji="🏭" label={center.name} tone="bg-ink text-ink-foreground" />
        {s.recyclers.map((r) => (
          <Marker key={r.id} x={r.loc.x} y={r.loc.y} emoji="⚙️" label={r.name} tone="bg-sun text-sun-foreground" />
        ))}
        <Marker x={customer.loc.x} y={customer.loc.y} emoji="📍" label={customer.name} tone="bg-sky text-sky-foreground" />
        <Marker
          x={agent.loc.x}
          y={agent.loc.y}
          emoji="🚚"
          label={agent.name}
          tone="bg-coral text-coral-foreground"
          big
        />
        <div className="absolute top-3 right-3 rounded-xl bg-ink/90 px-3 py-2 text-[11px] leading-tight text-ink-foreground">
          <div className="font-mono font-bold text-lime">{distanceKm} km</div>
          <div className="opacity-80">ETA {etaMin} min · Live Transit</div>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-muted-foreground flex items-center justify-between">
        <span>📍 Bengaluru Urban Metro · Live Collection &amp; Facility Network</span>
        <span className="font-mono text-leaf">GPS Active</span>
      </p>
    </div>
  );
}

function Marker({
  x,
  y,
  emoji,
  label,
  tone,
  big,
}: {
  x: number;
  y: number;
  emoji: string;
  label: string;
  tone: string;
  big?: boolean;
}) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-500"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className={`${big ? "size-11 text-lg" : "size-9 text-sm"} grid place-items-center rounded-2xl ${tone}`}>
        {emoji}
      </div>
      <span className="mt-1 rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-sm">
        {label}
      </span>
    </div>
  );
}
