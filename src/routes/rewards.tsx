import { createFileRoute } from "@tanstack/react-router";
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
  type ApiWallet,
  type ApiLedgerEntry,
} from "@/lib/api";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — EcoCycle" },
      {
        name: "description",
        content:
          "Reward points, double-entry wallet balance and verified recycling transactions.",
      },
      { property: "og:title", content: "Rewards — EcoCycle" },
      { property: "og:description", content: "Earn verified EcoCycle reward points for responsible e-waste recycling." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const s = useSim();
  const { isOnline } = useBackend();
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [ledger, setLedger] = useState<ApiLedgerEntry[]>([]);

  const customer = s.customers.find((c) => c.id === s.currentCustomerId) ?? s.customers[0];
  const txns = customer ? s.rewards.filter((r) => r.customerId === customer.id) : [];
  const earned = txns.filter((r) => r.type === "EARN").reduce((t, r) => t + r.points, 0);
  const redeemed = txns.filter((r) => r.type === "REDEEM").reduce((t, r) => t + Math.abs(r.points), 0);

  useEffect(() => {
    if (isOnline) {
      getRewardsWallet().then(setWallet).catch(console.warn);
      getRewardsLedger().then(setLedger).catch(console.warn);
    }
  }, [isOnline]);

  const displayBalance = isOnline && wallet ? wallet.balance : (customer?.points ?? 0);
  const displayEarned = isOnline && wallet ? wallet.lifetime_earned : earned;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-bold">Customer Rewards</h1>
        <SectionNote>
          {isOnline
            ? "⚡ Live Wallet Sync: Points are credited only upon verified recycler confirmation (PRD §5.6)."
            : `1 simulated kg = ${s.settings.pointsPerKg} simulated points. Redemptions are simulated.`}
        </SectionNote>
      </header>

      <Card>
        <CardTitle
          title="Active Customer Profile"
          badge={<Chip tone={isOnline ? "lime" : "cream"}>{isOnline ? "Live Customer Session" : "Demo Data"}</Chip>}
        />
        <div className="flex flex-wrap gap-2">
          {s.customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCurrentCustomer(c.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                c.id === customer?.id ? "bg-ink text-ink-foreground" : "bg-cream text-ink"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Wallet Balance" value={displayBalance} tone="text-leaf" />
        <Stat label="Lifetime Points Earned" value={displayEarned} />
        <Stat label="Points Redeemed" value={redeemed} />
        <Stat label="Ledger Transactions" value={isOnline && ledger.length ? ledger.length : txns.length} />
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardTitle title="Reward Store" badge={<Chip tone="sun">Eco Rewards</Chip>} />
          <div className="grid gap-3 sm:grid-cols-2">
            {REWARD_PRODUCTS.map((p) => {
              const affordable = displayBalance >= p.points;
              return (
                <div key={p.id} className="rounded-2xl bg-cream p-4">
                  <div className="text-2xl">{p.emoji}</div>
                  <div className="mt-1 text-sm font-bold">{p.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{p.points} points</div>
                  <PopButton
                    className="mt-3 w-full"
                    tone={affordable ? "ink" : "outline"}
                    disabled={!affordable || !customer}
                    onClick={() => customer && redeemReward(customer.id, p.id)}
                  >
                    Redeem Reward
                  </PopButton>
                </div>
              );
            })}
          </div>
          <SectionNote>Redeemed directly from your verified double-entry rewards balance.</SectionNote>
        </Card>

        <Card className="lg:col-span-5">
          <CardTitle
            title="Rewards Ledger"
            badge={<Chip tone={isOnline ? "lime" : "cream"}>{isOnline ? "FastAPI Ledger" : "Simulated"}</Chip>}
          />
          <div className="max-h-[420px] space-y-2 overflow-auto">
            {isOnline && ledger.length > 0 ? (
              ledger.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{r.reason || "Reward points transaction"}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {r.type} · {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-bold ${r.points >= 0 ? "text-leaf" : "text-coral"}`}>
                    {r.points >= 0 ? "+" : ""}
                    {r.points} pts
                  </span>
                </div>
              ))
            ) : txns.length === 0 ? (
              <SectionNote>No transactions yet.</SectionNote>
            ) : (
              txns.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{r.note}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {r.id} · {simDate(r.at)}
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-bold ${r.points >= 0 ? "text-leaf" : "text-coral"}`}>
                    {r.points >= 0 ? "+" : ""}
                    {r.points}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
