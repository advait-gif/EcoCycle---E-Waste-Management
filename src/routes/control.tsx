import { createFileRoute } from "@tanstack/react-router";
import { Card, CardTitle, Chip, PopButton, SectionNote, Stat } from "@/components/sim/ui";
import { EventLog } from "@/components/sim/EventLog";
import {
  totals,
  updateFactor,
  updateSettings,
} from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { CATEGORIES } from "@/lib/simulation/config";
import { useBackend } from "@/hooks/use-backend";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [
      { title: "Operations Console & Compliance Audit — EcoCycle" },
      {
        name: "description",
        content:
          "Admin operations console for EcoCycle: dispatch policies, CPCB mass-balance factors, system health, and immutable audit trail.",
      },
      { property: "og:title", content: "Operations Console — EcoCycle" },
      {
        property: "og:description",
        content: "Configure marketplace dispatch rules, statutory recovery factors, and review system audit events.",
      },
    ],
  }),
  component: ControlPage,
});

function ControlPage() {
  const s = useSim();
  const t = totals(s);
  const set = s.settings;
  const { isOnline } = useBackend();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Marketplace Operations Console</h1>
        <SectionNote>
          Central operations control: statutory recycling mass-balance factors, service area dispatch thresholds, and immutable compliance audit trail.
        </SectionNote>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Platform Service Engine" value={isOnline ? "FASTAPI LIVE" : "STANDALONE"} tone="text-leaf" />
        <Stat label="Primary Dispatch Metro" value="Bengaluru Urban" sub="10 km max radius" />
        <Stat label="Compliance Standard" value="CPCB Rules 2022" sub="MoEFCC Registered" />
        <Stat label="Audit Log Entries" value={s.events.length} tone="text-foreground" />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        {/* Marketplace Dispatch Rules */}
        <Card className="lg:col-span-6">
          <CardTitle title="Marketplace Dispatch &amp; Reward Policies" badge={<Chip tone="lime">Active Rules</Chip>} />
          <div className="space-y-3.5 pt-1">
            <NumField
              label="Reward Points Credited per Kilogram (Base Rate)"
              value={set.pointsPerKg}
              step={1}
              onChange={(v) => updateSettings({ pointsPerKg: v })}
            />
            <NumField
              label="Greenhouse Gas Avoidance Factor (kg CO₂e per kg E-Waste)"
              value={set.co2ePerKg}
              step={0.01}
              onChange={(v) => updateSettings({ co2ePerKg: v })}
            />
            <NumField
              label="Weight Tolerance Threshold (Auto-Dispute Trigger %)"
              value={set.weightVariance}
              step={0.01}
              onChange={(v) => updateSettings({ weightVariance: v })}
            />
            <NumField
              label="Collector Response SLA Timeout (Minutes)"
              value={Math.round(set.stepSeconds / 60) || 5}
              step={1}
              onChange={(v) => updateSettings({ stepSeconds: v * 60 })}
            />
          </div>
          <div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground leading-relaxed">
            Policy updates take effect immediately for all active dispatch broadcasts and new pickup requests.
          </div>
        </Card>

        {/* Live Compliance Audit Log */}
        <EventLog className="lg:col-span-6" />
      </section>

      {/* Statutory Material Recovery Yield Standards */}
      <Card>
        <CardTitle title="Statutory Material Sorting Yield Factors" badge={<Chip tone="lime">CPCB Schedule Standards</Chip>} />
        <SectionNote>
          Reference recovery coefficients under Extended Producer Responsibility (EPR) guidelines for authorized Indian e-waste recyclers.
        </SectionNote>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] tracking-wide text-muted-foreground uppercase border-b pb-2">
              <tr>
                <th className="py-2.5">Category</th>
                <th>Reusable Parts</th>
                <th>Recyclable Metals</th>
                <th>Hazardous Frax</th>
                <th>Safe Residual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {CATEGORIES.map((c) => {
                const f = s.settings.factors[c.id];
                return (
                  <tr key={c.id} className="hover:bg-cream/80 transition-colors">
                    <td className="py-2 font-bold flex items-center gap-2">
                      <span className="text-base">{c.emoji}</span>
                      <span>{c.label}</span>
                    </td>
                    <td>
                      <FactorInput
                        value={f.reusable}
                        onChange={(v) => updateFactor(c.id, "reusable", v)}
                      />
                    </td>
                    <td>
                      <FactorInput
                        value={f.recyclable}
                        onChange={(v) => updateFactor(c.id, "recyclable", v)}
                      />
                    </td>
                    <td>
                      <FactorInput
                        value={f.hazardous}
                        onChange={(v) => updateFactor(c.id, "hazardous", v)}
                      />
                    </td>
                    <td>
                      <FactorInput
                        value={f.residual}
                        onChange={(v) => updateFactor(c.id, "residual", v)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
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
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-xl border-2 border-input bg-cream px-2.5 py-1.5 text-right font-mono text-xs font-bold"
      />
    </div>
  );
}

function FactorInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step={0.05}
      min={0}
      max={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-16 rounded-lg border border-input bg-cream px-2 py-1 text-center font-mono text-xs font-bold"
    />
  );
}
