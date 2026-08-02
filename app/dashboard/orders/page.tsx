"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";

import { CardContent } from "@/components/ui/card";
import { OrdersResponseSchema, type Order } from "@/models/orders";
import { DataTable } from "./table/components/data-table";
import { columns } from "./table/components/columns";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    axios
      .post("/api/orders", eventId ? { eventId } : {})
      .then((response) => {
        if (cancelled) return;
        const parsed = OrdersResponseSchema.safeParse(response.data);
        if (!parsed.success) {
          console.error("Unexpected orders payload", parsed.error.issues);
          setError("Could not read the order list.");
          return;
        }
        setOrders(parsed.data.orders);
        setError(null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error("Error fetching orders:", requestError);
        setError("Could not load orders.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto p-4">
        <CardContent className="p-0">
          {error ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : (
            <DataTable data={orders} columns={columns} isLoading={isLoading} />
          )}
        </CardContent>
      </div>
    </main>
  );
}
