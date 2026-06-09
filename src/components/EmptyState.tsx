import type { ReactNode } from "react";

export default function EmptyState({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: ReactNode;
}) {
  return (
    <div className="rounded-xl2 border border-dashed border-ink-200 bg-white p-8 text-center">
      <div className="text-base font-semibold text-ink-900">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">{message}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
