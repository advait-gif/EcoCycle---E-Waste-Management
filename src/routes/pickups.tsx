import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardTitle, Chip, PopButton, SectionNote } from "@/components/sim/ui";
import { PickupWorkflow } from "@/components/sim/PickupWorkflow";
import {
  cancelPickup,
  createPickup,
  regenerateWeight,
  registerCustomer,
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
  getToken,
  getMe,
  type ApiCategory,
  type ApiPickup,
} from "@/lib/api";

export const Route = createFileRoute("/pickups")({
  head: () => ({
    meta: [
      { title: "Pickups & Doorstep Collection — EcoCycle" },
      {
        name: "description",
        content: "Schedule doorstep e-waste pickups with verified collectors. Real-time chain of custody, GPS tracking, and transparent weights.",
      },
      { property: "og:title", content: "Pickups & Doorstep Collection — EcoCycle" },
      { property: "og:description", content: "Schedule, track, and complete verified e-waste pickups." },
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pickupAddress, setPickupAddress] = useState("102 Metro View, Indiranagar, Bengaluru 560038");
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendPickups, setBackendPickups] = useState<ApiPickup[]>([]);
  const [dbCategories, setDbCategories] = useState<ApiCategory[]>([]);
  const [lifecycleStep, setLifecycleStep] = useState<string | null>(null);

  useEffect(() => {
    const syncUser = () => {
      if (getToken()) {
        getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
      } else {
        setCurrentUser(null);
      }
    };
    syncUser();
    window.addEventListener("ecocycle-auth-change", syncUser);
    return () => window.removeEventListener("ecocycle-auth-change", syncUser);
  }, []);

  useEffect(() => {
    if (isOnline) {
      getCategories().then(setDbCategories).catch(() => {});
      if (getToken()) {
        getBackendPickups().then(setBackendPickups).catch(() => {});
      }
    }
  }, [isOnline, currentUser]);

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
      centerId: "center-indiranagar",
      auto: false,
      progress: 100,
      nextStepAt: 0,
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
    let activeCustId = customerId;
    if (currentUser) {
      const reg = registerCustomer(currentUser.name, currentUser.email, pickupAddress);
      activeCustId = reg.id;
    }

    if (isOnline && getToken()) {
      setIsSubmitting(true);
      try {
        let addresses = await getAddresses();
        if (!addresses.length) {
          const newAddr = await createAddress({
            line1: pickupAddress,
            line2: "Metro Area",
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

        const targetAddressId = addresses[0]?.id;
        if (!targetAddressId) throw new Error("No pickup address available");

        const created = await createBackendPickup({
          address_id: targetAddressId,
          items: apiItems,
          notes: `Scheduled by ${currentUser?.name || "Customer"}`,
          data_wipe_acknowledged: true,
        });

        await refreshBackend();
        setSelectedId(`PK-${created.id.slice(0, 8)}`);
      } catch (err: any) {
        console.error("Failed to create pickup on backend:", err);
        createPickup(activeCustId, items, { auto: false });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      createPickup(activeCustId, items, { auto: false });
    }
  };

  const handleProcessNextStage = async (id: string) => {
    const rawBackend = backendPickups.find((bp) => id.includes(bp.id.slice(0, 8)) || bp.id === id);
    if (isOnline && rawBackend) {
      setLifecycleStep("Dispatching verified collector & processing handover...");
      const res = await runLiveBackendLifecycle(
        rawBackend.id,
        rawBackend.estimated_weight_g || 4500,
        (step) => setLifecycleStep(step),
      );
      await refreshBackend();
      if (!res.success) {
        setLifecycleStep(`Status: ${res.error || "Handover step processing"}`);
        setTimeout(() => setLifecycleStep(null), 4000);
      } else {
        setTimeout(() => setLifecycleStep(null), 3000);
      }
    } else {
      runPickupSimulation(id);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">E-Waste Doorstep Pickups</h1>
        <SectionNote>
          Schedule verified doorstep collections. Each handover is secured with a 4-digit code and digital weighing scale confirmation.
        </SectionNote>
      </header>

      <section className="grid gap-6 lg:grid-cols-12">
        {/* Booking Form */}
        <Card className="lg:col-span-5">
          <CardTitle
            title="Book Doorstep Pickup"
            badge={<Chip tone="lime">Express Dispatch</Chip>}
          />

          {currentUser ? (
            <div className="mb-4 space-y-3">
              <div className="rounded-2xl border border-leaf/30 bg-leaf/10 p-3.5 space-y-0.5">
                <div className="text-[10px] font-bold text-leaf uppercase tracking-wider">Registered Participant Account</div>
                <div className="font-bold text-sm text-foreground">{currentUser.name || currentUser.email}</div>
                <div className="text-xs text-muted-foreground font-mono">{currentUser.email}</div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  Doorstep Pickup Address
                </label>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="e.g. 102 Metro View, Indiranagar, Bengaluru"
                  className="w-full rounded-xl border-2 border-input bg-cream px-3 py-2.5 text-sm font-semibold focus:border-leaf focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-2xl border-2 border-dashed border-border bg-cream/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Account Required</span>
                <Link to="/login" className="text-xs font-bold text-leaf hover:underline">
                  Sign In / Register →
                </Link>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only registered participants can book collections and receive certified green credits.
              </p>
              <Link
                to="/login"
                className="inline-block w-full rounded-xl bg-leaf py-2.5 text-center text-xs font-bold text-white shadow-sm hover:bg-leaf/90 transition-all"
              >
                Create Account / Sign In to Schedule
              </Link>
            </div>
          )}

          <label className="mb-2 block text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            Select E-Waste Items for Collection
          </label>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3 border border-border/40">
                <span className="grid size-9 place-items-center rounded-xl bg-card text-lg shadow-sm">{c.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{c.label}</div>
                  <div className="text-[11px] font-medium text-muted-foreground">Avg. {c.avgWeightKg} kg / unit</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="size-7 rounded-full bg-card font-bold hover:bg-card/80 transition-colors cursor-pointer"
                    onClick={() => setQty((q) => ({ ...q, [c.id]: Math.max(0, (q[c.id] ?? 0) - 1) }))}
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-mono text-sm font-bold tabular-nums">{qty[c.id] ?? 0}</span>
                  <button
                    type="button"
                    className="size-7 rounded-full bg-ink font-bold text-ink-foreground hover:bg-ink/80 transition-colors cursor-pointer"
                    onClick={() => setQty((q) => ({ ...q, [c.id]: (q[c.id] ?? 0) + 1 }))}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-lime/30 p-3.5 border border-lime/40">
            <div>
              <div className="text-xs font-bold text-ink uppercase tracking-wide">Estimated Weight</div>
              <div className="text-[11px] text-muted-foreground">Final points calculated upon digital weighing</div>
            </div>
            <span className="font-display text-2xl font-extrabold text-ink">{kg(estimate)}</span>
          </div>

          <PopButton
            className="mt-4 w-full py-3.5"
            tone="ink"
            disabled={!items.length || isSubmitting || (!currentUser && !customerId)}
            onClick={handleCreatePickup}
          >
            {isSubmitting
              ? "Dispatching Collection..."
              : !currentUser
              ? "Register Account to Book"
              : `Confirm Doorstep Pickup Request (${estimate.toFixed(1)} kg)`}
          </PopButton>
        </Card>

        {/* Selected Pickup Details & Chain of Custody */}
        <div className="space-y-6 lg:col-span-7">
          {selected ? (
            <Card>
              <CardTitle
                title="Live Pickup &amp; Custody Timeline"
                badge={<Chip tone="lime">{selected.id}</Chip>}
              />
              <PickupWorkflow pickup={selected} />
              {lifecycleStep ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sun/40 px-3.5 py-1.5 text-xs font-semibold text-sun-foreground animate-pulse">
                  <span className="size-2 rounded-full bg-sun" /> {lifecycleStep}
                </div>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Status" value={selected.status} />
                <Field label="Estimated" value={kg(selected.estimatedKg)} />
                <Field label="Scale Weight" value={selected.actualKg ? kg(selected.actualKg) : "Pending collection"} />
                <Field label="Requested" value={simClock(selected.createdAt)} />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 pt-3 border-t">
                <PopButton tone="lime" onClick={() => handleProcessNextStage(selected.id)}>
                  ⚡ Process Next Stage
                </PopButton>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Actual scale weight (kg)"
                    className="w-48 rounded-xl border-2 border-input bg-cream px-3 py-2 text-xs font-medium"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) setActualWeight(selected.id, v);
                    }}
                  />
                </div>
                <PopButton tone="outline" onClick={() => cancelPickup(selected.id)}>
                  Cancel Pickup
                </PopButton>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-muted-foreground">
                🔒 Handover security: Customer verifies collector using 4-digit OTP. Verified records logged directly to database.
              </div>
            </Card>
          ) : null}

          {/* All Pickups Table */}
          <Card>
            <CardTitle title="Recent Pickups &amp; Records" badge={<Chip>{allPickups.length} total</Chip>} />
            <div className="max-h-[380px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] text-muted-foreground uppercase border-b pb-2">
                  <tr>
                    <th className="py-2.5">Pickup ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {allPickups.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer transition-colors hover:bg-cream/80 ${selected?.id === p.id ? "bg-cream font-bold" : ""}`}
                    >
                      <td className="py-2.5 font-mono text-xs">{p.id}</td>
                      <td>{s.customers.find((c) => c.id === p.customerId)?.name || (currentUser ? currentUser.name : "Registered Participant")}</td>
                      <td>
                        <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[11px] font-bold text-leaf">
                          {p.status}
                        </span>
                      </td>
                      <td className="text-right font-mono text-xs tabular-nums">
                        {kg(p.actualKg ?? p.estimatedKg)}
                      </td>
                    </tr>
                  ))}
                  {!allPickups.length ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No pickup requests yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* Categories Breakdown */}
      <Card>
        <CardTitle title="Accepted E-Waste Categories &amp; Intakes" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {CATEGORIES.map((c) => {
            const count = allPickups.reduce(
              (t, p) => t + p.items.filter((i) => i.category === c.id).reduce((x, i) => x + i.qty, 0),
              0,
            );
            return (
              <div key={c.id} className="rounded-2xl bg-cream p-3 border border-border/40">
                <div className="text-xl">{CATEGORY_MAP[c.id].emoji}</div>
                <div className="text-[11px] font-bold text-muted-foreground uppercase">{c.label}</div>
                <div className="font-display text-xl font-extrabold mt-1">{count} units</div>
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
    <div className="rounded-2xl bg-cream p-3 border border-border/40">
      <div className="text-[11px] font-bold text-muted-foreground uppercase">{label}</div>
      <div className="font-display text-sm font-bold mt-0.5 truncate">{value}</div>
    </div>
  );
}
