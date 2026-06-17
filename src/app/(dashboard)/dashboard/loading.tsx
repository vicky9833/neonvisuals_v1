function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-secondary ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Block className="h-7 w-64" />
        <Block className="h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-32" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Block key={i} className="h-40" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Block className="h-64 lg:col-span-1" />
        <Block className="h-64 lg:col-span-2" />
      </div>

      <Block className="h-72" />
    </div>
  );
}
