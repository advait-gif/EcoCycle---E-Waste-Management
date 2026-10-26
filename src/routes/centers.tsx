import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardTitle, Chip, PopButton, SectionNote, Stat } from "@/components/sim/ui";
import { createBatch, runSorting, simulateSorting } from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { kg } from "@/lib/simulation/format";
import { CATEGORY_MAP } from "@/lib/simulation/config";
import { getPublicFacilities, type PublicFacility } from "@/lib/api";
import { useBackend } from "@/hooks/use-backend";

export const Route = createFileRoute("/centers")({
  head: () => ({
    meta: [
      { title: "Authorized Collection Centers & Facilities — EcoCycle" },
      {
        name: "description",
        content:
          "CPCB-authorized intermediate collection hubs: real-time storage capacity, inventory manifests, and automated sorting pipelines.",
      },
      { property: "og:title", content: "Authorized Collection Centers — EcoCycle" },
      {
        property: "og:description",
        content: "Track authorized e-waste collection centers, storage inventory, and facility dispatch manifests.",
      },
    ],
  }),
  component: CentersPage,
});

function CentersPage() {
  const s = useSim();
  const { isOnline } = useBackend();
  const [realFacilities, setRealFacilities] = useState<PublicFacility[]>([]);

  useEffect(() => {
    if (isOnline) {
      getPublicFacilities().then(setRealFacilities).catch(() => {});
    }
  }, [isOnline]);

  const stored = s.inventory.filter((i) => i.status === "STORED");
  const sortingPreview = simulateSorting(stored, s.settings.factors);
  const inputTotal = stored.reduce((t, i) => t + i.weightKg, 0);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Authorized Collection Centers</h1>
        <SectionNote>
          Intermediate storage facilities in Bengaluru Metro: live intake capacity, segregated e-waste inventory, and systematic pre-processing.
        </SectionNote>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Authorized Hubs" value={s.centers.length} />
        <Stat label="Total Stored Inventory" value={kg(s.centers.reduce((t, c) => t + c.inventoryKg, 0))} />
        <Stat label="Tracked Inventory Units" value={s.inventory.length} />
        <Stat label="Awaiting Pre-Sorting" value={stored.length} tone="text-coral" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {s.centers.map((c) => {
          const available = Math.max(0, c.capacityKg - c.inventoryKg);
          const pct = Math.min(100, Math.round((c.inventoryKg / c.capacityKg) * 100));
          const queue = s.inventory.filter((i) => i.centerId === c.id && i.status !== "PROCESSED").length;
          return (
            <Card key={c.id}>
              <CardTitle title={c.name} badge={<Chip tone={pct > 90 ? "coral" : "lime"}>{pct}% utilized</Chip>} />
              <div className="h-3 w-full overflow-hidden rounded-full bg-cream border border-border/40 mt-1">
                <div
                  className="h-full rounded-full bg-leaf transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Total Permitted Capacity" value={kg(c.capacityKg)} />
                <Row label="Current Stored Weight" value={kg(c.inventoryKg)} />
                <Row label="Available Intake Buffer" value={kg(available)} />
                <Row label="Unsorted Inventory" value={`${queue} logged items`} />
              </dl>
              <div className="mt-5 flex flex-wrap gap-2 pt-2 border-t">
                <PopButton tone="outline" onClick={() => runSorting(c.id)}>
                  Sort Stored Items
                </PopButton>
                <PopButton tone="ink" onClick={() => createBatch(c.id)}>
                  Dispatch to Recycler
                </PopButton>
              </div>
            </Card>
          );
        })}
      </section>

      {realFacilities.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Authorized Central Processing Facilities</h2>
            <Chip tone="leaf">CPCB State Registry Verified</Chip>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {realFacilities.map((f) => (
              <Card key={f.id} className="border-leaf/30 bg-leaf/5">
                <CardTitle
                  title={f.facility_name}
                  badge={<Chip tone="leaf">{f.cpcb_reg_no}</Chip>}
                />
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-semibold text-foreground">{f.address}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-muted-foreground">Certified Annual Capacity</span>
                    <span className="font-mono font-bold text-foreground">{kg(f.capacity_kg)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/30 pb-1">
                    <span className="text-muted-foreground">Batches Completed</span>
                    <span className="font-mono font-bold text-leaf">{f.batches_processed} batches</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-muted-foreground block mb-1">Permitted E-Waste Categories:</span>
                    <div className="flex flex-wrap gap-1">
                      {f.categories_accepted.map((cat) => (
                        <span key={cat} className="rounded-md bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardTitle title="Material Classification Yields" badge={<Chip tone="sun">CPCB Method</Chip>} />
          <SectionNote>
            Mass balance verification: Gross intake {kg(inputTotal)} across {stored.length} stored manifest units.
          </SectionNote>
          <div className="mt-4 space-y-2.5">
            <Bar label="Reusable Components" value={sortingPreview.reusable} total={inputTotal} tone="bg-leaf" />
            <Bar label="Recyclable Metals & Circuitry" value={sortingPreview.recyclable} total={inputTotal} tone="bg-sky" />
            <Bar label="Hazardous Materials (Batteries/Lead)" value={sortingPreview.hazardous} total={inputTotal} tone="bg-coral" />
            <Bar label="Inert Residual" value={sortingPreview.residual} total={inputTotal} tone="bg-ink" />
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <CardTitle title="Facility Inventory Manifest" badge={<Chip tone="lime">{s.inventory.length} units</Chip>} />
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] tracking-wide text-muted-foreground uppercase border-b pb-2">
                <tr>
                  <th className="py-2.5">Manifest Code</th>
                  <th>Category</th>
                  <th>Weight</th>
                  <th>Condition</th>
                  <th>Custody Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {s.inventory.slice(0, 60).map((i) => (
                  <tr key={i.id} className="hover:bg-cream/80 transition-colors">
                    <td className="py-2 font-mono text-[11px] font-bold">{i.id}</td>
                    <td>{CATEGORY_MAP[i.category].label}</td>
                    <td className="font-mono text-xs font-semibold">{kg(i.weightKg)}</td>
                    <td className="text-xs">{i.condition}</td>
                    <td>
                      <Chip tone={i.status === "PROCESSED" ? "lime" : "cream"}>{i.status}</Chip>
                    </td>
                  </tr>
                ))}
                {s.inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No stored inventory records. Newly collected pickups appear here upon arrival at intermediate centers.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs font-bold text-foreground">{value}</dd>
    </div>
  );
}

function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold">
        <span>{label}</span>
        <span className="font-mono font-bold">{kg(value)}</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-cream border border-border/40">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
