"use client";

import { Row } from "@tanstack/react-table";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Mail,
  MoreVertical,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loading } from "./loading";
import { OrderSchema } from "@/models/orders";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const orderDetails = OrderSchema.parse(row.original);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const handleVeiwDetails = async () => {
    setIsLoading(true);

    if (orderDetails) {
      setIsLoading(false);
    }
    setSheetOpen(true);
  };
  const money = (minor: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: orderDetails?.currency ?? "USD",
    }).format(minor / 100);

  function formatEventDateTime(instant: string | null): string {
    if (!instant) return "Date to be announced";
    const eventDateTime = new Date(instant);

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    return `${dateFormatter.format(eventDateTime)} - ${timeFormatter.format(
      eventDateTime
    )}`;
  }

  const sendTicketToCustomerEmail = () => {};
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onSelect={() => handleVeiwDetails()}>
            View details
          </DropdownMenuItem>
          <DropdownMenuItem>View event</DropdownMenuItem>

          <DropdownMenuItem>Edit event</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full p-0 overflow-scroll">
          {isLoading ? (
            <Loading />
          ) : orderDetails ? (
            <div x-chunk="dashboard-05-chunk-4">
              <CardHeader className="flex flex-row items-start bg-muted/50">
                <div className="grid gap-0.5">
                  <CardTitle className="group flex items-center gap-2 text-lg">
                    Order {orderDetails.orderNumber}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Copy className="h-3 w-3" />
                      <span className="sr-only">Copy Order ID</span>
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Date:{" "}
                    {formatEventDateTime(orderDetails.event.startsAt)}
                  </CardDescription>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={() => sendTicketToCustomerEmail()}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
                      Email Ticket
                    </span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="h-8 w-8">
                        <MoreVertical className="h-3.5 w-3.5" />
                        <span className="sr-only">More</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View ticket</DropdownMenuItem>
                      <DropdownMenuItem>Export</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Trash</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-sm">
                <div className="grid gap-3">
                  <div className="font-semibold">Order Details</div>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant="secondary">
                          {orderDetails.orderStatus}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Event</span>
                      <span>{orderDetails.event.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>
                        {formatEventDateTime(orderDetails.event.startsAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Venue:</span>
                      <span>{orderDetails.event.venue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="text-end">
                        {orderDetails.event.address}
                      </span>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="font-semibold">Ticket Information</div>
                  <ul className="grid gap-3">
                    {orderDetails.items.map((ticket, index) => (
                      <li
                        className="flex items-center justify-between"
                        key={index}
                      >
                        <span className="text-muted-foreground">
                          {ticket.type} x <span>{ticket.quantity}</span>
                        </span>
                        <span>{money(ticket.lineTotalMinor)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-center mt-4">
                    <QRCodeSVG
                      value={orderDetails.orderNumber}
                      size={150}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <Separator className="my-2" />
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{money(orderDetails.subtotalMinor)}</span>
                    </div>
                    {orderDetails.gatewayFeeMinor > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Payment Gateway fees
                        </span>
                        <span>{money(orderDetails.gatewayFeeMinor)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Payment Gateway fees
                        </span>
                        <dd>
                          <Badge variant="secondary">Paid by host</Badge>
                        </dd>{" "}
                      </div>
                    )}
                    {orderDetails.platformFeeMinor > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Platform fees
                        </span>
                        <span>{money(orderDetails.platformFeeMinor)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Platform fees
                        </span>
                        <dd>
                          <Badge variant="secondary">Paid by host</Badge>
                        </dd>{" "}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Discounts</span>
                      <span>{money(orderDetails.discountMinor)}</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-muted-foreground">Total</span>
                      <span>{money(orderDetails.totalMinor)}</span>
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-3">
                  <div className="font-semibold">Customer Information</div>
                  <dl className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Customer</dt>
                      <dd>{orderDetails.customerName}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd>
                        <a href={`mailto:${orderDetails.customerEmail}`}>
                          {orderDetails.customerEmail}
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-3">
                  <div className="font-semibold">Payment Information</div>
                  <dl className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Transaction ID</dt>
                      <dd>{orderDetails.orderNumber}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant="secondary">
                          {orderDetails.paymentStatus}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-3">
                  <div className="font-semibold">Payout Information</div>
                  <dl className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant="secondary">
                          {orderDetails.payoutStatus}
                        </Badge>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Net of discount</dt>
                      <dd>
                        {money(
                          orderDetails.subtotalMinor - orderDetails.discountMinor
                        )}
                      </dd>
                    </div>
                    {/* Whichever fees the organizer bears are the difference
                        between the net and the payout, so it is derived rather
                        than re-deciding the bearer here. */}
                    {(() => {
                      const net =
                        orderDetails.subtotalMinor - orderDetails.discountMinor;
                      const borne = net - orderDetails.payoutMinor;
                      return borne > 0 ? (
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">
                            Fees you absorbed
                          </dt>
                          <dd>-{money(borne)}</dd>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Fees</dt>
                          <dd>
                            <Badge variant="secondary">Paid by buyer</Badge>
                          </dd>
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-between font-semibold">
                      <dt className="text-muted-foreground">Payout amount</dt>
                      <dd>{money(orderDetails.payoutMinor)}</dd>
                    </div>
                  </dl>
                </div>

                <Separator className="my-4" />
                <div className="grid gap-3">
                  <div className="font-semibold">Ticket Delivery</div>
                  <dl className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Method</dt>
                      <dd>Email</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant="secondary">Delivered</Badge>
                      </dd>
                    </div>
                  </dl>
                </div>
              </CardContent>
              <CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
                <div className="text-xs text-muted-foreground">
                  Updated{" "}
                  <time dateTime="2024-12-18">
                    {new Date(orderDetails.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <Pagination className="ml-auto mr-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <Button size="icon" variant="outline" className="h-6 w-6">
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span className="sr-only">Previous Order</span>
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <Button size="icon" variant="outline" className="h-6 w-6">
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="sr-only">Next Order</span>
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardFooter>
            </div>
          ) : (
            <Loading />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
