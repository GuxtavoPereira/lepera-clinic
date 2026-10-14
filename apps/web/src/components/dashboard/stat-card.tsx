import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "warning";
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
}: Props) {
  const content = (
    <div
      className={`flex h-full items-start gap-4 rounded-2xl border bg-white p-5 shadow-sm transition ${
        href ? "hover:border-teal-300 hover:shadow" : ""
      } ${tone === "warning" ? "border-amber-200" : "border-slate-200"}`}
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          tone === "warning"
            ? "bg-amber-50 text-amber-700"
            : "bg-teal-50 text-teal-700"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export function DashboardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </header>
  );
}
