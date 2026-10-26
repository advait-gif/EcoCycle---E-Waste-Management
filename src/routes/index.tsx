import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardTitle, Chip, PopButton, SectionNote, Stat } from "@/components/sim/ui";
import { SimMap } from "@/components/sim/SimMap";
import { PickupWorkflow } from "@/components/sim/PickupWorkflow";
import { EventLog } from "@/components/sim/EventLog";
import { activePickup, totals } from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { REWARD_PRODUCTS } from "@/lib/simulation/config";
import { kg, num, rewardPoints } from "@/lib/simulation/format";
import { useBackend } from "@/hooks/use-backend";
import {
  getAnalyticsOverview,
  getPickups as getBackendPickups,
  getPublicStats,
  type PublicStats,
  type ApiOverviewStats,
  type ApiPickup,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoCycle — E-Waste Marketplace & Operations Dashboard" },
      {
        name: "description",
        content:
          "India's premier marketplace for responsible e-waste management: doorstep pickups, verified independent collectors, authorized recyclers, and transparent chain of custody.",
      },
      { property: "og:title", content: "EcoCycle — E-Waste Marketplace & Operations Dashboard" },
      {
        property: "og:description",
        content: "Track live e-waste collections, verified chain of custody, and environmental sustainability impact.",
      },
    ],
  }),
  component: DashboardPage,
});

function Arrow() {
  return <span className="text-xl text-muted-foreground select-none">→</span>;
}

function DashboardPage() {
  const s = useSim();
  const t = totals(s);
  const { isOnline } = useBackend();
  const pickup = activePickup(s);
  const latestBatch = s.batches[0];
  const customer = s.customers.find((c) => c.id === s.currentCustomerId) ?? s.customers[0];
  const latestCert = s.certificates[0];

  const [backendStats, setBackendStats] = useState<ApiOverviewStats | null>(null);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [backendPickups, setBackendPickups] = useState<ApiPickup[]>([]);

  useEffect(() => {
    if (isOnline) {
      getPublicStats().then(setPublicStats).catch(() => {});
      if (typeof window !== "undefined" && localStorage.getItem("ecocycle_current_role") === "ADMIN") {
        getAnalyticsOverview().then(setBackendStats).catch(() => {});
      }
      getBackendPickups().then(setBackendPickups).catch(() => {});
    }
  }, [isOnline]);

  const displayPickupsCount = publicStats?.completed_pickups ?? backendStats?.total_pickups ?? (backendPickups.length || t.pickups);
  const displayCollectedKg = publicStats?.collected_kg ?? backendStats?.total_weight_kg ?? t.collectedKg;
  const displayPointsIssued = publicStats?.total_points ?? backendStats?.points_issued ?? t.points;
  const displayRecoveryPct = publicStats?.recovery_rate_pct ?? t.recoveryPct;
  const displayCo2e = publicStats?.co2e_kg ?? t.co2eKg;

  return (
    <div className="space-y-8">
      {/* Hero Marketplace Banner */}
      <section className="grid gap-8 lg:grid-cols-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-leaf/10 px-3.5 py-1.5 text-xs font-bold text-leaf shadow-sm">
            <span className="size-2 rounded-full bg-leaf animate-pulse" />
            <span>Bengaluru Metro Operations Active · CPCB Compliance Ready</span>
          </div>

          <h1 className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] leading-[0.94] font-extrabold tracking-tight">
            Dispose of e-waste responsibly.
            <br />
            <span className="text-leaf">Certified recycling</span> &amp;
            <br />
            <span className="text-coral">instant eco-rewards.</span>
          </h1>

          <p className="max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            EcoCycle connects households and businesses directly with verified independent collectors and
            government-authorized recycling facilities. Full chain-of-custody tracking with verified weights at every handover.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/pickups"
              className="font-display inline-flex items-center gap-2.5 rounded-full bg-leaf px-7 py-4 text-base font-bold text-white shadow-md hover:bg-leaf/90 transition-all active:translate-y-0.5"
            >
              <span>📦</span>
              <span>Schedule Doorstep Pickup</span>
            </Link>
            <Link
              to="/rewards"
              className="font-display inline-flex items-center gap-2.5 rounded-full border-2 border-border bg-card px-6 py-3.5 text-base font-bold text-foreground hover:bg-cream hover:border-leaf transition-all active:translate-y-0.5"
            >
              <span>🌱</span>
              <span>View Eco-Rewards</span>
            </Link>
          </div>

          {/* Quick Key Metrics */}
          <div className="pt-4 grid grid-cols-3 gap-6 max-w-lg border-t border-border/80">
            <div>
              <div className="font-display text-3xl font-extrabold">{num(displayPickupsCount)}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pickups Completed</div>
            </div>
            <div>
              <div className="font-display text-3xl font-extrabold">
                {num(displayCollectedKg)} <span className="text-sm font-semibold text-muted-foreground">kg</span>
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">E-Waste Diverted</div>
            </div>
            <div>
              <div className="font-display text-3xl font-extrabold text-leaf">{displayRecoveryPct}%</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recovery Rate</div>
            </div>
          </div>
        </div>

        {/* Live Network Activity Map */}
        <div className="lg:col-span-5">
          <SimMap />
        </div>
      </section>

      {/* Chain of Custody & Active Pickup Tracking */}
      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardTitle
            title="Active Chain of Custody &amp; Pickup Tracking"
            badge={
              <Chip tone="lime">
                {pickup ? `Pickup ID: ${pickup.id}` : "Live Tracking Available"}
              </Chip>
            }
          />
          {pickup ? (
            <>
              <PickupWorkflow pickup={pickup} />
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-cream p-3.5 border border-border/40">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase">Estimated Weight</div>
                  <div className="font-display text-xl font-bold mt-0.5">{kg(pickup.estimatedKg)}</div>
                </div>
                <div className="rounded-2xl bg-cream p-3.5 border border-border/40">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase">Verified Scale Weight</div>
                  <div className="font-display text-xl font-bold text-leaf mt-0.5">
                    {pickup.actualKg ? kg(pickup.actualKg) : "Pending weighing"}
                  </div>
                </div>
                <div className="rounded-2xl bg-cream p-3.5 border border-border/40">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase">Eco-Reward Points</div>
                  <div className="font-display text-xl font-bold text-coral mt-0.5">
                    {pickup.actualKg ? `${rewardPoints(pickup.actualKg, s.settings.pointsPerKg)} pts` : "Calculating..."}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="text-3xl">📦</div>
              <div className="text-sm font-semibold">No active pickup currently in transit.</div>
              <Link
                to="/pickups"
                className="inline-block rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-ink-foreground"
              >
                Create a New Pickup Request
              </Link>
            </div>
          )}
        </Card>

        {/* Real-time Event Stream / Compliance Audit Trail */}
        <EventLog className="lg:col-span-5" />
      </section>

      {/* Operations Overview KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Registered Households &amp; Businesses"
          value={num(t.customers)}
          sub={`${num(displayPointsIssued)} reward points credited`}
        />
        <Stat
          label="Verified Field Collectors"
          value={num(s.agents.length)}
          sub={`${s.agents.filter((a) => a.status !== "IDLE").length} on duty · GPS tracked`}
        />
        <Stat
          label="Authorized Recycling Facilities"
          value={num(s.centers.length)}
          sub="CPCB Licensed &amp; Audited"
        />
        <Stat
          label="Processed Material Batches"
          value={num(t.batches)}
          sub={`${num(t.certificates)} Green Certificates Issued`}
        />
      </section>

      {/* Material Recovery & Environmental Impact */}
      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardTitle
            title="Material Recovery &amp; Circular Economy Pipeline"
            badge={
              <Chip>
                {latestBatch ? `Batch ${latestBatch.id} · ${kg(latestBatch.inputKg)} Intake` : "Facility Live Pipeline"}
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
                  label="Safe Residual"
                  value={kg(latestBatch.sorting.residual)}
                  tone="bg-ink text-ink-foreground"
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(latestBatch.materials ?? {})
                  .slice(0, 4)
                  .map(([name, value]) => (
                    <div key={name} className="rounded-2xl bg-cream p-3 border border-border/40">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase">{name}</div>
                      <div className="font-display text-lg font-bold">{kg(value)}</div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 rounded-2xl border border-leaf/30 bg-leaf/10 p-3 text-sm flex items-center justify-between">
                <div>
                  <span className="font-bold text-leaf">Verified GHG Reduction:</span>{" "}
                  <span className="font-display font-extrabold">{kg(latestBatch.co2eKg ?? 0)} CO₂e avoided</span>
                </div>
                <span className="text-xs font-semibold text-leaf uppercase tracking-wider">CPCB Method Compliant</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Facility material recovery manifests update automatically upon recycler batch verification.
            </p>
          )}
        </Card>

        {/* Eco-Rewards & Sustainability Certificate Card */}
        <Card className="lg:col-span-5">
          <CardTitle
            title="Eco-Rewards &amp; Green Certificate"
            badge={
              <span className="font-display text-2xl font-bold text-coral">
                {num(customer?.points ?? 0)} <span className="text-sm font-semibold text-muted-foreground">pts</span>
              </span>
            }
          />
          <div className="space-y-3">
            {REWARD_PRODUCTS.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3 border border-border/40">
                <div className="grid size-11 place-items-center rounded-xl bg-lime/60 text-lg">{p.emoji}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{p.name}</div>
                  <div className="text-[11px] font-semibold text-muted-foreground">{p.points} points</div>
                </div>
                <Link
                  to="/rewards"
                  className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-ink-foreground hover:bg-ink/80 transition-colors"
                >
                  Redeem
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink p-4 text-ink-foreground">
            <div className="grid size-10 place-items-center rounded-xl bg-lime text-lg text-lime-foreground">📜</div>
            <div className="flex-1">
              <div className="font-display text-sm font-bold">{latestCert?.id ?? "EcoCycle Verified Certificate"}</div>
              <div className="text-[11px] opacity-70">
                Authorized Recycling Certificate &amp; Chain of Custody Record
              </div>
            </div>
            {latestCert ? (
              <Link
                to="/verify/simulation/$certificateId"
                params={{ certificateId: latestCert.id }}
                className="rounded-full bg-lime px-3.5 py-1.5 text-xs font-bold text-lime-foreground hover:opacity-90 transition-opacity"
              >
                Inspect
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
    <div className={`shrink-0 rounded-2xl px-4 py-3 text-center ${tone} shadow-sm`}>
      <div className="text-xs font-semibold uppercase tracking-wider">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}
