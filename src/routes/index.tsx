import { createFileRoute, Link } from "@tanstack/react-router";
import { SimMap } from "@/components/sim/SimMap";
import { EventLog } from "@/components/sim/EventLog";
import { ControlCenter } from "@/components/sim/ControlCenter";
import { PickupWorkflow } from "@/components/sim/PickupWorkflow";
import { Card, CardTitle, Chip, PopButton, Stat } from "@/components/sim/ui";
import { activePickup, rewardPoints, runPickupSimulation, runScenario, totals } from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { kg, num } from "@/lib/simulation/format";
import { REWARD_PRODUCTS } from "@/lib/simulation/config";

import { useState, useEffect } from "react";
import { useBackend } from "@/hooks/use-backend";
import {
  getPickups as getBackendPickups,
  getAnalyticsOverview,
  runLiveBackendLifecycle,
  type ApiOverviewStats,
  type ApiPickup,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoCycle — E-Waste Operations Dashboard" },
      {
        name: "description",
        content:
          "Full e-waste lifecycle: pickup request, collector movement, sorting, recycling, certificate and reward points.",
      },
      { property: "og:title", content: "EcoCycle — E-Waste Operations Dashboard" },
      {
        property: "og:description",
        content: "E-waste collection and recycling operations. Live backend synced.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useSim();
  const { isOnline } = useBackend();
  const t = totals(s);
  const pickup = activePickup(s);
  const latestBatch = s.batches[0];
  const customer = s.customers.find((c) => c.id === s.currentCustomerId) ?? s.customers[0];
  const latestCert = s.certificates[0];

  const [backendStats, setBackendStats] = useState<ApiOverviewStats | null>(null);
  const [backendPickups, setBackendPickups] = useState<ApiPickup[]>([]);
  const [lifecycleStep, setLifecycleStep] = useState<string | null>(null);

  useEffect(() => {
    if (isOnline) {
      getAnalyticsOverview().then(setBackendStats).catch(console.warn);
      getBackendPickups().then(setBackendPickups).catch(console.warn);
    }
  }, [isOnline]);

  const handleRunSimulation = async () => {
    if (isOnline && backendPickups.length > 0) {
      const targetPickup = backendPickups.find((p) => p.status !== "COMPLETED") || backendPickups[0];
      if (targetPickup) {
        setLifecycleStep("Starting live backend lifecycle...");
        const res = await runLiveBackendLifecycle(
          targetPickup.id,
          targetPickup.estimated_weight_g || 4800,
          (step) => setLifecycleStep(step),
        );
        getAnalyticsOverview().then(setBackendStats).catch(console.warn);
        getBackendPickups().then(setBackendPickups).catch(console.warn);
        setTimeout(() => setLifecycleStep(null), 3500);
        if (!res.success && pickup) {
          runPickupSimulation(pickup.id);
        }
      } else if (pickup) {
        runPickupSimulation(pickup.id);
      }
    } else if (pickup) {
      runPickupSimulation(pickup.id);
    }
  };

  const displayPickupsCount = isOnline && backendStats ? backendStats.total_pickups : t.pickups;
  const displayCollectedKg = isOnline && backendStats ? backendStats.total_weight_kg : t.collectedKg;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime/40 px-3 py-1.5 text-xs font-semibold">
            <span className={`size-2 rounded-full ${isOnline ? "bg-leaf animate-pulse" : "bg-leaf"}`} />
            {isOnline ? "⚡ Live Backend Connected · SQLite/PostgreSQL" : `Simulation ${s.settings.running ? "running" : "paused"}`} ·{" "}
            {s.activeScenarios.length} active scenario{s.activeScenarios.length === 1 ? "" : "s"}
          </div>
          <h1 className="font-display text-[clamp(2.6rem,6vw,4.75rem)] leading-[0.92] font-bold">
            Recycle e-waste,
            <br />
            <span className="text-leaf">watch it come</span>
            <br />
            <span className="text-coral">back to life.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            A full e-waste lifecycle simulator — from pickup request to recovered material, reward points and
            certificate. {isOnline ? "Connected directly to your FastAPI backend." : "Every step is a simulated, reproducible demo."}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <PopButton
              tone="ink"
              className="px-6 py-4 text-base"
              onClick={handleRunSimulation}
              disabled={!pickup && (!isOnline || !backendPickups.length)}
            >
              ▶ Run Pickup Simulation
            </PopButton>
            <PopButton tone="outline" className="px-6 py-4 text-base" onClick={() => runScenario("lifecycle")}>
              🎲 Generate Scenario
            </PopButton>
          </div>
          {lifecycleStep ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun/40 px-3.5 py-2 text-xs font-semibold text-sun-foreground animate-pulse">
              <span className="size-2 rounded-full bg-sun" /> {lifecycleStep}
            </div>
          ) : null}
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-4">
            <div>
              <div className="font-display text-3xl font-bold">{num(displayPickupsCount)}</div>
              <div className="text-xs font-medium text-muted-foreground">Pickups</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">
                {num(displayCollectedKg)} <span className="text-base text-muted-foreground">kg</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">E-Waste Weight</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-leaf">{t.recoveryPct}%</div>
              <div className="text-xs font-medium text-muted-foreground">Recovery Rate</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <SimMap />
        </div>
      </section>

      <ControlCenter />

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardTitle
            title="Simulated Pickup Workflow"
            badge={<Chip tone="lime">{pickup?.id ?? "No simulated pickup"}</Chip>}
          />
          {pickup ? (
            <>
              <PickupWorkflow pickup={pickup} />
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-cream p-3">
                  <div className="text-[11px] font-semibold text-muted-foreground">Estimated</div>
                  <div className="font-display text-xl font-bold">{kg(pickup.estimatedKg)}</div>
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <div className="text-[11px] font-semibold text-muted-foreground">Simulated Actual</div>
                  <div className="font-display text-xl font-bold text-leaf">
                    {pickup.actualKg ? kg(pickup.actualKg) : "—"}
                  </div>
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <div className="text-[11px] font-semibold text-muted-foreground">Simulated Reward</div>
                  <div className="font-display text-xl font-bold text-coral">
                    {pickup.actualKg ? `${rewardPoints(pickup.actualKg, s.settings.pointsPerKg)} pts` : "—"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No simulated pickup yet. Use “Launch Demo” or create one from the Pickups page.
            </p>
          )}
        </Card>

        <EventLog className="lg:col-span-5" />
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Simulated Customers" value={num(t.customers)} sub={`${num(t.points)} simulated points issued`} />
        <Stat
          label="Simulated Agents"
          value={num(s.agents.length)}
          sub={`${s.agents.filter((a) => a.status !== "IDLE").length} active · ${
            s.agents.filter((a) => a.status === "IDLE").length
          } idle`}
        />
        <Stat
          label="Simulated Centers"
          value={num(s.centers.length)}
          sub={
            s.centers[0]
              ? `${s.centers[0].name} at ${Math.round((s.centers[0].inventoryKg / s.centers[0].capacityKg) * 100)}% capacity`
              : undefined
          }
        />
        <Stat label="Simulated Batches" value={num(t.batches)} sub={`${num(t.certificates)} simulation certificates`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardTitle
            title="Simulated Recycling Pipeline"
            badge={
              <Chip>
                {latestBatch ? `${latestBatch.id} · ${kg(latestBatch.inputKg)}` : "No simulated batch"}
              </Chip>
            }
          />
          {latestBatch?.sorting ? (
            <>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <PipelineStage label="Collected" value={kg(latestBatch.inputKg)} tone="bg-leaf text-leaf-foreground" />
                <Arrow />
                <PipelineStage
                  label="Sorted"
                  value={kg(latestBatch.sorting.recyclable + latestBatch.sorting.reusable)}
                  tone="bg-sky text-sky-foreground"
                />
                <Arrow />
                <PipelineStage
                  label="Processed"
                  value={kg(latestBatch.recoveredKg ?? 0)}
                  tone="bg-sun text-sun-foreground"
                />
                <Arrow />
                <PipelineStage
                  label="Recovered"
                  value={kg(latestBatch.recoveredKg ?? 0)}
                  tone="bg-coral text-coral-foreground"
                />
                <Arrow />
                <PipelineStage
                  label="Residual"
                  value={kg(latestBatch.sorting.residual)}
                  tone="bg-ink text-ink-foreground"
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(latestBatch.materials ?? {})
                  .slice(0, 4)
                  .map(([name, value]) => (
                    <div key={name} className="rounded-2xl bg-cream p-3">
                      <div className="text-[11px] font-semibold text-muted-foreground">{name}</div>
                      <div className="font-display text-lg font-bold">{kg(value)}</div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 rounded-2xl border border-leaf/20 bg-leaf/10 p-3 text-sm">
                <span className="font-semibold text-leaf">Estimated CO₂e avoided:</span>{" "}
                <span className="font-display font-bold">{kg(latestBatch.co2eKg ?? 0)} CO₂e</span>{" "}
                <span className="text-muted-foreground">· simulated estimate, not a verified measurement</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No simulated batch processed yet.</p>
          )}
        </Card>

        <Card className="lg:col-span-5">
          <CardTitle
            title="Simulated Rewards"
            badge={
              <span className="font-display text-2xl font-bold text-coral">
                {num(customer?.points ?? 0)} <span className="text-sm text-muted-foreground">pts</span>
              </span>
            }
          />
          <div className="space-y-3">
            {REWARD_PRODUCTS.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                <div className="grid size-11 place-items-center rounded-xl bg-lime/60 text-lg">{p.emoji}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.points} pts</div>
                </div>
                <Link
                  to="/rewards"
                  className="rounded-full bg-ink px-3 py-2 text-xs font-bold text-ink-foreground"
                >
                  Redeem
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink p-4 text-ink-foreground">
            <div className="grid size-10 place-items-center rounded-xl bg-lime text-lg text-lime-foreground">📜</div>
            <div className="flex-1">
              <div className="font-display text-sm font-bold">{latestCert?.id ?? "No certificate yet"}</div>
              <div className="text-[11px] opacity-60">
                Simulation Certificate — not a real recycling certificate
              </div>
            </div>
            {latestCert ? (
              <Link
                to="/verify/simulation/$certificateId"
                params={{ certificateId: latestCert.id }}
                className="rounded-full bg-lime px-3 py-2 text-xs font-bold text-lime-foreground"
              >
                View
              </Link>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}

function PipelineStage({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`shrink-0 rounded-2xl px-4 py-3 text-center ${tone}`}>
      <div className="text-xs font-bold">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}

const Arrow = () => <div className="shrink-0 text-xl text-muted-foreground">→</div>;
