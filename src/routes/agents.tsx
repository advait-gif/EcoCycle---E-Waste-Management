import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardTitle, Chip, PopButton, SectionNote, Stat } from "@/components/sim/ui";
import { SimMap } from "@/components/sim/SimMap";
import { activePickup, runPickupSimulation } from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { kg } from "@/lib/simulation/format";
import { getPublicCollectors, type PublicCollector } from "@/lib/api";
import { useBackend } from "@/hooks/use-backend";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Verified Field Collectors — EcoCycle" },
      {
        name: "description",
        content: "Independent verified collection partners: KYC verified, digital scales equipped, and live dispatch across Bengaluru metro.",
      },
      { property: "og:title", content: "Verified Field Collectors — EcoCycle" },
      { property: "og:description", content: "Track active e-waste field collectors, duty status, and completion records." },
    ],
  }),
  component: CollectorsPage,
});

function CollectorsPage() {
  const s = useSim();
  const { isOnline } = useBackend();
  const [realCollectors, setRealCollectors] = useState<PublicCollector[]>([]);

  useEffect(() => {
    if (isOnline) {
      getPublicCollectors().then(setRealCollectors).catch(() => {});
    }
  }, [isOnline]);

  const pickup = activePickup(s);
  const totalKg = s.agents.reduce((t, a) => t + a.collectedKg, 0) + realCollectors.reduce((t, c) => t + c.collected_kg, 0);
  const totalCollectors = Math.max(s.agents.length, realCollectors.length);
  const activeCount = realCollectors.length > 0 
    ? realCollectors.filter(c => c.is_online).length 
    : s.agents.filter((a) => a.status !== "IDLE").length;
  const completedCount = realCollectors.length > 0
    ? realCollectors.reduce((t, c) => t + c.completed, 0)
    : s.agents.reduce((t, a) => t + a.completed, 0);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Verified Field Collectors</h1>
        <SectionNote>
          Independent collection partners verified through government ID, police clearance, and standardized e-waste weighing training.
        </SectionNote>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Verified Field Collectors" value={totalCollectors} />
        <Stat label="Active on Duty" value={activeCount} tone="text-leaf" />
        <Stat label="Completed Pickups" value={completedCount} />
        <Stat label="Total E-Waste Collected" value={kg(totalKg)} tone="text-leaf" />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SimMap compact />
        </div>
        <Card className="lg:col-span-6">
          <CardTitle
            title="Active Collector Fleet"
            badge={
              <Chip tone={realCollectors.length > 0 ? "leaf" : "lime"}>
                {realCollectors.length > 0 ? "⚡ Live PostgreSQL/SQLite Fleet" : "GPS Monitored"}
              </Chip>
            }
          />
          <div className="space-y-3 pt-1">
            {realCollectors.length > 0 ? (
              realCollectors.map((c) => (
                <div key={c.id} className="flex items-center gap-3.5 rounded-2xl bg-cream p-3.5 border border-border/40">
                  <div className="grid size-11 place-items-center rounded-2xl bg-ink text-lg text-white font-bold shadow-sm">
                    🛵
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">{c.name}</span>
                      <span className="rounded-full bg-leaf/20 px-1.5 py-0.2 text-[9px] font-extrabold text-leaf shrink-0">
                        CPCB KYC Verified
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {c.vehicle_type} ({c.vehicle_number}) · ★ {c.rating_avg} ({c.completed} orders)
                    </div>
                  </div>
                  <Chip tone={c.is_online ? "leaf" : "cream"}>
                    {c.status}
                  </Chip>
                </div>
              ))
            ) : (
              s.agents.map((a) => (
                <div key={a.id} className="flex items-center gap-3.5 rounded-2xl bg-cream p-3.5 border border-border/40">
                  <div className="grid size-11 place-items-center rounded-2xl bg-ink text-lg text-white font-bold shadow-sm">
                    🛵
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{a.name}</span>
                      <span className="rounded-full bg-leaf/20 px-1.5 py-0.2 text-[9px] font-extrabold text-leaf">
                        KYC Verified
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.completed} completed collections · {kg(a.collectedKg)} verified weight
                    </div>
                  </div>
                  <Chip tone={a.status === "IDLE" ? "cream" : "sun"}>
                    {a.status === "IDLE" ? "AVAILABLE" : a.status}
                  </Chip>
                </div>
              ))
            )}
          </div>
          {pickup ? (
            <PopButton className="mt-5 w-full py-3" tone="ink" onClick={() => runPickupSimulation(pickup.id)}>
              ⚡ Dispatch Collector to Pickup #{pickup.id}
            </PopButton>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
