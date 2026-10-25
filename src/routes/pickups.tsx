import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardTitle, Chip, PopButton, SectionNote } from "@/components/sim/ui";
import { PickupWorkflow } from "@/components/sim/PickupWorkflow";
import {
  cancelPickup,
  createPickup,
  regenerateWeight,
  runPickupSimulation,
  setActualWeight,
} from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/simulation/config";
import { kg, simClock } from "@/lib/simulation/format";
import type { CategoryId, Pickup, PickupItem } from "@/lib/simulation/types";
import { useBackend } from "@/hooks/use-backend";
import {
  getCategories,
  getAddresses,
  createAddress,
  getPickups as getBackendPickups,
  createPickup as createBackendPickup,
  runLiveBackendLifecycle,
  type ApiCategory,
  type ApiPickup,
} from "@/lib/api";

export const Route = createFileRoute("/pickups")({
  head: () => ({
    meta: [
      { title: "Pickups — EcoCycle" },
      {
        name: "description",
        content: "Create and track e-waste pickup requests through the full nine-stage workflow.",
      },
      { property: "og:title", content: "Pickups — EcoCycle" },
      { property: "og:description", content: "Create, track and complete e-waste pickups." },
    ],
  }),
  component: PickupsPage,
});

function mapBackendStatusToSim(status: string): Pickup["status"] {
  switch (status) {
    case "REQUESTED": return "REQUESTED";
    case "OFFERED": return "CONFIRMED";
    case "ACCEPTED": return "AGENT_ACCEPTED";
    case "EN_ROUTE": return "ON_THE_WAY";
    case "ARRIVED": return "ARRIVED";
    case "COLLECTED": return "COLLECTED";
    case "DELIVERED_TO_RECYCLER":
    case "RECYCLER_VERIFIED": return "VERIFIED";
    case "COMPLETED": return "COMPLETED";
    case "CANCELLED": return "CANCELLED";
    case "DISPUTED":
    case "FAILED": return "FAILED";
    default: return "REQUESTED";
  }
}

function PickupsPage() {
  const s = useSim();
  const { isOnline } = useBackend();
  const [customerId, setCustomerId] = useState(s.customers[0]?.id ?? "");
  const [qty, setQty] = useState<Record<CategoryId, number>>({
    laptop: 1,
    mobile: 0,
    charger: 0,
    tv: 0,
    battery: 0,
    printer: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backendPickups, setBackendPickups] = useState<ApiPickup[]>([]);
  const [dbCategories, setDbCategories] = useState<ApiCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lifecycleStep, setLifecycleStep] = useState<string | null>(null);

  // Load backend data if connected
  useEffect(() => {
    if (isOnline) {
      getCategories().then(setDbCategories).catch(console.warn);
      getBackendPickups().then(setBackendPickups).catch(console.warn);
    }
  }, [isOnline]);

  const refreshBackend = async () => {
    if (!isOnline) return;
    try {
      const p = await getBackendPickups();
      setBackendPickups(p);
    } catch (e) {
      console.warn("Could not refresh backend pickups:", e);
    }
  };

  // Convert backend pickups to displayable format if any
  const convertedBackendPickups: Pickup[] = backendPickups.map((bp) => {
    const estKg = bp.estimated_weight_g / 1000;
    const actKg = bp.actual_weight_g ? bp.actual_weight_g / 1000 : undefined;
    return {
      id: bp.id.length > 15 ? `PK-${bp.id.slice(0, 8)}` : bp.id,
      customerId: bp.customer_id,
      addressId: bp.address_id,
      status: mapBackendStatusToSim(bp.status),
      estimatedKg: estKg,
      actualKg: actKg,
      items: bp.items?.map((it) => ({
        category: (it.category_id as CategoryId) || "laptop",
        qty: it.quantity,
        weightKg: it.estimated_weight_g / 1000,
      })) || [],
      createdAt: new Date(bp.created_at).getTime(),
      environment: "LIVE" as any,
    };
  });

  const allPickups = isOnline && convertedBackendPickups.length > 0
    ? [...convertedBackendPickups, ...s.pickups]
    : s.pickups;

  const selected = allPickups.find((p) => p.id === selectedId) ?? allPickups[0];

  const items: PickupItem[] = CATEGORIES.filter((c) => (qty[c.id] ?? 0) > 0).map((c) => ({
    category: c.id,
    qty: qty[c.id]!,
    weightKg: c.avgWeightKg,
  }));
  const estimate = items.reduce((t, i) => t + i.weightKg * i.qty, 0);

  const handleCreatePickup = async () => {
    if (isOnline) {
      setIsSubmitting(true);
      try {
        let addresses = await getAddresses();
        if (!addresses.length) {
          const newAddr = await createAddress({
            line1: "Flat 402, Green Meadows",
            line2: "Indiranagar",
            city: "Bengaluru",
            state: "Karnataka",
            pincode: "560038",
            lat: 12.9716,
            lng: 77.5946,
            is_default: true,
          });
          addresses = [newAddr];
        }

        const cats = dbCategories.length ? dbCategories : await getCategories();
        const apiItems = items.map((it) => {
          const match = cats.find((c) => c.slug === it.category || c.name.toLowerCase().includes(it.category));
          const catId = match ? match.id : (cats[0]?.id || "laptop");
          return {
            category_id: catId,
            quantity: it.qty,
            estimated_weight_g: Math.round(it.weightKg * it.qty * 1000),
          };
        });

        const created = await createBackendPickup({
          address_id: addresses[0].id,
          items: apiItems,
          notes: "Scheduled via EcoCycle Dashboard",
          data_wipe_acknowledged: true,
        });

        await refreshBackend();
        setSelectedId(`PK-${created.id.slice(0, 8)}`);
      } catch (err: any) {
        console.error("Failed to create pickup on backend:", err);
        // Fallback to local simulation
        createPickup(customerId, items, { auto: true });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      createPickup(customerId, items, { auto: true });
    }
  };

  const handleRunSimulation = async (id: string) => {
    const rawBackend = backendPickups.find((bp) => bp.id === id || `PK-${bp.id.slice(0, 8)}` === id);
    if (isOnline && rawBackend) {
      setLifecycleStep("Starting live backend lifecycle...");
      const res = await runLiveBackendLifecycle(
        rawBackend.id,
        rawBackend.estimated_weight_g || 4800,
        (step) => setLifecycleStep(step),
      );
      await refreshBackend();
      setTimeout(() => setLifecycleStep(null), 3000);
      if (!res.success) {
        alert("Lifecycle action notice: " + (res.error || "Unable to complete all stages"));
      }
    } else {
      runPickupSimulation(id);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-bold">Simulated Pickups</h1>
        <SectionNote>Every pickup below is demo data. No collection vehicle is ever dispatched.</SectionNote>
      </header>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardTitle title="Create Simulated Pickup" badge={<Chip tone="lime">Demo Data</Chip>} />
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">CUSTOMER (FICTIONAL)</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mb-4 w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-medium"
          >
            {s.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.address}
              </option>
            ))}
          </select>
          <label className="mb-2 block text-[11px] font-semibold text-muted-foreground">SIMULATED E-WASTE ITEMS</label>
          <div className="space-y-2">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-cream p-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-card text-lg">{c.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground">{c.avgWeightKg} kg each (simulated)</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="size-7 rounded-full bg-card font-bold"
                    onClick={() => setQty((q) => ({ ...q, [c.id]: Math.max(0, (q[c.id] ?? 0) - 1) }))}
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-mono text-sm font-bold tabular-nums">{qty[c.id] ?? 0}</span>
                  <button
                    type="button"
                    className="size-7 rounded-full bg-ink font-bold text-ink-foreground"
                    onClick={() => setQty((q) => ({ ...q, [c.id]: (q[c.id] ?? 0) + 1 }))}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-lime/30 p-3">
            <span className="text-sm font-semibold">Estimated Weight</span>
            <span className="font-display text-xl font-bold">{kg(estimate)}</span>
          </div>
          <PopButton
            className="mt-4 w-full"
            tone="ink"
            disabled={!items.length || !customerId || isSubmitting}
            onClick={handleCreatePickup}
          >
            {isSubmitting ? "Creating..." : isOnline ? "Create Pickup (Live Backend)" : "Create Simulated Pickup"}
          </PopButton>
        </Card>

        <div className="space-y-6 lg:col-span-7">
          {selected ? (
            <Card>
              <CardTitle
                title="Pickup Detail"
                badge={<Chip tone="lime">{selected.id}</Chip>}
              />
              <PickupWorkflow pickup={selected} />
              {lifecycleStep ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sun/40 px-3 py-1.5 text-xs font-semibold text-sun-foreground animate-pulse">
                  <span className="size-2 rounded-full bg-sun" /> {lifecycleStep}
                </div>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Status" value={selected.status} />
                <Field label="Estimated" value={kg(selected.estimatedKg)} />
                <Field label="Actual Weight" value={selected.actualKg ? kg(selected.actualKg) : "—"} />
                <Field label="Created" value={simClock(selected.createdAt)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <PopButton tone="lime" onClick={() => handleRunSimulation(selected.id)}>
                  ▶ Run Pickup Simulation
                </PopButton>
                <PopButton tone="outline" onClick={() => regenerateWeight(selected.id)}>
                  🎲 Regenerate Weight
                </PopButton>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Set weight"
                  className="w-32 rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setActualWeight(selected.id, v);
                  }}
                />
                <PopButton tone="outline" onClick={() => cancelPickup(selected.id)}>
                  Cancel
                </PopButton>
              </div>
              <div className="mt-4 text-xs font-medium text-muted-foreground">
                {isOnline
                  ? "⚡ Live Backend Sync Active: Actions commit directly to SQLite/PostgreSQL database."
                  : "Simulated Measurement — generated by the simulation engine, not a scale reading."}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardTitle title="All Simulated Pickups" badge={<Chip>{s.pickups.length} records</Chip>} />
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2">Pickup</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="text-right">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {s.pickups.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className="cursor-pointer border-t border-border hover:bg-cream"
                    >
                      <td className="py-2 font-mono text-xs">{p.id}</td>
                      <td>{s.customers.find((c) => c.id === p.customerId)?.name}</td>
                      <td>
                        <span className="text-xs font-semibold">{p.status}</span>
                      </td>
                      <td className="text-right font-mono text-xs tabular-nums">
                        {kg(p.actualKg ?? p.estimatedKg)}
                      </td>
                    </tr>
                  ))}
                  {!s.pickups.length ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-muted-foreground">
                        No simulated pickups yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      <Card>
        <CardTitle title="Simulated Items Breakdown" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {CATEGORIES.map((c) => {
            const count = s.pickups.reduce(
              (t, p) => t + p.items.filter((i) => i.category === c.id).reduce((x, i) => x + i.qty, 0),
              0,
            );
            return (
              <div key={c.id} className="rounded-2xl bg-cream p-3">
                <div className="text-lg">{CATEGORY_MAP[c.id].emoji}</div>
                <div className="text-[11px] font-semibold text-muted-foreground">{c.label}</div>
                <div className="font-display text-xl font-bold">{count}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream p-3">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="font-display text-sm font-bold">{value}</div>
    </div>
  );
}
