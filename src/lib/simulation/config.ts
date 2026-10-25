import type { Category, CategoryId, RewardProduct } from "./types";

export const DEFAULT_SEED = "EC0CYCLE-2026";

/** Simulated clock origin: 25 Sep 2026, 10:30 local-ish (UTC based, deterministic). */
export const CLOCK_ORIGIN = Date.UTC(2026, 8, 25, 5, 0, 0);

export const CATEGORIES: Category[] = [
  {
    id: "laptop",
    label: "Laptop",
    emoji: "💻",
    avgWeightKg: 2.3,
    factors: { reusable: 0.1, recyclable: 0.7, hazardous: 0.05, residual: 0.15 },
  },
  {
    id: "mobile",
    label: "Mobile Phone",
    emoji: "📱",
    avgWeightKg: 0.2,
    factors: { reusable: 0.15, recyclable: 0.65, hazardous: 0.08, residual: 0.12 },
  },
  {
    id: "charger",
    label: "Charger / Cable",
    emoji: "🔌",
    avgWeightKg: 0.15,
    factors: { reusable: 0.05, recyclable: 0.75, hazardous: 0.02, residual: 0.18 },
  },
  {
    id: "tv",
    label: "Television",
    emoji: "📺",
    avgWeightKg: 9.5,
    factors: { reusable: 0.08, recyclable: 0.62, hazardous: 0.12, residual: 0.18 },
  },
  {
    id: "battery",
    label: "Battery Pack",
    emoji: "🔋",
    avgWeightKg: 0.45,
    factors: { reusable: 0.02, recyclable: 0.48, hazardous: 0.4, residual: 0.1 },
  },
  {
    id: "printer",
    label: "Printer",
    emoji: "🖨️",
    avgWeightKg: 6.2,
    factors: { reusable: 0.07, recyclable: 0.66, hazardous: 0.09, residual: 0.18 },
  },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const DEFAULT_FACTORS = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, { ...c.factors }]),
) as Record<CategoryId, Category["factors"]>;

/** Simulated material split of the recyclable fraction. Demo parameters only. */
export const MATERIAL_SPLIT: Record<string, number> = {
  Copper: 0.12,
  Aluminum: 0.09,
  Plastic: 0.38,
  Glass: 0.18,
  Steel: 0.22,
  "Precious-material category": 0.01,
};

export const REWARD_PRODUCTS: RewardProduct[] = [
  { id: "eco-bottle", name: "Eco Bottle", emoji: "🍶", points: 100 },
  { id: "plant-kit", name: "Plant Kit", emoji: "🌱", points: 250 },
  { id: "voucher", name: "Eco Shopping Voucher", emoji: "🎟️", points: 500 },
  { id: "starter-kit", name: "Green Starter Kit", emoji: "🎁", points: 1000 },
];

export const SCENARIOS = [
  { id: "normal", name: "Normal Pickup", desc: "One simulated pickup, clean lifecycle." },
  { id: "high-volume", name: "High Volume Day", desc: "Six simulated pickups at once." },
  { id: "agent-delay", name: "Agent Delay", desc: "Travel takes three times longer." },
  { id: "cancellation", name: "Pickup Cancellation", desc: "Customer cancels mid-flow." },
  { id: "weight-diff", name: "Weight Difference", desc: "Large estimate vs simulated actual gap." },
  { id: "near-capacity", name: "Center Near Capacity", desc: "Center A filled to 94%." },
  { id: "recycler-delay", name: "Recycler Processing Delay", desc: "Batch processing slowed." },
  { id: "hazardous", name: "Hazardous Material Detected", desc: "Battery-heavy simulated load." },
  { id: "failed", name: "Failed Pickup", desc: "Agent cannot collect, pickup fails." },
  { id: "lifecycle", name: "Complete Successful Lifecycle", desc: "Pickup → certificate → reward." },
] as const;

export const DEMO_CUSTOMERS = [
  { name: "Advait Nawathe", address: "102 Metro View, Indiranagar, Bengaluru 560038" },
  { name: "Kiran Rao", address: "44 Residency Road, Richmond Town, Bengaluru 560025" },
  { name: "Vikram Mehta", address: "7 14th Main, HSR Layout Sector 4, Bengaluru 560102" },
  { name: "Ananya Deshpande", address: "91 5th Cross, Koramangala 4th Block, Bengaluru 560034" },
];

export const DEMO_AGENTS = ["EcoAgent 01 (Indiranagar)", "EcoAgent 02 (Whitefield)", "EcoAgent 03 (HSR Layout)", "EcoAgent 04 (Peenya)"];
export const DEMO_CENTERS = ["EcoCycle Hub East (Whitefield)", "EcoCycle Hub Central (Indiranagar)", "EcoCycle Hub West (Peenya)"];
export const DEMO_RECYCLERS = ["GreenTech Recyclers (Peenya)", "EcoMetal Recovery Ltd", "RenewCycle Advanced Facility"];
