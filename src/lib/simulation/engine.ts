import {
  CATEGORIES,
  CATEGORY_MAP,
  CLOCK_ORIGIN,
  DEFAULT_FACTORS,
  DEFAULT_SEED,
  DEMO_AGENTS,
  DEMO_CENTERS,
  DEMO_CUSTOMERS,
  DEMO_RECYCLERS,
  MATERIAL_SPLIT,
  REWARD_PRODUCTS,
} from "./config";
import { between, makeRng, pick, round2, type Rng } from "./rng";
import {
  ENVIRONMENT,
  PICKUP_STATUSES,
  type Batch,
  type CategoryId,
  type Center,
  type InventoryItem,
  type Pickup,
  type PickupItem,
  type PickupStatus,
  type Role,
  type SimState,
  type Sorting,
} from "./types";

type Listener = () => void;

let state: SimState | null = null;
const listeners = new Set<Listener>();
let rng: Rng = makeRng(DEFAULT_SEED);

const STEP_MS = 1000; // one workflow step unit in simulated ms

function pad(n: number) {
  return String(n).padStart(6, "0");
}

function nextId(s: SimState, prefix: string) {
  const key = prefix;
  const n = (s.counters[key] ?? 0) + 1;
  s.counters[key] = n;
  return `SIM-${prefix}-${pad(n)}`;
}

function emit(s: SimState, type: string, message: string, refId?: string) {
  s.events.unshift({
    id: nextId(s, "EVT"),
    type,
    message,
    at: s.clock,
    refId,
    environment: ENVIRONMENT,
  });
  s.events = s.events.slice(0, 300);
}

function audit(s: SimState, action: string) {
  s.audit.unshift({ id: nextId(s, "AUD"), action, actor: s.role, at: s.clock, environment: ENVIRONMENT });
  s.audit = s.audit.slice(0, 200);
}

function notify(
  s: SimState,
  to: string,
  title: string,
  message: string,
  channel: SimState["notifications"][number]["channel"] = "IN_APP",
) {
  s.notifications.unshift({
    id: nextId(s, "NOTIF"),
    channel,
    title,
    message,
    to,
    at: s.clock,
    read: false,
    environment: ENVIRONMENT,
  });
  s.notifications = s.notifications.slice(0, 200);
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

function buildInitialState(seed: string): SimState {
  rng = makeRng(seed);
  const s: SimState = {
    version: 0,
    clock: CLOCK_ORIGIN,
    settings: {
      seed,
      speed: 5,
      running: false,
      pointsPerKg: 10,
      co2ePerKg: 1.88,
      weightVariance: 0.12,
      agentSpeed: 0.09,
      stepSeconds: 6,
      failureProbability: 0,
      delayProbability: 0,
      factors: structuredClone(DEFAULT_FACTORS),
    },
    role: "ADMIN",
    currentCustomerId: "",
    customers: [],
    agents: [],
    centers: [],
    recyclers: [],
    pickups: [],
    inventory: [],
    batches: [],
    certificates: [],
    rewards: [],
    notifications: [],
    events: [],
    audit: [],
    counters: {},
    activeScenarios: [],
  };

  DEMO_CUSTOMERS.forEach((c, i) => {
    s.customers.push({
      id: nextId(s, "CUST"),
      name: c.name,
      email: c.name === "Advait Nawathe" ? "advaitnawathe007@gmail.com" : `${c.name.toLowerCase().replace(/\s+/g, ".")}@ecocycle.in`,
      address: c.address,
      loc: { x: between(rng, 55, 88), y: between(rng, 15, 82) },
      points: Math.round(between(rng, 120, 900)),
      environment: ENVIRONMENT,
    });
    if (i === 0) s.currentCustomerId = s.customers[0]!.id;
  });

  DEMO_AGENTS.forEach((name) => {
    const home = { x: between(rng, 8, 22), y: between(rng, 12, 80) };
    s.agents.push({
      id: nextId(s, "AGENT"),
      name,
      status: "IDLE",
      loc: { ...home },
      home,
      completed: 0,
      collectedKg: 0,
      environment: ENVIRONMENT,
    });
  });

  DEMO_CENTERS.forEach((name, i) => {
    s.centers.push({
      id: nextId(s, "CENTER"),
      name,
      capacityKg: 1000,
      inventoryKg: Math.round(between(rng, 180, 640)),
      loc: { x: 10 + i * 6, y: 18 + i * 28 },
      environment: ENVIRONMENT,
    });
  });

  DEMO_RECYCLERS.forEach((name, i) => {
    s.recyclers.push({
      id: nextId(s, "RECY"),
      name,
      loc: { x: 86, y: 12 + i * 34 },
      environment: ENVIRONMENT,
    });
  });

  emit(s, "SIM_ENGINE_READY", `Simulation engine initialised with seed ${seed}.`);
  return s;
}

function ensure(): SimState {
  if (!state) state = buildInitialState(DEFAULT_SEED);
  return state;
}

function commit(mutator: (s: SimState) => void) {
  const s = ensure();
  mutator(s);
  state = { ...s, version: s.version + 1 };
  listeners.forEach((l) => l());
}

export function getState(): SimState {
  return ensure();
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/* ------------------------------------------------------------------ */
/* Calculations (pure, exported for tests)                             */
/* ------------------------------------------------------------------ */

export function estimateWeight(items: PickupItem[]): number {
  return round2(items.reduce((t, i) => t + i.weightKg * i.qty, 0));
}

export function simulateActualWeight(estimated: number, variance: number, r: Rng = rng): number {
  const delta = between(r, -variance, variance);
  return Math.max(0.1, round2(estimated * (1 + delta)));
}

export function simulateSorting(
  items: { category: CategoryId; weightKg: number }[],
  factors: SimState["settings"]["factors"],
): Sorting {
  const out: Sorting = { reusable: 0, recyclable: 0, hazardous: 0, residual: 0 };
  for (const it of items) {
    const f = factors[it.category] ?? CATEGORY_MAP[it.category].factors;
    out.reusable += it.weightKg * f.reusable;
    out.recyclable += it.weightKg * f.recyclable;
    out.hazardous += it.weightKg * f.hazardous;
    out.residual += it.weightKg * f.residual;
  }
  const total = items.reduce((t, i) => t + i.weightKg, 0);
  const sum = out.reusable + out.recyclable + out.hazardous + out.residual;
  const k = sum > 0 ? total / sum : 1; // guarantee output total === input total
  return {
    reusable: round2(out.reusable * k),
    recyclable: round2(out.recyclable * k),
    hazardous: round2(out.hazardous * k),
    residual: round2(out.residual * k),
  };
}

export function simulateMaterials(recyclableKg: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, share] of Object.entries(MATERIAL_SPLIT)) {
    out[name] = round2(recyclableKg * share);
  }
  return out;
}

export function estimateCo2e(kgRecycled: number, factor: number): number {
  return round2(kgRecycled * factor);
}

export function rewardPoints(kg: number, pointsPerKg: number): number {
  return Math.round(kg * pointsPerKg);
}

/* ------------------------------------------------------------------ */
/* Workflow                                                            */
/* ------------------------------------------------------------------ */

const FLOW = PICKUP_STATUSES;

function centerFor(s: SimState, i: number) {
  return s.centers[i % s.centers.length]!;
}

function assignAgent(s: SimState): string | undefined {
  const idle = s.agents.find((a) => a.status === "IDLE");
  return (idle ?? s.agents[0])?.id;
}

export function createPickup(
  customerId: string,
  items: PickupItem[],
  opts: { auto?: boolean; scenario?: string } = {},
) {
  commit((s) => {
    const id = nextId(s, "PICK");
    const center = centerFor(s, s.pickups.length);
    const p: Pickup = {
      id,
      customerId,
      centerId: center.id,
      items,
      estimatedKg: estimateWeight(items),
      status: "REQUESTED",
      auto: opts.auto ?? true,
      progress: 0,
      nextStepAt: s.clock + s.settings.stepSeconds * STEP_MS,
      createdAt: s.clock,
      scenario: opts.scenario,
      environment: ENVIRONMENT,
    };
    s.pickups.unshift(p);
    emit(s, "SIM_PICKUP_CREATED", `${id} created (${p.estimatedKg} kg estimated).`, id);
    const cust = s.customers.find((c) => c.id === customerId);
    notify(s, cust?.name ?? "Customer", "Simulated pickup requested", `Your simulated pickup ${id} has been received.`);
    audit(s, `Created simulated pickup ${id}`);
  });
}

export function runPickupSimulation(pickupId: string) {
  commit((s) => {
    const p = s.pickups.find((x) => x.id === pickupId);
    if (!p) return;
    p.auto = true;
    p.nextStepAt = s.clock;
    s.settings.running = true;
    emit(s, "SIM_PICKUP_RUN", `Automatic workflow started for ${p.id}.`, p.id);
  });
}

export function cancelPickup(pickupId: string) {
  commit((s) => {
    const p = s.pickups.find((x) => x.id === pickupId);
    if (!p || p.status === "COMPLETED") return;
    p.status = "CANCELLED";
    p.auto = false;
    emit(s, "SIM_PICKUP_CANCELLED", `${p.id} cancelled in simulation.`, p.id);
    notify(s, custName(s, p.customerId), "Simulated pickup cancelled", `${p.id} was cancelled.`, "SMS");
  });
}

export function setActualWeight(pickupId: string, weight: number) {
  commit((s) => {
    const p = s.pickups.find((x) => x.id === pickupId);
    if (!p) return;
    p.actualKg = round2(weight);
    emit(s, "SIM_WEIGHT_VERIFIED", `${p.id} simulated weight set to ${p.actualKg} kg.`, p.id);
  });
}

export function regenerateWeight(pickupId: string) {
  commit((s) => {
    const p = s.pickups.find((x) => x.id === pickupId);
    if (!p) return;
    p.actualKg = simulateActualWeight(p.estimatedKg, s.settings.weightVariance);
    emit(s, "SIM_WEIGHT_REGENERATED", `${p.id} simulated weight regenerated: ${p.actualKg} kg.`, p.id);
  });
}

function custName(s: SimState, id: string) {
  return s.customers.find((c) => c.id === id)?.name ?? "Customer";
}

function advancePickup(s: SimState, p: Pickup) {
  const idx = FLOW.indexOf(p.status as (typeof FLOW)[number]);
  if (idx < 0 || idx >= FLOW.length - 1) return;
  const next = FLOW[idx + 1]!;
  p.status = next;
  const delayMul = p.scenario === "agent-delay" ? 3 : p.scenario === "recycler-delay" ? 2 : 1;
  p.nextStepAt = s.clock + s.settings.stepSeconds * STEP_MS * delayMul;

  const agent = s.agents.find((a) => a.id === p.agentId);
  switch (next) {
    case "CONFIRMED":
      emit(s, "SIM_PICKUP_CONFIRMED", `${p.id} confirmed.`, p.id);
      notify(s, custName(s, p.customerId), "Simulated pickup confirmed", `Your simulated pickup ${p.id} has been confirmed.`, "EMAIL");
      break;
    case "ASSIGNED": {
      p.agentId = assignAgent(s);
      const a = s.agents.find((x) => x.id === p.agentId);
      if (a) a.status = "EN_ROUTE";
      emit(s, "SIM_AGENT_ASSIGNED", `${a?.name ?? "Agent"} assigned to ${p.id}.`, p.id);
      break;
    }
    case "AGENT_ACCEPTED":
      emit(s, "SIM_AGENT_ACCEPTED", `${agent?.name ?? "Agent"} accepted ${p.id}.`, p.id);
      break;
    case "ON_THE_WAY":
      p.progress = 0;
      emit(s, "SIM_AGENT_STARTED", `${agent?.name ?? "Agent"} is on the way (simulated GPS).`, p.id);
      notify(s, custName(s, p.customerId), "Agent on the way", `Simulated agent ${agent?.name ?? ""} is on the way.`, "WHATSAPP");
      break;
    case "ARRIVED":
      p.progress = 1;
      if (agent) agent.status = "COLLECTING";
      emit(s, "SIM_AGENT_ARRIVED", `${agent?.name ?? "Agent"} arrived at simulated location.`, p.id);
      break;
    case "COLLECTED":
      if (p.scenario === "failed") {
        p.status = "FAILED";
        p.auto = false;
        if (agent) agent.status = "IDLE";
        emit(s, "SIM_PICKUP_FAILED", `${p.id} failed — nobody at simulated location.`, p.id);
        return;
      }
      emit(s, "SIM_ITEMS_COLLECTED", `Items collected for ${p.id}.`, p.id);
      break;
    case "VERIFIED": {
      const variance = p.scenario === "weight-diff" ? 0.45 : s.settings.weightVariance;
      p.actualKg = p.actualKg ?? simulateActualWeight(p.estimatedKg, variance);
      emit(s, "SIM_WEIGHT_VERIFIED", `${p.id} simulated actual weight ${p.actualKg} kg.`, p.id);
      break;
    }
    case "COMPLETED": {
      p.completedAt = s.clock;
      const weight = p.actualKg ?? p.estimatedKg;
      if (agent) {
        agent.status = "IDLE";
        agent.completed += 1;
        agent.collectedKg = round2(agent.collectedKg + weight);
        agent.loc = { ...agent.home };
      }
      emit(s, "SIM_PICKUP_COMPLETED", `${p.id} completed (${weight} kg).`, p.id);
      receiveInventory(s, p);
      creditReward(s, p.customerId, weight, p.id);
      if (p.auto) autoBatch(s, p);
      break;
    }
  }
}

function receiveInventory(s: SimState, p: Pickup) {
  const center = s.centers.find((c) => c.id === p.centerId) ?? s.centers[0]!;
  const totalEst = p.items.reduce((t, i) => t + i.weightKg * i.qty, 0) || 1;
  const actual = p.actualKg ?? p.estimatedKg;
  for (const item of p.items) {
    for (let q = 0; q < item.qty; q++) {
      const w = round2((item.weightKg / totalEst) * actual);
      const cat = CATEGORY_MAP[item.category];
      const condition: InventoryItem["condition"] =
        item.category === "battery" ? "Hazardous" : cat.factors.reusable > 0.12 ? "Refurbishable" : "Recyclable";
      s.inventory.unshift({
        id: nextId(s, "INV"),
        pickupId: p.id,
        centerId: center.id,
        category: item.category,
        weightKg: w,
        condition,
        status: "STORED",
        environment: ENVIRONMENT,
      });
    }
  }
  center.inventoryKg = round2(center.inventoryKg + actual);
  emit(s, "SIM_INVENTORY_RECEIVED", `${center.name} received ${actual} kg from ${p.id}.`, p.id);
}

function creditReward(s: SimState, customerId: string, weight: number, ref: string) {
  const pts = rewardPoints(weight, s.settings.pointsPerKg);
  const cust = s.customers.find((c) => c.id === customerId);
  if (cust) cust.points += pts;
  s.rewards.unshift({
    id: nextId(s, "RWD"),
    customerId,
    type: "EARN",
    points: pts,
    note: `Simulated pickup ${ref}`,
    at: s.clock,
    environment: ENVIRONMENT,
  });
  emit(s, "SIM_REWARD_CREDITED", `${pts} simulated points credited to ${cust?.name ?? "customer"}.`, ref);
  notify(s, cust?.name ?? "Customer", "Simulated reward credited", `${pts} simulated points added for ${ref}.`);
}

/* ------------------------------------------------------------------ */
/* Center / batch operations                                           */
/* ------------------------------------------------------------------ */

export function runSorting(centerId: string) {
  commit((s) => {
    const items = s.inventory.filter((i) => i.centerId === centerId && i.status === "STORED");
    if (!items.length) return;
    items.forEach((i) => (i.status = "SORTED"));
    const result = simulateSorting(items, s.settings.factors);
    emit(
      s,
      "SIM_SORTING_COMPLETED",
      `Sorting simulation at center: reusable ${result.reusable} kg · recyclable ${result.recyclable} kg · hazardous ${result.hazardous} kg · residual ${result.residual} kg.`,
      centerId,
    );
    audit(s, `Ran sorting simulation for ${centerId}`);
  });
}

export function createBatch(centerId: string) {
  commit((s) => {
    const items = s.inventory.filter(
      (i) => i.centerId === centerId && (i.status === "SORTED" || i.status === "STORED"),
    );
    if (!items.length) return;
    makeBatch(s, centerId, items);
  });
}

function makeBatch(s: SimState, centerId: string, items: InventoryItem[], customerId?: string) {
  const id = nextId(s, "BATCH");
  const inputKg = round2(items.reduce((t, i) => t + i.weightKg, 0));
  const recycler = pick(rng, s.recyclers);
  items.forEach((i) => {
    i.status = "BATCHED";
    i.batchId = id;
  });
  const batch: Batch = {
    id,
    centerId,
    recyclerId: recycler.id,
    customerId,
    inputKg,
    sorting: simulateSorting(items, s.settings.factors),
    status: "SORTED",
    createdAt: s.clock,
    environment: ENVIRONMENT,
  };
  s.batches.unshift(batch);
  emit(s, "SIM_BATCH_CREATED", `${id} created with ${inputKg} kg for ${recycler.name}.`, id);
  return batch;
}

function autoBatch(s: SimState, p: Pickup) {
  const items = s.inventory.filter((i) => i.pickupId === p.id);
  if (!items.length) return;
  const batch = makeBatch(s, p.centerId, items, p.customerId);
  processBatch(s, batch.id);
}

export function runRecycling(batchId: string) {
  commit((s) => processBatch(s, batchId));
}

function processBatch(s: SimState, batchId: string) {
  const b = s.batches.find((x) => x.id === batchId);
  if (!b || b.status === "COMPLETED") return;
  const items = s.inventory.filter((i) => i.batchId === b.id);
  const sorting = b.sorting ?? simulateSorting(items, s.settings.factors);
  const materials = simulateMaterials(sorting.recyclable);
  const recoveredKg = round2(sorting.reusable + sorting.recyclable);
  b.sorting = sorting;
  b.materials = materials;
  b.recoveredKg = recoveredKg;
  b.co2eKg = estimateCo2e(recoveredKg, s.settings.co2ePerKg);
  b.status = "COMPLETED";
  items.forEach((i) => (i.status = "PROCESSED"));
  const center = s.centers.find((c) => c.id === b.centerId);
  if (center) center.inventoryKg = round2(Math.max(0, center.inventoryKg - b.inputKg));
  emit(s, "SIM_RECYCLING_STARTED", `${b.id} entered simulated recycling.`, b.id);
  emit(s, "SIM_RECYCLING_COMPLETED", `${b.id} processed — ${recoveredKg} kg simulated recovery.`, b.id);
  generateCertificate(s, b.id);
}

export function generateCertificateFor(batchId: string) {
  commit((s) => generateCertificate(s, batchId));
}

function generateCertificate(s: SimState, batchId: string) {
  const b = s.batches.find((x) => x.id === batchId);
  if (!b || b.certificateId) return;
  const customerId = b.customerId ?? s.customers[0]!.id;
  const id = nextId(s, "CERT");
  s.certificates.unshift({
    id,
    batchId: b.id,
    customerId,
    customerName: custName(s, customerId),
    inputKg: b.inputKg,
    recycledKg: b.recoveredKg ?? 0,
    co2eKg: b.co2eKg ?? 0,
    issuedAt: s.clock,
    environment: ENVIRONMENT,
  });
  b.certificateId = id;
  emit(s, "SIM_CERTIFICATE_GENERATED", `${id} generated for ${b.id}.`, id);
  notify(s, custName(s, customerId), "Simulation certificate ready", `${id} is available for ${b.id}.`, "EMAIL");
}

/* ------------------------------------------------------------------ */
/* Rewards                                                             */
/* ------------------------------------------------------------------ */

export function redeemReward(customerId: string, productId: string) {
  commit((s) => {
    const product = REWARD_PRODUCTS.find((p) => p.id === productId);
    const cust = s.customers.find((c) => c.id === customerId);
    if (!product || !cust || cust.points < product.points) return;
    cust.points -= product.points;
    s.rewards.unshift({
      id: nextId(s, "RWD"),
      customerId,
      type: "REDEEM",
      points: -product.points,
      note: `Simulated redemption — ${product.name}`,
      at: s.clock,
      environment: ENVIRONMENT,
    });
    emit(s, "SIM_REWARD_REDEEMED", `${cust.name} redeemed ${product.name} (simulated).`, customerId);
    notify(s, cust.name, "Simulation redemption successful", `${product.name} redeemed for ${product.points} simulated points.`);
  });
}

/* ------------------------------------------------------------------ */
/* Clock + tick                                                        */
/* ------------------------------------------------------------------ */

export function tick(realMs: number) {
  const s = ensure();
  if (!s.settings.running) return;
  commit((st) => {
    st.clock += realMs * st.settings.speed;
    step(st);
  });
}

function step(s: SimState) {
  for (const p of s.pickups) {
    if (!p.auto) continue;
    if (p.status === "COMPLETED" || p.status === "CANCELLED" || p.status === "FAILED") continue;
    if (p.status === "ON_THE_WAY") {
      p.progress = Math.min(1, p.progress + s.settings.agentSpeed * (p.scenario === "agent-delay" ? 0.35 : 1));
      const agent = s.agents.find((a) => a.id === p.agentId);
      const cust = s.customers.find((c) => c.id === p.customerId);
      if (agent && cust) {
        agent.loc = {
          x: agent.home.x + (cust.loc.x - agent.home.x) * p.progress,
          y: agent.home.y + (cust.loc.y - agent.home.y) * p.progress,
        };
      }
      if (p.progress < 1) continue;
    }
    if (s.clock >= p.nextStepAt) advancePickup(s, p);
  }
  if (!s.pickups.some((p) => p.auto && !["COMPLETED", "CANCELLED", "FAILED"].includes(p.status))) {
    s.activeScenarios = [];
  }
}

export function nextEvent() {
  commit((s) => {
    const p = s.pickups.find((x) => !["COMPLETED", "CANCELLED", "FAILED"].includes(x.status));
    if (!p) return;
    p.auto = true;
    p.progress = 1;
    s.clock += s.settings.stepSeconds * STEP_MS;
    advancePickup(s, p);
  });
}

export function setRunning(running: boolean) {
  commit((s) => {
    s.settings.running = running;
    emit(s, running ? "SIM_STARTED" : "SIM_PAUSED", running ? "Simulation started." : "Simulation paused.");
  });
}

export function setSpeed(speed: number) {
  commit((s) => {
    s.settings.speed = speed;
  });
}

export function setRole(role: Role) {
  commit((s) => {
    s.role = role;
    audit(s, `Switched simulated role to ${role}`);
  });
}

export function setCurrentCustomer(id: string) {
  commit((s) => {
    s.currentCustomerId = id;
  });
}

export function updateSettings(patch: Partial<SimState["settings"]>) {
  commit((s) => {
    s.settings = { ...s.settings, ...patch };
    audit(s, "Updated simulation configuration");
  });
}

export function updateFactor(category: CategoryId, key: keyof Sorting, value: number) {
  commit((s) => {
    s.settings.factors[category] = { ...s.settings.factors[category], [key]: value };
  });
}

export function resetSimulation(seed?: string) {
  const newSeed = seed ?? ensure().settings.seed;
  state = buildInitialState(newSeed);
  state = { ...state, version: state.version + 1 };
  listeners.forEach((l) => l());
}

export function clearDemoData() {
  commit((s) => {
    s.pickups = [];
    s.inventory = [];
    s.batches = [];
    s.certificates = [];
    s.rewards = [];
    s.notifications = [];
    s.events = [];
    s.activeScenarios = [];
    s.centers.forEach((c) => (c.inventoryKg = 0));
    s.agents.forEach((a) => {
      a.status = "IDLE";
      a.completed = 0;
      a.collectedKg = 0;
      a.loc = { ...a.home };
    });
    emit(s, "SIM_DATA_CLEARED", "Simulation records cleared.");
  });
}

export function markNotificationsRead() {
  commit((s) => s.notifications.forEach((n) => (n.read = true)));
}

/* ------------------------------------------------------------------ */
/* Scenarios & demo mode                                               */
/* ------------------------------------------------------------------ */

function randomItems(r: Rng, heavyBattery = false): PickupItem[] {
  const count = 1 + Math.floor(r() * 3);
  const items: PickupItem[] = [];
  for (let i = 0; i < count; i++) {
    const cat = heavyBattery && i === 0 ? CATEGORY_MAP.battery : pick(r, CATEGORIES);
    items.push({ category: cat.id, qty: 1 + Math.floor(r() * 3), weightKg: cat.avgWeightKg });
  }
  return items;
}

export function runScenario(scenarioId: string) {
  commit((s) => {
    s.activeScenarios = [...new Set([...s.activeScenarios, scenarioId])];
    s.settings.running = true;
    const mk = (scenario: string, customerIdx: number, items: PickupItem[]) => {
      const customer = s.customers[customerIdx % s.customers.length]!;
      const id = nextId(s, "PICK");
      s.pickups.unshift({
        id,
        customerId: customer.id,
        centerId: centerFor(s, s.pickups.length).id,
        items,
        estimatedKg: estimateWeight(items),
        status: "REQUESTED",
        auto: true,
        progress: 0,
        nextStepAt: s.clock,
        createdAt: s.clock,
        scenario,
        environment: ENVIRONMENT,
      });
      emit(s, "SIM_PICKUP_CREATED", `${id} created by scenario "${scenario}".`, id);
      return id;
    };

    switch (scenarioId) {
      case "high-volume":
        for (let i = 0; i < 6; i++) mk(scenarioId, i, randomItems(rng));
        break;
      case "cancellation": {
        const id = mk(scenarioId, 1, randomItems(rng));
        const p = s.pickups.find((x) => x.id === id)!;
        p.status = "ON_THE_WAY";
        p.auto = false;
        p.note = "Scenario: customer cancels while agent is en route.";
        break;
      }
      case "near-capacity": {
        const center = s.centers[0]!;
        center.inventoryKg = Math.round(center.capacityKg * 0.94);
        emit(s, "SIM_CENTER_NEAR_CAPACITY", `${center.name} is at 94% simulated capacity.`, center.id);
        break;
      }
      case "hazardous":
        mk(scenarioId, 3, randomItems(rng, true));
        emit(s, "SIM_HAZARDOUS_DETECTED", "Hazardous material flagged in simulated load.");
        break;
      default:
        mk(scenarioId, 0, randomItems(rng));
    }
    audit(s, `Generated scenario ${scenarioId}`);
  });
}

export function launchDemo() {
  resetSimulation(ensure().settings.seed);
  commit((s) => {
    s.settings.running = false;
    // Historical completed lifecycles so dashboards have data immediately.
    for (let i = 0; i < 8; i++) {
      const customer = s.customers[i % s.customers.length]!;
      const items = randomItems(rng);
      const id = nextId(s, "PICK");
      const actual = simulateActualWeight(estimateWeight(items), s.settings.weightVariance);
      const center = centerFor(s, i);
      const p: Pickup = {
        id,
        customerId: customer.id,
        agentId: s.agents[i % s.agents.length]!.id,
        centerId: center.id,
        items,
        estimatedKg: estimateWeight(items),
        actualKg: actual,
        status: "COMPLETED",
        auto: false,
        progress: 1,
        nextStepAt: s.clock,
        createdAt: s.clock - (8 - i) * 3600 * 1000,
        completedAt: s.clock - (8 - i) * 3400 * 1000,
        environment: ENVIRONMENT,
      };
      s.pickups.push(p);
      const agent = s.agents[i % s.agents.length]!;
      agent.completed += 1;
      agent.collectedKg = round2(agent.collectedKg + actual);
      emit(s, "SIM_PICKUP_COMPLETED", `${id} completed (${actual} kg).`, id);
      receiveInventory(s, p);
      creditReward(s, p.customerId, actual, p.id);
      const items2 = s.inventory.filter((it) => it.pickupId === p.id);
      const batch = makeBatch(s, p.centerId, items2, p.customerId);
      processBatch(s, batch.id);
    }
    // One live pickup to watch
    const customer = s.customers[0]!;
    const liveItems: PickupItem[] = [
      { category: "laptop", qty: 1, weightKg: CATEGORY_MAP.laptop.avgWeightKg },
      { category: "mobile", qty: 2, weightKg: CATEGORY_MAP.mobile.avgWeightKg },
      { category: "charger", qty: 3, weightKg: CATEGORY_MAP.charger.avgWeightKg },
    ];
    const liveId = nextId(s, "PICK");
    s.pickups.unshift({
      id: liveId,
      customerId: customer.id,
      centerId: s.centers[0]!.id,
      items: liveItems,
      estimatedKg: estimateWeight(liveItems),
      status: "REQUESTED",
      auto: true,
      progress: 0,
      nextStepAt: s.clock,
      createdAt: s.clock,
      scenario: "lifecycle",
      environment: ENVIRONMENT,
    });
    s.activeScenarios = ["lifecycle"];
    s.settings.running = true;
    emit(s, "SIM_DEMO_LAUNCHED", "Demo data generated and live lifecycle started.");
    audit(s, "Launched demo mode");
  });
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function activePickup(s: SimState): Pickup | undefined {
  return (
    s.pickups.find((p) => !["COMPLETED", "CANCELLED", "FAILED", "REQUESTED"].includes(p.status)) ??
    s.pickups.find((p) => !["COMPLETED", "CANCELLED", "FAILED"].includes(p.status)) ??
    s.pickups[0]
  );
}

export function totals(s: SimState) {
  const completed = s.pickups.filter((p) => p.status === "COMPLETED");
  const collectedKg = round2(completed.reduce((t, p) => t + (p.actualKg ?? p.estimatedKg), 0));
  const recycledKg = round2(s.batches.reduce((t, b) => t + (b.recoveredKg ?? 0), 0));
  const co2eKg = round2(s.batches.reduce((t, b) => t + (b.co2eKg ?? 0), 0));
  const points = s.rewards.filter((r) => r.type === "EARN").reduce((t, r) => t + r.points, 0);
  return {
    customers: s.customers.length,
    pickups: s.pickups.length,
    completed: completed.length,
    active: s.pickups.filter((p) => !["COMPLETED", "CANCELLED", "FAILED"].includes(p.status)).length,
    collectedKg,
    recycledKg,
    co2eKg,
    points,
    recoveryPct: collectedKg > 0 ? Math.round((recycledKg / collectedKg) * 100) : 0,
    batches: s.batches.length,
    certificates: s.certificates.length,
    inventoryKg: round2(s.centers.reduce((t, c) => t + c.inventoryKg, 0)),
  };
}

export function statusIndex(status: PickupStatus) {
  const i = FLOW.indexOf(status as (typeof FLOW)[number]);
  return i < 0 ? 0 : i;
}

export { FLOW as PICKUP_FLOW, STEP_MS };
export type { Center, Pickup };
