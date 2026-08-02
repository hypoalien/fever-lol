"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Search, TicketPercent } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PromoCode {
  id: string;
  code: string;
  eventId: string;
  eventName: string | null;
  discountType: "flat" | "percent";
  discountValue: number;
  minOrderMinor: number;
  timesRedeemed: number;
  maxRedemptions: number | null;
  active: boolean;
  expiresAt: string | null;
  currency: string;
}

function money(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minor / 100
  );
}

/** "20% off" or "$5 off", depending on how the code was configured. */
function describe(promo: PromoCode): string {
  return promo.discountType === "percent"
    ? `${promo.discountValue}% off`
    : `${money(promo.discountValue, promo.currency)} off`;
}

function isExpired(promo: PromoCode): boolean {
  return promo.expiresAt !== null && new Date(promo.expiresAt) < new Date();
}

function isExhausted(promo: PromoCode): boolean {
  return (
    promo.maxRedemptions !== null &&
    promo.timesRedeemed >= promo.maxRedemptions
  );
}

export default function DiscountsPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    axios
      .get<{ promoCodes: PromoCode[] }>("/api/discounts")
      .then((response) => {
        if (!cancelled) setPromoCodes(response.data.promoCodes);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error("Error fetching promo codes:", requestError);
        setError("Could not load your promo codes.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = promoCodes.filter((promo) => {
    const live = promo.active && !isExpired(promo) && !isExhausted(promo);
    const matchesTab =
      tab === "all" || (tab === "active" ? live : !live);

    const haystack = [promo.code, promo.eventName ?? ""]
      .join(" ")
      .toLowerCase();
    return matchesTab && haystack.includes(query.toLowerCase());
  });

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Discounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Promo codes across all your events. Add or edit them on the event
            itself.
          </p>
        </div>

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

        {error ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {error}
          </p>
        ) : isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : visible.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <TicketPercent className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">
              {promoCodes.length === 0
                ? "No promo codes yet"
                : "Nothing matches that"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {promoCodes.length === 0
                ? "Open an event and add a code under its discounts section."
                : "Try a different search or tab."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((promo) => {
              const expired = isExpired(promo);
              const exhausted = isExhausted(promo);
              const live = promo.active && !expired && !exhausted;

              return (
                <Card key={promo.id}>
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
                        ` · min ${money(promo.minOrderMinor, promo.currency)}`}
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
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
