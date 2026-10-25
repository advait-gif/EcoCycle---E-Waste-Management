import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardTitle, Chip, PopButton, SectionNote, Stat } from "@/components/sim/ui";
import { generateCertificateFor, runRecycling, totals } from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { kg, simDate } from "@/lib/simulation/format";

export const Route = createFileRoute("/recycling")({
  head: () => ({
    meta: [
      { title: "Authorized Recycling Batches & Material Recovery — EcoCycle" },
      {
        name: "description",
        content:
          "CPCB-authorized facility intake batches, verified material recovery yields, circular economy outputs, and avoided carbon emissions.",
      },
      { property: "og:title", content: "Authorized Recycling Batches — EcoCycle" },
      {
        property: "og:description",
        content: "Track facility e-waste intake, material recovery manifests, and verified environmental impact.",
      },
    ],
  }),
  component: RecyclingPage,
});

const STAGES = [
  "Intake Verified",
  "Component Disassembly",
  "Precious Metals Extraction",
  "Materials Recovered",
  "Safe Residual Disposal",
];

function RecyclingPage() {
  const s = useSim();
  const t = totals(s);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Facility Recycling Batches</h1>
        <SectionNote>
          Verifiable chain of custody: certified recycling facilities record gross and net weights, material yields, and environmental audit manifests.
        </SectionNote>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total Processed Batches" value={t.batches} />
        <Stat label="Total Material Recycled" value={kg(t.recycledKg)} tone="text-leaf" />
        <Stat label="Material Recovery Rate" value={`${t.recoveryPct}%`} />
        <Stat label="Avoided GHG Emissions" value={`${t.co2eKg} kg`} sub="CPCB Factor Verified" tone="text-sky-foreground" />
      </section>

      <Card>
        <CardTitle title="Standard Recycling &amp; Refining Stages" badge={<Chip tone="lime">ISO 14001 Standards</Chip>} />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {STAGES.map((st, i) => (
            <div key={st} className="flex items-center gap-2">
              <span className="rounded-2xl bg-cream px-3.5 py-2 text-xs font-bold text-ink border border-border/40">
                {st}
              </span>
              {i < STAGES.length - 1 ? <span className="text-muted-foreground font-bold">→</span> : null}
            </div>
          ))}
        </div>
      </Card>

      <section className="space-y-4">
        {s.batches.length === 0 ? (
          <Card>
            <SectionNote>No facility processing batches recorded yet. Batches are generated as collected loads arrive at partner facilities.</SectionNote>
          </Card>
        ) : null}
        {s.batches.slice(0, 12).map((b) => {
          const recycler = s.recyclers.find((r) => r.id === b.recyclerId);
          const center = s.centers.find((c) => c.id === b.centerId);
          return (
            <Card key={b.id}>
              <CardTitle
                title={`Batch Manifest: ${b.id}`}
                badge={<Chip tone={b.status === "COMPLETED" ? "lime" : "sun"}>{b.status}</Chip>}
              />
              <div className="grid gap-4 md:grid-cols-12">
                <div className="space-y-1 text-sm md:col-span-4">
                  <div className="text-muted-foreground text-xs font-semibold">
                    {center?.name} → {recycler?.name}
                  </div>
                  <div className="font-mono text-xs font-bold">Intake Weight: {kg(b.inputKg)}</div>
                  <div className="font-mono text-xs text-muted-foreground">Received Date: {simDate(b.createdAt)}</div>
                  {b.sorting ? (
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs bg-cream p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted-foreground">Reusable Parts:</span>
                      <span className="font-mono font-bold">{kg(b.sorting.reusable)}</span>
                      <span className="text-muted-foreground">Recycled Metals:</span>
                      <span className="font-mono font-bold text-leaf">{kg(b.sorting.recyclable)}</span>
                      <span className="text-muted-foreground">Hazardous Chem:</span>
                      <span className="font-mono font-bold text-coral">{kg(b.sorting.hazardous)}</span>
                      <span className="text-muted-foreground">Inert Residual:</span>
                      <span className="font-mono font-bold">{kg(b.sorting.residual)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="md:col-span-5">
                  <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Recovered Raw Commodities
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(b.materials ?? {}).map(([name, v]) => (
                      <div key={name} className="rounded-xl bg-cream px-3 py-2 border border-border/40">
                        <div className="text-xs font-bold text-foreground">{name}</div>
                        <div className="font-mono text-sm font-bold text-leaf">{kg(v)}</div>
                      </div>
                    ))}
                    {!b.materials ? (
                      <SectionNote>Processing underway in facility refinery.</SectionNote>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:col-span-3 justify-between">
                  <div className="rounded-2xl bg-cream p-3 border border-border/40">
                    <div className="text-xs font-bold text-muted-foreground uppercase">Greenhouse Gas Reduction</div>
                    <div className="font-display text-xl font-extrabold text-leaf mt-0.5">{b.co2eKg ?? 0} kg CO₂e</div>
                    <span className="text-[10px] text-muted-foreground">Certified avoided carbon</span>
                  </div>

                  {b.status !== "COMPLETED" ? (
                    <PopButton tone="ink" onClick={() => runRecycling(b.id)}>
                      Process Batch
                    </PopButton>
                  ) : b.certificateId ? (
                    <Link
                      to="/verify/simulation/$certificateId"
                      params={{ certificateId: b.certificateId }}
                      className="font-display rounded-2xl border-2 border-leaf bg-leaf/10 text-leaf px-4 py-2.5 text-center text-xs font-bold hover:bg-leaf hover:text-white transition-colors"
                    >
                      📜 View Certificate
                    </Link>
                  ) : (
                    <PopButton tone="outline" onClick={() => generateCertificateFor(b.id)}>
                      Issue Certificate
                    </PopButton>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
