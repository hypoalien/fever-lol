import { cn } from "@/lib/utils";

/**
 * Skeletons shaped like the thing they stand in for.
 *
 * A spinner tells you to wait; a skeleton tells you what is coming and holds
 * the layout so nothing jumps when the data lands. These deliberately mirror
 * the real components' dimensions — same row height, same column count, same
 * card proportions — because a skeleton that reflows on load is worse than
 * none at all.
 */

function Shimmer({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "animate-pulse rounded-md bg-muted",
        // Slower than the default: a fast pulse behind a whole page reads as
        // flickering rather than loading.
        "[animation-duration:1.6s]",
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3.5 w-24" />
        <Shimmer className="size-4 rounded" />
      </div>
      <Shimmer className="mt-4 h-8 w-32" />
      <Shimmer className="mt-3 h-3 w-20" />
      <Shimmer className="mt-4 h-8 w-full opacity-60" />
    </div>
  );
}

export function StatGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  // Fixed pseudo-random heights: Math.random() here would differ between
  // server and client and trip hydration.
  const heights = [38, 62, 45, 78, 55, 88, 40, 70, 52, 84, 60, 46];

  return (
    <div className="rounded-lg border bg-card p-5">
      <Shimmer className="h-4 w-28" />
      <div className="mt-8 flex h-[240px] items-end gap-2">
        {heights.map((height, i) => (
          <Shimmer
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b px-4 py-4 last:border-b-0"
          // Staggered so the rows resolve as a sweep rather than one block
          // pulsing in unison.
          style={{ animationDelay: `${row * 60}ms` }}
        >
          {Array.from({ length: columns }, (_, col) => (
            <Shimmer
              key={col}
              className={cn("h-3.5 flex-1", col === 0 && "max-w-[7rem]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="rounded-lg border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
          <Shimmer className="mt-3 h-3 w-40" />
          <Shimmer className="mt-5 h-3 w-32" />
          <Shimmer className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Shimmer className="h-3.5 w-24" />
          <Shimmer className="h-10 w-full" />
        </div>
      ))}
      <Shimmer className="h-10 w-32" />
    </div>
  );
}
