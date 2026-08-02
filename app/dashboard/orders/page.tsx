"use client";
import { useEffect } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { OrderSchema } from "@/models/orders";
import { OrderType } from "@/models/orders";
import axios from "axios";
import { CardContent } from "@/components/ui/card";
import { DataTable } from "./table/components/data-table";
import { columns } from "./table/components/columns";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderType[]>([]);
  useEffect(() => {
    axios
      .post(`/api/orders`, { eventId })
      .then((response) => {
        const allOrders = response.data?.orders;
        const transformedOrders = (allOrders ?? []).map(
          (order: Record<string, unknown>) => ({
            ...order,
            ticketDetails: (
              (order.ticketDetails as Array<Record<string, unknown>>) ?? []
            ).map((ticket) => ({
              ...ticket,
              price: Number(ticket.price),
            })),
          })
        );
        const cleanedOrder = z.array(OrderSchema).parse(transformedOrders);
        setOrders(cleanedOrder);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching event details:", error);
        setIsLoading(false);
      });
  }, [eventId]);
  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto p-4">
        <CardContent className="p-0">
          <DataTable data={orders} columns={columns} isLoading={isLoading} />
        </CardContent>
      </div>
    </main>
  );
}
