"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2, X, CheckCircle2, XCircle } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

interface TicketScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Validation {
  isValid: boolean;
  validatedAt: string;
  message: string;
}

interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  ticketType: string;
  price: string;
  customerName: string;
  status: string;
  qrCode: string;
  validation: Validation;
}

export function TicketScanner({ isOpen, onClose }: TicketScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (detectedCodes: { rawValue: string }[]) => {
    if (!detectedCodes.length || loading) return;

    const orderId = detectedCodes[0].rawValue;
    setScanning(false);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/tickets/validate/${orderId}`);
      setTickets(response.data.tickets);
    } catch (error) {
      console.error("Validation failed:", error);
      setError("Failed to validate ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setTickets(null);
    setError(null);
    setScanning(true);
  };

  const handleClose = () => {
    setTickets(null);
    setError(null);
    setScanning(false);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Drawer open={isOpen} onClose={handleClose}>
      <DrawerContent className="h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-2xl font-bold">
                Ticket Scanner
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                Scan QR codes to validate event tickets
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-xl mx-auto p-6">
            {/* Initial Scan State */}
            {!scanning && !tickets && !loading && !error && (
              <div className="flex flex-col items-center justify-center space-y-6 py-12">
                <div className="p-6 bg-muted rounded-full">
                  <QrCode className="h-20 w-20 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Ready to Scan</h3>
                  <p className="text-muted-foreground">
                    Position the QR code within the scanner frame
                  </p>
                </div>
                <Button
                  onClick={() => setScanning(true)}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
              </div>
            )}

            {/* Scanner State */}
            {scanning && (
              <div className="space-y-4">
                <div className="w-fit h-fit">
                  <Scanner
                    onScan={handleScan}
                    // The library reports IScannerError, not Error.
                    onError={(scannerError) =>
                      setError(
                        scannerError instanceof Error
                          ? scannerError.message
                          : "Could not access the camera"
                      )
                    }
                    components={{
                      torch: true,
                      tracker: () => {},
                    }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Align the QR code within the frame to scan
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="bg-primary/10 p-6 rounded-full">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold">Validating Tickets</h3>
                  <p className="text-sm text-muted-foreground">
                    Please wait...
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-destructive/10 rounded-lg p-6 text-center space-y-4">
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <div>
                  <h3 className="font-semibold text-destructive">
                    Validation Failed
                  </h3>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            )}

            {/* Tickets Display */}
            {tickets && (
              <div className="space-y-6">
                <h3 className="font-semibold text-lg">Validation Results</h3>
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={cn(
                        "rounded-lg border p-4 transition-colors text-black",
                        ticket.validation.isValid
                          ? "bg-success/10 border-success/30  "
                          : "bg-destructive/10 border-destructive/30  "
                      )}
                    >
                      <div className="space-y-4">
                        {/* Status Header */}
                        <div className="flex items-center space-x-3">
                          {ticket.validation.isValid ? (
                            <CheckCircle2 className="h-6 w-6 text-success dark:text-success" />
                          ) : (
                            <XCircle className="h-6 w-6 text-destructive dark:text-destructive" />
                          )}
                          <h4 className="font-semibold">
                            {ticket.validation.message}
                          </h4>
                        </div>

                        {/* Ticket Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <p className="text-muted-foreground">Ticket Type</p>
                            <p className="font-medium">{ticket.ticketType}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-muted-foreground">Status</p>
                            <p className="font-medium capitalize">
                              {ticket.status}
                            </p>
                          </div>
                          <div className="space-y-2 col-span-2">
                            <p className="text-muted-foreground">Order ID</p>
                            <p className="font-medium font-mono">
                              {ticket.orderId}
                            </p>
                          </div>
                          <div className="space-y-2 col-span-2">
                            <p className="text-muted-foreground">
                              Validated At
                            </p>
                            <p className="font-medium">
                              {formatDate(ticket.validation.validatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {(tickets || error) && (
          <DrawerFooter className="border-t">
            <div className="flex space-x-2 w-full max-w-2xl mx-auto">
              <Button onClick={resetScanner} className="flex-1">
                <QrCode className="mr-2 h-4 w-4" />
                Scan Another Ticket
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
