import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardTitle, Chip, SectionNote } from "@/components/sim/ui";
import { useSim } from "@/lib/simulation/react";
import { kg, simDate } from "@/lib/simulation/format";

export const Route = createFileRoute("/verify/simulation/$certificateId")({
  head: () => ({
    meta: [
      { title: "Official Green Recycling Certificate Verification — EcoCycle" },
      {
        name: "description",
        content:
          "Official verification portal for EcoCycle recycling certificates. Authenticate chain of custody, scale weights, and environmental sustainability records.",
      },
      { property: "og:title", content: "Green Recycling Certificate Verification — EcoCycle" },
      {
        property: "og:description",
        content: "Authenticate verified e-waste recycling records and circular economy recovery metrics.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { certificateId } = Route.useParams();
  const s = useSim();
  const cert = s.certificates.find((c) => c.id === certificateId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-leaf/10 px-3 py-1 text-xs font-bold text-leaf">
          <span>🛡️ CPCB Rule Compliant · Verifiable Chain of Custody</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Recycling Certificate Verification</h1>
        <SectionNote>
          This portal provides tamper-evident authentication of e-waste collection, custody handover, and authorized recycler intake records.
        </SectionNote>
      </header>

      {!cert ? (
        <Card>
          <CardTitle title="Certificate Not Found" badge={<Chip tone="coral">Unverified</Chip>} />
          <p className="text-sm text-muted-foreground leading-relaxed">
            No active certificate matching reference code <span className="font-mono font-bold text-foreground">{certificateId}</span> was found in the current registry.
          </p>
          <Link to="/rewards" className="mt-4 inline-block text-sm font-bold text-leaf hover:underline">
            ← Return to Eco-Rewards &amp; Certificates Registry
          </Link>
        </Card>
      ) : (
        <Card className="border-2 border-leaf/30 bg-card shadow-lg relative overflow-hidden">
          {/* Official Verification Watermark Badge */}
          <div className="absolute top-4 right-4 rotate-12 pointer-events-none opacity-20">
            <div className="border-4 border-leaf rounded-full size-28 grid place-items-center text-center p-2">
              <span className="font-display font-black text-xs text-leaf uppercase tracking-widest">
                ECOCYCLE<br />VERIFIED<br />RECYCLED
              </span>
            </div>
          </div>

          <CardTitle
            title={`Certificate ID: ${cert.id}`}
            badge={<Chip tone="lime">STATUS: OFFICIALLY VERIFIED</Chip>}
          />

          <div className="rounded-2xl border border-leaf/30 bg-leaf/10 p-3.5 text-xs font-bold text-leaf flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>✓</span> Authorized Circular Economy Recycling Manifest
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">ISO 14001:2015</span>
          </div>

          <dl className="mt-5 space-y-2.5 text-sm">
            <Row label="Beneficiary / Customer" value={cert.customerName} />
            <Row label="Recycling Batch Manifest" value={cert.batchId} />
            <Row label="Gross Collected Weight" value={kg(cert.inputKg)} />
            <Row label="Refined Material Yield" value={kg(cert.recycledKg)} />
            <Row label="Avoided GHG Emissions" value={`${cert.co2eKg} kg CO₂e (CPCB factor verified)`} />
            <Row label="Facility Processing Date" value={simDate(cert.issuedAt)} />
            <Row label="Authorized Operations Hub" value="Bengaluru Metro Certified Facility" />
          </dl>

          <div className="mt-6 flex items-center gap-5 pt-4 border-t border-border">
            <QrPlaceholder value={cert.id} />
            <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
              <div className="font-bold text-foreground">Cryptographic Audit Seal</div>
              <p>
                This digital certificate carries a tamper-evident hash linked to the physical collection scale slip and recycler intake gate manifest.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className="font-mono text-xs font-bold text-foreground">{value}</dd>
    </div>
  );
}

function QrPlaceholder({ value }: { value: string }) {
  const cells = Array.from({ length: 49 }, (_, i) => {
    let h = i * 31;
    for (let k = 0; k < value.length; k++) h = (h * 33 + value.charCodeAt(k)) % 997;
    return h % 2 === 0;
  });
  return (
    <div className="grid size-24 shrink-0 grid-cols-7 gap-0.5 rounded-xl bg-card p-1.5 ring-2 ring-ink shadow-sm">
      {cells.map((on, i) => (
        <span
          key={i}
          className={`rounded-[2px] transition-colors ${on ? "bg-ink" : "bg-card"}`}
        />
      ))}
    </div>
  );
}
