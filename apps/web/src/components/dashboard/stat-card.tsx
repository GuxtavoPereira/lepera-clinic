import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

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
      className={`flex h-full min-h-32 items-start gap-3 rounded-2xl border border-border border-l-4 bg-card p-4 text-card-foreground shadow-sm transition sm:gap-4 sm:p-5 ${href ? "group-hover:bg-accent/50 group-hover:shadow" : ""} ${tone === "warning" ? "border-l-amber-500" : "border-l-primary/60"}`}
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone === "warning" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary"}`}
      >
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {href ? (
        <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      ) : null}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
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
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}
