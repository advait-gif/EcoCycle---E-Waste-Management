import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("ec-card p-6", className)}>{children}</div>;
}

export function CardTitle({ title, badge }: { title: string; badge?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="font-display text-lg font-bold">{title}</div>
      {badge}
    </div>
  );
}

export function Chip({
  children,
  tone = "cream",
}: {
  children: ReactNode;
  tone?: "cream" | "lime" | "sky" | "coral" | "sun" | "ink";
}) {
  const tones: Record<string, string> = {
    cream: "bg-cream text-ink",
    lime: "bg-lime/40 text-ink",
    sky: "bg-sky/20 text-sky-foreground",
    coral: "bg-coral/15 text-coral",
    sun: "bg-sun/30 text-ink",
    ink: "bg-ink text-ink-foreground",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function PopButton({
  children,
  onClick,
  tone = "ink",
  className,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "ink" | "coral" | "lime" | "outline";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const tones: Record<string, string> = {
    ink: "bg-ink text-ink-foreground shadow-pop-ink",
    coral: "bg-coral text-coral-foreground shadow-pop-coral",
    lime: "bg-lime text-lime-foreground",
    outline: "bg-card text-ink border-2 border-input",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-display rounded-2xl px-5 py-3 text-sm font-bold transition-transform active:translate-y-0.5 disabled:opacity-40 disabled:shadow-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: string | undefined;
  tone?: string | undefined;
}) {
  return (
    <div className="ec-card p-5">
      <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className={cn("font-display mt-1 text-3xl font-bold", tone)}>{value}</div>
      {sub ? <div className="mt-1 text-xs font-medium text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function SectionNote({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-muted-foreground">{children}</p>;
}
