"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { CountUp } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * A single figure with its recent shape.
 *
 * The old cards stated a number and a percentage and stopped, which tells an
 * organizer almost nothing — a figure with no trajectory cannot be acted on.
 * Each card now carries the series behind it as a sparkline, so the number has
 * a direction as well as a value.
 *
 * The sparkline is deliberately unlabelled and unaxised. It is there to show
 * shape; the precise figures live in the chart below and in the tables.
 */

interface StatCardProps {
  label: string;
  value: number;
  format: (value: number) => string;
  /** Percentage change against the comparable previous period. */
  change: number;
  changeLabel: string;
  series: number[];
  icon: ReactNode;
  /** True when the organizer has no data at all, not merely a value of zero. */
  empty?: boolean;
  /** Shown instead of a delta when there is nothing to compare against. */
  emptyLabel?: string;
}

/** Points for a sparkline path, normalised into a 100x28 box. */
function sparklinePath(series: number[]): string {
  if (series.length < 2) return "";

  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = max - min || 1;

  return series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * 100;
      // Inset vertically so the stroke is not clipped at the extremes.
      const y = 26 - ((value - min) / range) * 24;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function StatCard({
  label,
  value,
  format,
  change,
  changeLabel,
  series,
  icon,
  empty = false,
  emptyLabel = "Nothing sold yet",
}: StatCardProps) {
  const rising = change > 0;
  const flat = change === 0;
  const path = sparklinePath(series);

  const Arrow = flat ? Minus : rising ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="text-muted-foreground/70">{icon}</span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
        <CountUp value={value} format={format} />
      </p>

      {empty ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs font-medium",
            flat && "text-muted-foreground",
            !flat && rising && "text-success",
            !flat && !rising && "text-destructive"
          )}
        >
          <Arrow className="size-3.5" aria-hidden="true" />
          <span className="tabular-nums">
            {flat ? "No change" : `${Math.abs(change).toFixed(1)}%`}
          </span>
          <span className="font-normal text-muted-foreground">
            {changeLabel}
          </span>
        </p>
      )}

      {path && !empty && (
        <svg
          viewBox="0 0 100 28"
          preserveAspectRatio="none"
          className="mt-4 h-8 w-full"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={cn(
              "text-muted-foreground/40 transition-colors",
              "group-hover:text-foreground/50"
            )}
          />
        </svg>
      )}
      {(!path || empty) && <div className="mt-4 h-8" />}
    </div>
  );
}
