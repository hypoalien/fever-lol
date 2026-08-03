"use client";

import { CalendarDays, CreditCard, TicketCheck, Wallet } from "lucide-react";

import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { ChartSkeleton, StatGridSkeleton } from "@/components/ui/skeletons";
import { useDashboardStats } from "@/lib/query/hooks";

/**
 * The overview.
 *
 * Reads through the shared cache, so arriving here from anywhere else in the
 * dashboard paints from what is already held and revalidates behind the paint.
 * It used to fetch on mount every time and show a spinner while it did.
 */
export default function DashboardPage() {
  const { data, isPending, isError, refetch } = useDashboardStats();

  if (isError) {
    return (
      <div className="grid min-h-[40vh] place-items-center p-6 text-center">
        <div>
          <p className="font-medium">Could not load your dashboard</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The figures could not be fetched.
          </p>
          <button
            onClick={() => void refetch()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-6">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <StatGridSkeleton />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <ChartSkeleton />
          <div className="rounded-lg border bg-card p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const { currency } = data;
  const money = (minor: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);

  const monthly = data.overview.map((point) => point.totalMinor);
  const noSales = monthly.every((value) => value === 0);

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything across your events, last twelve months.
          </p>
        </div>
      </FadeIn>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Revenue this month"
            value={data.totalRevenue.amountMinor}
            format={money}
            change={data.totalRevenue.percentageChange}
            changeLabel="vs last month"
            series={monthly}
            empty={noSales}
            icon={<Wallet className="size-4" />}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Sales today"
            value={data.salesToday.amountMinor}
            format={money}
            change={data.salesToday.percentageChange}
            changeLabel="vs yesterday"
            // No daily series is returned, so this card carries no sparkline
            // rather than plotting monthly totals under a daily figure.
            series={[]}
            empty={noSales}
            icon={<CreditCard className="size-4" />}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Tickets sold"
            value={data.ticketsSold.count}
            format={(value) => value.toLocaleString()}
            change={data.ticketsSold.percentageChange}
            changeLabel="vs last month"
            series={monthly}
            empty={noSales}
            icon={<TicketCheck className="size-4" />}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Events on sale"
            value={data.activeEvents.count}
            format={(value) => value.toLocaleString()}
            change={0}
            changeLabel=""
            series={[]}
            empty
            emptyLabel={
              data.activeEvents.count === 1 ? "1 event live" : "Currently live"
            }
            icon={<CalendarDays className="size-4" />}
          />
        </StaggerItem>
      </Stagger>

      <FadeIn delay={0.08}>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-lg border bg-card p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Revenue</h2>
              {/* Units stated once, so the axis does not repeat the symbol
                  on every tick. */}
              <span className="text-xs text-muted-foreground">in {currency}</span>
            </div>
            <RevenueChart data={data.overview} currency={currency} />
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold">Recent sales</h2>
            {data.recentSales.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Orders show up here as they come in.
              </p>
            ) : (
              <Stagger className="mt-4 space-y-4">
                {data.recentSales.map((sale) => (
                  <StaggerItem key={sale.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {sale.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sale.email}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums">
                        {money(sale.amountMinor)}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
