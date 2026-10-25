/**
 * EcoCycle API Client
 * Connects frontend to the FastAPI Python backend at http://localhost:8000/api/v1
 */

const API_HOST = typeof window !== "undefined" && window.location.hostname
  ? `http://${window.location.hostname}:8000`
  : "http://localhost:8000";

export const API_BASE = (typeof import.meta !== "undefined" && (import.meta.env?.['VITE_API_URL'] as string | undefined)) || `${API_HOST}/api/v1`;
export const HEALTH_URL = (typeof import.meta !== "undefined" && (import.meta.env?.['VITE_API_URL'] as string | undefined))
  ? (import.meta.env['VITE_API_URL'] as string).replace(/\/api\/v1\/?$/, "") + "/health"
  : `${API_HOST}/health`;

// System operations accounts (for field dispatch and recycling intake)
export const DEMO_CREDENTIALS = {
  collector: { identifier: "collector@test.demo", password: "Pass@1234", name: "Verified Collector Fleet", role: "COLLECTOR" },
  recycler: { identifier: "recycler@test.demo", password: "Pass@1234", name: "Authorized CPCB Recycler", role: "RECYCLER" },
  admin: { identifier: "admin@ecocycle.demo", password: "Admin@1234", name: "EcoCycle Operations", role: "ADMIN" },
};

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  points_per_kg: number;
  rate_per_kg: number;
  hazardous_flag: boolean;
  active: boolean;
}

export interface ApiAddress {
  id: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  lat?: number | null;
  lng?: number | null;
  is_default: boolean;
}

export interface ApiPickupItem {
  id: string;
  category_id: string;
  quantity: number;
  estimated_weight_g: number;
  actual_weight_g?: number | null;
}

export interface ApiPickupStatusHistory {
  id: string;
  from_status?: string | null;
  to_status: string;
  actor_id?: string | null;
  note?: string | null;
  created_at: string;
}

export interface ApiPickup {
  id: string;
  customer_id: string;
  address_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  estimated_weight_g: number;
  actual_weight_g?: number | null;
  collector_id?: string | null;
  handover_code_hash?: string | null;
  created_at: string;
  items: ApiPickupItem[];
  status_history?: ApiPickupStatusHistory[];
}

export interface ApiWallet {
  user_id: string;
  balance: number;
  lifetime_earned: number;
}

export interface ApiLedgerEntry {
  id: string;
  type: string;
  points: number;
  reference_type?: string | null;
  reference_id?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface ApiOverviewStats {
  total_users: number;
  total_pickups: number;
  total_weight_kg: number;
  points_issued: number;
  open_disputes: number;
}

export interface ApiComplaint {
  id: string;
  pickup_id: string;
  category: string;
  description?: string | null;
  status: string;
  created_at: string;
}

export interface ApiRecyclingCertificate {
  certificate_id: string;
  pickup_id: string;
  verification_hash: string;
  status: string;
  weight_kg: number;
  item_count: number;
  issued_at: string;
  co2e_avoided_kg: number;
}

// Token management
const TOKEN_KEY = "ecocycle_access_token";
const ROLE_KEY = "ecocycle_current_role";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
  window.dispatchEvent(new Event("ecocycle-auth-change"));
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  window.dispatchEvent(new Event("ecocycle-auth-change"));
}

export function getStoredRole(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ROLE_KEY) || "";
}

export function setStoredRole(role: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLE_KEY, role);
  window.dispatchEvent(new Event("ecocycle-auth-change"));
}

/**
 * Check if the Python backend is up and running
 */
export async function checkBackendHealth(): Promise<{ ok: boolean; status?: string }> {
  try {
    const res = await fetch(HEALTH_URL, { method: "GET", signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, status: data.status || "healthy" };
  } catch {
    return { ok: false };
  }
}

/**
 * Base authenticated fetch wrapper
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: res.statusText };
    }
    const message = errBody?.error?.message || errBody?.detail || res.statusText || "Request failed";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* Auth API                                                           */
/* ------------------------------------------------------------------ */

export async function login(identifier: string, password: string): Promise<{ access_token: string; user: any }> {
  const data = await apiFetch<{ access_token: string; refresh_token: string; user: any }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function googleAuth(payload: {
  credential?: string;
  email?: string;
  name?: string;
  picture?: string;
}): Promise<{ access_token: string; role: string; user_id: string; user?: any }> {
  const data = await apiFetch<{ access_token: string; role: string; user_id: string; user?: any }>("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(data.access_token);
  if (data.role) {
    setStoredRole(data.role);
  }
  return data;
}

export async function ensureDemoLogin(role: "collector" | "recycler" | "admin"): Promise<string> {
  const creds = DEMO_CREDENTIALS[role];
  try {
    const res = await login(creds.identifier, creds.password);
    setStoredRole(creds.role);
    return res.access_token;
  } catch {
    // If login fails (user does not exist yet), try registering
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: creds.name,
          email: creds.identifier,
          password: creds.password,
          role: creds.role,
          consent: true,
        }),
      });
      const res2 = await login(creds.identifier, creds.password);
      setStoredRole(creds.role);
      return res2.access_token;
    } catch (e) {
      console.warn("Could not ensure demo user login:", e);
      throw e;
    }
  }
}

export async function getMe(): Promise<any> {
  return apiFetch("/me");
}

/* ------------------------------------------------------------------ */
/* Categories & Addresses                                             */
/* ------------------------------------------------------------------ */

export async function getCategories(): Promise<ApiCategory[]> {
  return apiFetch<ApiCategory[]>("/categories");
}

export async function getAddresses(): Promise<ApiAddress[]> {
  return apiFetch<ApiAddress[]>("/addresses");
}

export async function createAddress(address: Partial<ApiAddress>): Promise<ApiAddress> {
  return apiFetch<ApiAddress>("/addresses", {
    method: "POST",
    body: JSON.stringify({
      line1: address.line1 || "123 Eco Street",
      line2: address.line2 || "Green Park",
      city: address.city || "Bengaluru",
      state: address.state || "Karnataka",
      pincode: address.pincode || "560001",
      lat: address.lat ?? 12.9716,
      lng: address.lng ?? 77.5946,
      is_default: address.is_default ?? true,
    }),
  });
}

/* ------------------------------------------------------------------ */
/* Pickups API                                                        */
/* ------------------------------------------------------------------ */

export async function getPickups(): Promise<ApiPickup[]> {
  return apiFetch<ApiPickup[]>("/pickups");
}

export async function getPickup(id: string): Promise<ApiPickup> {
  return apiFetch<ApiPickup>(`/pickups/${id}`);
}

export async function trackPickup(id: string): Promise<any> {
  return apiFetch(`/pickups/${id}/track`);
}

export interface CreatePickupInput {
  address_id: string;
  slot_start?: string;
  slot_end?: string;
  items: Array<{ category_id: string; quantity: number; estimated_weight_g: number }>;
  notes?: string;
  data_wipe_acknowledged?: boolean;
}

export async function createPickup(input: CreatePickupInput): Promise<ApiPickup> {
  const now = new Date();
  const slot_start = input.slot_start || new Date(now.getTime() + 86400000).toISOString();
  const slot_end = input.slot_end || new Date(now.getTime() + 86400000 + 3600000 * 3).toISOString();

  return apiFetch<ApiPickup>("/pickups", {
    method: "POST",
    body: JSON.stringify({
      address_id: input.address_id,
      slot_start,
      slot_end,
      items: input.items,
      notes: input.notes || "Handle with care",
      data_wipe_acknowledged: input.data_wipe_acknowledged ?? true,
    }),
  });
}

export async function cancelPickup(id: string, reason = "Customer requested cancellation"): Promise<any> {
  return apiFetch(`/pickups/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/* ------------------------------------------------------------------ */
/* Rewards API                                                        */
/* ------------------------------------------------------------------ */

export async function getRewardsWallet(): Promise<ApiWallet> {
  return apiFetch<ApiWallet>("/rewards/wallet");
}

export async function getRewardsLedger(): Promise<ApiLedgerEntry[]> {
  return apiFetch<ApiLedgerEntry[]>("/rewards/ledger");
}

/* ------------------------------------------------------------------ */
/* Complaints & Certificates API                                      */
/* ------------------------------------------------------------------ */

export async function raiseComplaint(pickupId: string, category: string, description?: string): Promise<ApiComplaint> {
  return apiFetch<ApiComplaint>("/complaints", {
    method: "POST",
    body: JSON.stringify({ pickup_id: pickupId, category, description }),
  });
}

export async function getComplaints(): Promise<ApiComplaint[]> {
  return apiFetch<ApiComplaint[]>("/complaints");
}

export async function getCertificates(): Promise<ApiRecyclingCertificate[]> {
  return apiFetch<ApiRecyclingCertificate[]>("/certificates");
}

export async function getCertificate(pickupId: string): Promise<ApiRecyclingCertificate> {
  return apiFetch<ApiRecyclingCertificate>(`/certificates/${pickupId}`);
}


/* ------------------------------------------------------------------ */
/* Admin & Analytics API                                              */
/* ------------------------------------------------------------------ */

export async function getAnalyticsOverview(): Promise<ApiOverviewStats> {
  return apiFetch<ApiOverviewStats>("/admin/analytics/overview");
}

/* ------------------------------------------------------------------ */
/* Full Lifecycle Orchestrator (Backend PRD End-to-End Runner)        */
/* ------------------------------------------------------------------ */

/**
 * Executes the entire lifecycle for a pickup on the Python backend:
 * 1. Collector accepts offer
 * 2. Collector sets EN_ROUTE
 * 3. Collector sets ARRIVED
 * 4. Collector weighs & marks COLLECTED
 * 5. Collector creates batch to Recycler & marks DELIVERED
 * 6. Recycler receives & verifies batch -> RECYCLER_VERIFIED -> COMPLETED
 * 7. Rewards credited to Customer & Earnings recorded to Collector!
 */
export async function runLiveBackendLifecycle(
  pickupId: string,
  actualWeightG = 4500,
  onStep?: (step: string) => void,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Collector login
    onStep?.("Collector accepting job offer...");
    const colLogin = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_CREDENTIALS.collector),
    });
    if (!colLogin.ok) throw new Error("Collector login failed");
    const colToken = (await colLogin.json()).access_token;
    const colHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${colToken}` };

    // Find and accept offer or direct assignment
    onStep?.("Collector accepting pickup assignment...");
    const acceptRes = await fetch(`${API_BASE}/collector/jobs/${pickupId}/accept`, {
      method: "POST",
      headers: colHeaders,
      body: JSON.stringify({ eta_minutes: 15 }),
    });
    if (!acceptRes.ok) {
      const offersRes = await fetch(`${API_BASE}/collector/offers`, { headers: colHeaders });
      if (offersRes.ok) {
        const offers = await offersRes.json();
        const myOffer = offers.find((o: any) => o.pickup_id === pickupId) || offers[0];
        if (myOffer) {
          await fetch(`${API_BASE}/collector/offers/${myOffer.offer_id}/accept`, {
            method: "POST",
            headers: colHeaders,
          });
        }
      }
    }

    // 2. En-route
    onStep?.("Collector en route to customer...");
    await fetch(`${API_BASE}/collector/jobs/${pickupId}/status`, {
      method: "POST",
      headers: colHeaders,
      body: JSON.stringify({ status: "EN_ROUTE" }),
    });

    // 3. Arrived
    onStep?.("Collector arrived at pickup location...");
    await fetch(`${API_BASE}/collector/jobs/${pickupId}/status`, {
      method: "POST",
      headers: colHeaders,
      body: JSON.stringify({ status: "ARRIVED" }),
    });

    // 4. Weigh & Collect
    onStep?.(`Weighing e-waste (${(actualWeightG / 1000).toFixed(1)} kg)...`);
    const pickupDetailsRes = await fetch(`${API_BASE}/pickups/${pickupId}`, { headers: colHeaders });
    let weightsPayload: Array<{ pickup_item_id: string; actual_weight_g: number }> = [];
    let detectedCatId: string | null = null;
    if (pickupDetailsRes.ok) {
      const p = await pickupDetailsRes.json();
      if (p.items && p.items.length > 0) {
        detectedCatId = p.items[0].category_id;
        const perItemWeight = Math.round(actualWeightG / p.items.length);
        weightsPayload = p.items.map((it: any) => ({
          pickup_item_id: it.id,
          actual_weight_g: it.estimated_weight_g || perItemWeight,
        }));
      }
    }
    if (weightsPayload.length === 0) {
      weightsPayload = [{ pickup_item_id: "default-item", actual_weight_g: actualWeightG }];
    }

    await fetch(`${API_BASE}/collector/jobs/${pickupId}/weigh`, {
      method: "POST",
      headers: colHeaders,
      body: JSON.stringify({
        weights: weightsPayload,
        notes: "Verified safe packaging",
      }),
    });

    // 5. Recycler login & Delivery Batch
    onStep?.("Creating delivery batch to authorized recycler...");
    const recLogin = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_CREDENTIALS.recycler),
    });
    if (!recLogin.ok) {
      const err = await recLogin.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || "Recycler login failed");
    }
    const recData = await recLogin.json();
    const recToken = recData.access_token;
    const recyclerUserId = recData.user_id || recData.user?.id;
    if (!recyclerUserId) throw new Error("Recycler account ID missing");
    const recHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${recToken}` };

    const batchRes = await fetch(`${API_BASE}/collector/batches`, {
      method: "POST",
      headers: colHeaders,
      body: JSON.stringify({
        recycler_id: recyclerUserId,
        pickup_ids: [pickupId],
      }),
    });
    if (!batchRes.ok) {
      const err = await batchRes.json().catch(() => ({}));
      const msg = typeof err.detail === "string" ? err.detail : err.detail?.message || (Array.isArray(err.detail) ? err.detail[0]?.msg : null);
      throw new Error(msg || "Batch creation failed");
    }
    const batchId = (await batchRes.json()).batch_id;

    // Mark Delivered
    const deliverRes = await fetch(`${API_BASE}/collector/batches/${batchId}/deliver`, {
      method: "POST",
      headers: colHeaders,
      body: JSON.stringify({ collector_weight_g: actualWeightG }),
    });
    if (!deliverRes.ok) {
      const err = await deliverRes.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || "Delivery to recycler failed");
    }

    // 6. Recycler Verifies
    onStep?.("Recycler verifying delivery and processing intake...");
    const catsRes = await fetch(`${API_BASE}/categories`);
    const cats = catsRes.ok ? await catsRes.json() : [];
    const validCatId = (detectedCatId && cats.find((c: any) => c.id === detectedCatId)?.id) || cats[0]?.id || "1bd316c8-d1d7-40c3-8122-4c5d215749ec";

    const receiveRes = await fetch(`${API_BASE}/recycler/deliveries/${batchId}/receive`, {
      method: "POST",
      headers: recHeaders,
      body: JSON.stringify({
        action: "accept",
        received_weights: [{ category_id: validCatId, weight_g: actualWeightG }],
      }),
    });
    if (!receiveRes.ok) {
      const err = await receiveRes.json().catch(() => ({}));
      throw new Error(err.detail?.message || err.detail || "Recycler intake verification failed");
    }

    onStep?.("Completed! Customer points credited & Collector earnings recorded.");
    return { success: true };
  } catch (err: any) {
    console.error("runLiveBackendLifecycle error:", err);
    return { success: false, error: err?.message || "Lifecycle error" };
  }
}
