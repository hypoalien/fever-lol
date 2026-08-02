"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Monthly revenue.
 *
 * One series, so no legend — the heading names it. The previous version had no
 * grid, no tooltip worth reading, and repeated the currency symbol on every
 * y-tick; the axis is a scale, not a place to restate units, so the symbol
 * appears once in the heading and the tooltip carries the exact figure.
 *
 * The current month is drawn in the accent so "where we are now" is legible at
 * a glance without needing a second colour dimension.
 */

interface RevenueChartProps {
  data: Array<{ name: string; totalMinor: number }>;
  currency: string;
}

function compact(minor: number, currency: string): string {
  const major = minor / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: major >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: major >= 10_000 ? 1 : 0,
  }).format(major);
}

function exact(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

export function RevenueChart({ data, currency }: RevenueChartProps) {
  const hasAnything = data.some((point) => point.totalMinor > 0);
  const lastIndex = data.length - 1;

  if (!hasAnything) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium">No revenue yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Once an event starts selling, twelve months of takings appear here.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
        {/* Horizontal only: vertical lines on a categorical axis add ink
            without adding information. */}
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="hsl(var(--border))"
        />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={8}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => compact(value, currency)}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const value = Number(payload[0].value ?? 0);
            return (
              <div className="rounded-md border bg-popover px-3 py-2 shadow-md">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  {exact(value, currency)}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="totalMinor" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((_, index) => (
            <Cell
              key={index}
              // One series, so one hue — the categorical palette is for
              // charts that carry identity. The current month picks up the
              // accent so "where we are now" reads without a second encoding.
              fill={
                index === lastIndex
                  ? "hsl(var(--secondary))"
                  : "hsl(var(--foreground))"
              }
              fillOpacity={index === lastIndex ? 1 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
