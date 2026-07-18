import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  children: ReactNode;
  accent?: "ember" | "mana" | "quest" | "night";
  className?: string;
};

const accentClasses = {
  ember: "border-t-ember",
  mana: "border-t-mana",
  quest: "border-t-quest",
  night: "border-t-night"
};

export function DashboardCard({
  title,
  children,
  accent = "night",
  className = ""
}: DashboardCardProps) {
  return (
    <section
      className={`rounded-lg border border-slate-200 border-t-4 ${accentClasses[accent]} bg-white/88 p-5 shadow-panel backdrop-blur ${className}`}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
