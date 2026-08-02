"use client";

import { useState } from "react";
import { Search, TicketPercent } from "lucide-react";

import {
  EmptyState,
  LoadError,
  PageHeader,
  PageShell,
} from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { CardGridSkeleton } from "@/components/ui/skeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDiscounts, type PromoCodeSummary } from "@/lib/query/hooks";

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minor / 100
  );
}

/** "20% off" or "$5 off", depending on how the code was configured. */
function describe(promo: PromoCodeSummary): string {
  return promo.discountType === "percent"
    ? `${promo.discountValue}% off`
    : `${money(promo.discountValue, promo.currency)} off`;
}

function isExpired(promo: PromoCodeSummary): boolean {
  return promo.expiresAt !== null && new Date(promo.expiresAt) < new Date();
}

function isExhausted(promo: PromoCodeSummary): boolean {
  return (
    promo.maxRedemptions !== null &&
    promo.timesRedeemed >= promo.maxRedemptions
  );
}

export default function DiscountsPage() {
  const { data, isPending, isError, refetch } = useDiscounts();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const promoCodes = data ?? [];
  const visible = promoCodes.filter((promo) => {
    const live = promo.active && !isExpired(promo) && !isExhausted(promo);
    const matchesTab = tab === "all" || (tab === "active" ? live : !live);

    const haystack = [promo.code, promo.eventName ?? ""]
      .join(" ")
      .toLowerCase();
    return matchesTab && haystack.includes(query.toLowerCase());
  });

  return (
    <PageShell>
      <PageHeader
        title="Discounts"
        description="Promo codes across all your events. Add or edit them on the event itself."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or event"
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {isError ? (
        <LoadError
          title="Could not load your promo codes"
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <CardGridSkeleton cards={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<TicketPercent className="size-5" />}
          title={
            promoCodes.length === 0
              ? "No promo codes yet"
              : "Nothing matches that"
          }
          description={
            promoCodes.length === 0
              ? "Open an event and add a code under its discounts section."
              : "Try a different search, or switch tabs."
          }
        />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((promo) => {
            const expired = isExpired(promo);
            const exhausted = isExhausted(promo);
            const live = promo.active && !expired && !exhausted;

            return (
              <StaggerItem key={promo.id}>
                <Card className="h-full transition-colors hover:border-foreground/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="font-mono text-base">
                        {promo.code}
                      </CardTitle>
                      <Badge variant={live ? "default" : "secondary"}>
                        {expired
                          ? "Expired"
                          : exhausted
                            ? "Fully redeemed"
                            : promo.active
                              ? "Active"
                              : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {describe(promo)}
                      {promo.minOrderMinor > 0 &&
                        ` \u00b7 min ${money(promo.minOrderMinor, promo.currency)}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>{promo.eventName ?? "Untitled event"}</p>
                    <p>
                      Redeemed {promo.timesRedeemed}
                      {promo.maxRedemptions !== null &&
                        ` of ${promo.maxRedemptions}`}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </PageShell>
  );
}
