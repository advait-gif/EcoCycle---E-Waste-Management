import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardTitle, Chip, PopButton, SectionNote, Stat } from "@/components/sim/ui";
import { redeemReward, setCurrentCustomer } from "@/lib/simulation/engine";
import { useSim } from "@/lib/simulation/react";
import { simDate } from "@/lib/simulation/format";
import { REWARD_PRODUCTS } from "@/lib/simulation/config";
import { useBackend } from "@/hooks/use-backend";
import {
  getRewardsWallet,
  getRewardsLedger,
  getCertificates,
  getToken,
  getMe,
  type ApiWallet,
  type ApiLedgerEntry,
  type ApiRecyclingCertificate,
} from "@/lib/api";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Eco-Rewards & Impact — EcoCycle" },
      {
        name: "description",
        content:
          "Reward points balance, verified double-entry ledger, environmental impact metrics, and official green recycling certificates.",
      },
      { property: "og:title", content: "Eco-Rewards & Impact — EcoCycle" },
      { property: "og:description", content: "Earn verified EcoCycle reward points for responsible e-waste recycling." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const s = useSim();
  const { isOnline } = useBackend();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [ledger, setLedger] = useState<ApiLedgerEntry[]>([]);
  const [certificates, setCertificates] = useState<ApiRecyclingCertificate[]>([]);

  const customer = s.customers.find((c) => c.id === s.currentCustomerId) ?? s.customers[0];
  const txns = customer ? s.rewards.filter((r) => r.customerId === customer.id) : [];
  const earned = txns.filter((r) => r.type === "EARN").reduce((t, r) => t + r.points, 0);
  const redeemed = txns.filter((r) => r.type === "REDEEM").reduce((t, r) => t + Math.abs(r.points), 0);

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
    if (isOnline && getToken()) {
      getRewardsWallet().then(setWallet).catch(() => {});
      getRewardsLedger().then(setLedger).catch(() => {});
      getCertificates().then(setCertificates).catch(() => {});
    }
  }, [isOnline, currentUser]);

  const displayBalance = isOnline && wallet ? wallet.balance : (customer?.points ?? 0);
  const displayEarned = isOnline && wallet ? wallet.lifetime_earned : earned;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Eco-Rewards &amp; Sustainability Wallet</h1>
        <SectionNote>
          Transparent, double-entry reward points: points are credited directly to your account once an authorized recycler verifies intake weights.
        </SectionNote>
      </header>

      {currentUser || customer ? (
        <Card>
          <CardTitle
            title="Active Customer Account"
            badge={<Chip tone="lime">Registered Participant</Chip>}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-base text-foreground flex items-center gap-2">
                <span>👤</span>
                <span>{currentUser?.name || customer?.name}</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {currentUser?.email || customer?.email}
              </div>
            </div>
            <div className="rounded-full bg-leaf/10 border border-leaf/30 px-3 py-1 text-xs font-bold text-leaf">
              Verified Green Rewards Active
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-border bg-cream/40">
          <CardTitle
            title="Customer Account"
            badge={<Chip tone="coral">Not Signed In</Chip>}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              No registered customer session active. Register an account or sign in to view your verified green credits and certificate custody ledger.
            </p>
            <Link
              to="/login"
              className="rounded-xl bg-leaf px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-leaf/90 shrink-0"
            >
              Register / Sign In →
            </Link>
          </div>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Current Wallet Balance" value={`${displayBalance} pts`} tone="text-leaf" />
        <Stat label="Lifetime Points Earned" value={`${displayEarned} pts`} />
        <Stat label="Points Redeemed" value={`${redeemed} pts`} />
        <Stat label="Audit Ledger Transactions" value={isOnline && ledger.length ? ledger.length : txns.length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        {/* Reward Redemption Store */}
        <Card className="lg:col-span-7">
          <CardTitle title="Eco-Reward Redemption Store" badge={<Chip tone="sun">Verified Benefits</Chip>} />
          <div className="grid gap-3.5 sm:grid-cols-2">
            {REWARD_PRODUCTS.map((p) => {
              const affordable = displayBalance >= p.points;
              return (
                <div key={p.id} className="rounded-2xl bg-cream p-4 border border-border/40 flex flex-col justify-between">
                  <div>
                    <div className="text-3xl">{p.emoji}</div>
                    <div className="mt-2 text-base font-bold text-foreground">{p.name}</div>
                    <div className="font-mono text-xs font-semibold text-leaf mt-0.5">{p.points} reward points</div>
                  </div>
                  <PopButton
                    className="mt-4 w-full py-2.5"
                    tone={affordable ? "ink" : "outline"}
                    disabled={!affordable || !customer}
                    onClick={() => customer && redeemReward(customer.id, p.id)}
                  >
                    {affordable ? "Redeem Benefit" : `Requires ${p.points - displayBalance} more pts`}
                  </PopButton>
                </div>
              );
            })}
          </div>
          <SectionNote>
            Redemptions are settled via partnered circular economy merchants, planting programs, and partner vouchers.
          </SectionNote>
        </Card>

        {/* Audit Ledger */}
        <Card className="lg:col-span-5">
          <CardTitle
            title="Double-Entry Transaction Ledger"
            badge={<Chip tone="lime">Immutable Log</Chip>}
          />
          <div className="max-h-[460px] space-y-2.5 overflow-auto pr-1">
            {isOnline && ledger.length > 0 ? (
              ledger.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3.5 border border-border/40">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-foreground">{r.reason || "Verified Recycling Credit"}</div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {r.type} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`font-mono text-base font-extrabold ${r.points >= 0 ? "text-leaf" : "text-coral"}`}>
                    {r.points >= 0 ? "+" : ""}
                    {r.points} pts
                  </span>
                </div>
              ))
            ) : txns.length === 0 ? (
              <SectionNote>No ledger entries recorded yet. Complete a verified collection to earn points.</SectionNote>
            ) : (
              txns.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3.5 border border-border/40">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-foreground">{r.note}</div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {r.type} · {simDate(r.at)}
                    </div>
                  </div>
                  <span className={`font-mono text-base font-extrabold ${r.points >= 0 ? "text-leaf" : "text-coral"}`}>
                    {r.points >= 0 ? "+" : ""}
                    {r.points} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* Verified Green Recycling Certificates Section */}
      <Card>
        <CardTitle title="Verified Green Certificates &amp; Chain of Custody Records" badge={<Chip tone="lime">CPCB Compliant</Chip>} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-1">
          {s.certificates.map((cert) => (
            <div key={cert.id} className="rounded-2xl border-2 border-border bg-cream p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-leaf">{cert.id}</span>
                <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-bold text-leaf uppercase">
                  Verified
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Customer:</span>
                  <span className="font-semibold text-foreground">{cert.customerName}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Input Weight:</span>
                  <span className="font-mono font-bold text-foreground">{cert.inputKg} kg</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Avoided CO₂e:</span>
                  <span className="font-mono font-bold text-leaf">{cert.co2eKg} kg</span>
                </div>
              </div>
              <Link
                to="/verify/simulation/$certificateId"
                params={{ certificateId: cert.id }}
                className="block w-full rounded-xl bg-ink py-2 text-center text-xs font-bold text-ink-foreground hover:bg-ink/80 transition-colors"
              >
                Inspect Official Certificate →
              </Link>
            </div>
          ))}
          {s.certificates.length === 0 && (
            <div className="col-span-3 py-6 text-center text-sm text-muted-foreground">
              Certificates are automatically minted once an authorized recycler verifies physical delivery and gross/tare weights.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
