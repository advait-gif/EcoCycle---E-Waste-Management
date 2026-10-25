import { createFileRoute } from "@tanstack/react-router";
import { Card, CardTitle, Chip, PopButton, SectionNote, Stat } from "@/components/sim/ui";
import { ControlCenter } from "@/components/sim/ControlCenter";
import { EventLog } from "@/components/sim/EventLog";
import {
  clearDemoData,
  launchDemo,
  resetSimulation,
  runScenario,
  totals,
  updateFactor,
  updateSettings,
} from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { simClock } from "@/lib/simulation/format";
import { CATEGORIES, SCENARIOS } from "@/lib/simulation/config";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [
      { title: "Simulation Control Center — EcoCycle" },
      {
        name: "description",
        content:
          "Admin control center for the EcoCycle simulator: clock, scenarios, simulation parameters, event log and audit trail.",
      },
      { property: "og:title", content: "Simulation Control Center — EcoCycle" },
      {
        property: "og:description",
        content: "Start, pause, advance and reset the EcoCycle simulation and tune its demo parameters.",
      },
    ],
  }),
  component: ControlPage,
});

function ControlPage() {
  const s = useSim();
  const t = totals(s);
  const set = s.settings;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-bold">Simulation Control Center</h1>
        <SectionNote>
          Every control here affects simulated data only. Nothing outside the simulation environment is changed.
        </SectionNote>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Simulation Clock" value={simClock(s.clock)} sub={`Speed ${set.speed}x`} />
        <Stat label="System State" value={set.running ? "RUNNING" : "PAUSED"} tone={set.running ? "text-leaf" : "text-coral"} />
        <Stat label="Active Scenarios" value={s.activeScenarios.length || "—"} />
        <Stat label="Logged Events" value={s.events.length} />
      </section>

      <ControlCenter />

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardTitle title="Demo Scenarios" badge={<Chip tone="sun">🎲 Generate Scenario</Chip>} />
          <div className="grid gap-2 sm:grid-cols-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => runScenario(sc.id)}
                className="rounded-2xl bg-cream p-3 text-left transition-transform active:translate-y-0.5"
              >
                <div className="text-sm font-bold">{sc.name}</div>
                <div className="text-[11px] text-muted-foreground">{sc.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6">
          <CardTitle title="Simulation Parameters" badge={<Chip tone="cream">Simulation Data</Chip>} />
          <div className="space-y-3">
            <Field
              label="Default seed (deterministic)"
              value={set.seed}
              onChange={(v) => updateSettings({ seed: v })}
            />
            <NumField
              label="Points per simulated kg"
              value={set.pointsPerKg}
              step={1}
              onChange={(v) => updateSettings({ pointsPerKg: v })}
            />
            <NumField
              label="Estimated CO₂e per kg recovered"
              value={set.co2ePerKg}
              step={0.01}
              onChange={(v) => updateSettings({ co2ePerKg: v })}
            />
            <NumField
              label="Weight variance"
              value={set.weightVariance}
              step={0.01}
              onChange={(v) => updateSettings({ weightVariance: v })}
            />
            <NumField
              label="Agent travel speed"
              value={set.agentSpeed}
              step={0.01}
              onChange={(v) => updateSettings({ agentSpeed: v })}
            />
            <NumField
              label="Pickup step duration (simulated seconds)"
              value={set.stepSeconds}
              step={1}
              onChange={(v) => updateSettings({ stepSeconds: v })}
            />
            <NumField
              label="Failure probability"
              value={set.failureProbability}
              step={0.05}
              onChange={(v) => updateSettings({ failureProbability: v })}
            />
            <NumField
              label="Delay probability"
              value={set.delayProbability}
              step={0.05}
              onChange={(v) => updateSettings({ delayProbability: v })}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <PopButton tone="lime" onClick={() => launchDemo()}>
              🚀 Launch Demo
            </PopButton>
            <PopButton tone="outline" onClick={() => clearDemoData()}>
              🧹 Clear Demo Data
            </PopButton>
            <PopButton tone="coral" onClick={() => resetSimulation(set.seed)}>
              🔄 Reset Simulation
            </PopButton>
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle title="Recycling Factors (Simulation Parameters)" badge={<Chip tone="coral">Not verified rates</Chip>} />
        <SectionNote>
          These shares are demo parameters used by the sorting simulation. They are not verified real-world recovery
          rates.
        </SectionNote>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2">Category</th>
                <th>Reusable</th>
                <th>Recyclable</th>
                <th>Hazardous</th>
                <th>Residual</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const f = set.factors[c.id];
                return (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="py-2 font-semibold">
                      {c.emoji} {c.label}
                    </td>
                    {(["reusable", "recyclable", "hazardous", "residual"] as const).map((k) => (
                      <td key={k}>
                        <input
                          type="number"
                          step={0.01}
                          min={0}
                          max={1}
                          value={f[k]}
                          onChange={(e) => updateFactor(c.id, k, Number(e.target.value))}
                          className="w-20 rounded-lg border-2 border-input bg-card px-2 py-1 font-mono text-xs"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <EventLog />
        </div>
        <Card className="lg:col-span-5">
          <CardTitle title="Audit Log" badge={<Chip tone="cream">Simulation Event</Chip>} />
          <div className="max-h-[360px] space-y-2 overflow-auto">
            {s.audit.length === 0 ? <SectionNote>No simulated admin actions recorded yet.</SectionNote> : null}
            {s.audit.map((a) => (
              <div key={a.id} className="rounded-xl bg-cream p-3">
                <div className="text-sm font-semibold">{a.action}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {a.actor} · {simClock(a.at)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle title="Simulated KPIs" badge={<Chip tone="cream">Simulation Data</Chip>} />
        <div className="ec-grid grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Demo Customers" value={t.customers} />
          <Stat label="Simulated Pickups" value={t.pickups} />
          <Stat label="Simulated Collected" value={`${t.collectedKg} kg`} />
          <Stat label="Simulated Certificates" value={t.certificates} />
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border-2 border-input bg-card px-3 py-2 font-mono text-sm"
      />
    </label>
  );
}

function NumField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-xl border-2 border-input bg-card px-3 py-2 font-mono text-sm"
      />
    </label>
  );
}
