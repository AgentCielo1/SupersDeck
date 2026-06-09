import clsx from "clsx";

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "ok" | "brand";
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-ink-200 text-ink-900",
  warn: "border-warn-600/30 text-warn-800",
  danger: "border-danger-600/40 text-danger-800",
  ok: "border-ok-600/30 text-ok-800",
  brand: "border-brand-400/40 text-brand-800",
};

export default function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl2 border bg-white p-4",
        toneStyles[tone]
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}
