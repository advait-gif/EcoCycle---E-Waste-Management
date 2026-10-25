export const SIMULATION_ONLY = true;
export const ENVIRONMENT = "SIMULATION" as const;

export type Role = "CUSTOMER" | "COLLECTION_AGENT" | "CENTER_MANAGER" | "RECYCLER" | "ADMIN";

export const PICKUP_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "ASSIGNED",
  "AGENT_ACCEPTED",
  "ON_THE_WAY",
  "ARRIVED",
  "COLLECTED",
  "VERIFIED",
  "COMPLETED",
] as const;

export type PickupStatus = (typeof PICKUP_STATUSES)[number] | "CANCELLED" | "FAILED";

export type CategoryId = "laptop" | "mobile" | "charger" | "tv" | "battery" | "printer";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  avgWeightKg: number;
  factors: { reusable: number; recyclable: number; hazardous: number; residual: number };
}

export interface Point {
  x: number;
  y: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  address: string;
  loc: Point;
  points: number;
  environment: typeof ENVIRONMENT;
}

export interface Agent {
  id: string;
  name: string;
  status: "IDLE" | "EN_ROUTE" | "COLLECTING";
  loc: Point;
  home: Point;
  completed: number;
  collectedKg: number;
  environment: typeof ENVIRONMENT;
}

export interface Center {
  id: string;
  name: string;
  capacityKg: number;
  inventoryKg: number;
  loc: Point;
  environment: typeof ENVIRONMENT;
}

export interface Recycler {
  id: string;
  name: string;
  loc: Point;
  environment: typeof ENVIRONMENT;
}

export interface PickupItem {
  category: CategoryId;
  qty: number;
  weightKg: number;
}

export interface Pickup {
  id: string;
  customerId: string;
  agentId?: string | undefined;
  centerId: string;
  items: PickupItem[];
  estimatedKg: number;
  actualKg?: number | undefined;
  status: PickupStatus;
  auto: boolean;
  progress: number;
  nextStepAt: number;
  createdAt: number;
  completedAt?: number | undefined;
  scenario?: string | undefined;
  note?: string | undefined;
  environment: typeof ENVIRONMENT;
}

export interface InventoryItem {
  id: string;
  pickupId: string;
  centerId: string;
  category: CategoryId;
  weightKg: number;
  condition: "Refurbishable" | "Recyclable" | "Hazardous" | "Non-Recyclable";
  status: "STORED" | "SORTED" | "BATCHED" | "PROCESSED";
  batchId?: string | undefined;
  environment: typeof ENVIRONMENT;
}

export interface Sorting {
  reusable: number;
  recyclable: number;
  hazardous: number;
  residual: number;
}

export interface Batch {
  id: string;
  centerId: string;
  recyclerId: string;
  customerId?: string | undefined;
  inputKg: number;
  sorting?: Sorting | undefined;
  materials?: Record<string, number> | undefined;
  recoveredKg?: number | undefined;
  co2eKg?: number | undefined;
  status: "CREATED" | "SORTED" | "PROCESSING" | "COMPLETED";
  certificateId?: string | undefined;
  createdAt: number;
  environment: typeof ENVIRONMENT;
}

export interface Certificate {
  id: string;
  batchId: string;
  customerId: string;
  customerName: string;
  inputKg: number;
  recycledKg: number;
  co2eKg: number;
  issuedAt: number;
  environment: typeof ENVIRONMENT;
}

export interface RewardTxn {
  id: string;
  customerId: string;
  type: "EARN" | "REDEEM" | "REVERSE" | "ADJUST";
  points: number;
  note: string;
  at: number;
  environment: typeof ENVIRONMENT;
}

export interface RewardProduct {
  id: string;
  name: string;
  emoji: string;
  points: number;
}

export type Channel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP";

export interface Notification {
  id: string;
  channel: Channel;
  title: string;
  message: string;
  to: string;
  at: number;
  read: boolean;
  environment: typeof ENVIRONMENT;
}

export interface SimEvent {
  id: string;
  type: string;
  message: string;
  at: number;
  refId?: string | undefined;
  environment: typeof ENVIRONMENT;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: Role;
  at: number;
  environment: typeof ENVIRONMENT;
}

export interface SimSettings {
  seed: string;
  speed: number;
  running: boolean;
  pointsPerKg: number;
  co2ePerKg: number;
  weightVariance: number;
  agentSpeed: number;
  stepSeconds: number;
  failureProbability: number;
  delayProbability: number;
  factors: Record<CategoryId, Category["factors"]>;
}

export interface SimState {
  version: number;
  clock: number;
  settings: SimSettings;
  role: Role;
  currentCustomerId: string | null;
  customers: Customer[];
  agents: Agent[];
  centers: Center[];
  recyclers: Recycler[];
  pickups: Pickup[];
  inventory: InventoryItem[];
  batches: Batch[];
  certificates: Certificate[];
  rewards: RewardTxn[];
  notifications: Notification[];
  events: SimEvent[];
  audit: AuditLog[];
  counters: Record<string, number>;
  activeScenarios: string[];
}
