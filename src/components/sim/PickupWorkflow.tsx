import { PICKUP_FLOW, statusIndex } from "@/lib/simulation/engine";
import type { Pickup } from "@/lib/simulation/types";
import { Chip } from "./ui";

const LABELS: Record<string, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  AGENT_ACCEPTED: "Accepted",
  ON_THE_WAY: "On the way",
  ARRIVED: "Arrived",
  COLLECTED: "Collected",
  VERIFIED: "Verified",
  COMPLETED: "Completed",
};

export function PickupWorkflow({ pickup }: { pickup: Pickup }) {
  const current = statusIndex(pickup.status);
  const done = pickup.status === "COMPLETED";
  const stopped = pickup.status === "CANCELLED" || pickup.status === "FAILED";

  return (
    <div>
      <div className="flex flex-wrap items-start gap-y-4">
        {PICKUP_FLOW.map((step, i) => {
          const passed = i < current || done;
          const active = i === current && !done && !stopped;
          return (
            <div key={step} className="flex items-start">
              {i > 0 ? <div className={`mt-4 h-0.5 w-8 ${passed ? "bg-leaf" : "bg-border"}`} /> : null}
              <div className="flex w-[74px] flex-col items-center">
                <div
                  className={`grid size-9 place-items-center rounded-full text-xs font-bold ${
                    passed
                      ? "bg-leaf text-leaf-foreground"
                      : active
                        ? "animate-pulse bg-sun text-sun-foreground"
                        : "border-2 border-input bg-cream text-muted-foreground"
                  }`}
                >
                  {passed ? "✓" : active ? "●" : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-center text-[11px] font-semibold ${
                    passed || active ? "" : "text-muted-foreground"
                  }`}
                >
                  {LABELS[step]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {stopped ? (
        <div className="mt-4">
          <Chip tone="coral">Status: {pickup.status}</Chip>
        </div>
      ) : null}
    </div>
  );
}
