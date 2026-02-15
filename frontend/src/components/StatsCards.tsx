type StatItem = {
  value: string;
  label: string;
};

const defaultStats: StatItem[] = [
  { value: "+5 anos", label: "De Experiência no Mercado" },
  { value: "+8 milhões", label: "De produtos logísticos entregues" },
  { value: "+400 unidades", label: "Distribuídas em todo Brasil" },
];

export function StatsCards({
  stats = defaultStats,
  className = "",
}: {
  stats?: StatItem[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${className}`}>
      {stats.map((item) => (
        <div
          key={item.value}
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center shadow-sm backdrop-blur"
        >
          <div className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {item.value}
          </div>
          <div className="mt-1 text-sm font-medium text-white/80 sm:text-base">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

