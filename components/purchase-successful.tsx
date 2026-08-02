"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CircleCheck,
  Download,
  Calendar,
  Clock,
  MapPin,
  Home,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

/** The subset of the checkout payload this screen renders. */
interface PurchaseCheckoutData {
  currency: string;
  items: Array<{
    type: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  totals: { totalMinor: number };
  event: {
    id: string;
    eventName: string | null;
    eventFlyer: string | null;
    timings: Array<{ date: string; startTime: string; endTime: string | null }>;
  };
  venue: { venueName: string; city: string | null } | null;
}

interface PurchaseSuccessfulProps {
  checkoutData: PurchaseCheckoutData;
}

export function PurchaseSuccessful({ checkoutData }: PurchaseSuccessfulProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (orderId) {
      generateQRCode(orderId);
    }
  }, [orderId]);

  const generateQRCode = async (orderId: string) => {
    try {
      const url = await QRCode.toDataURL(orderId);
      setQrCodeUrl(url);
    } catch (err) {
      console.error("QR Code generation error:", err);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    const ticket = document.getElementById("ticket-content");
    if (!ticket) return;

    try {
      const flyerImg = new window.Image();
      flyerImg.crossOrigin = "anonymous";
      await new Promise((resolve) => {
        flyerImg.onload = resolve;
        flyerImg.src = checkoutData.event.eventFlyer ?? "";
      });

      const canvas = await html2canvas(ticket, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        backgroundColor: "#171717", // This sets the canvas background
        onclone: (clonedDoc) => {
          const clonedImg = clonedDoc.querySelector("img");
          if (clonedImg) {
            clonedImg.src = flyerImg.src;
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
      });

      // Set PDF background color
      pdf.setFillColor(23, 23, 23); // RGB values for #171717
      pdf.rect(
        0,
        0,
        pdf.internal.pageSize.getWidth(),
        pdf.internal.pageSize.getHeight(),
        "F"
      );

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      const x = (pdfWidth - scaledWidth) / 2;
      const y = (pdfHeight - scaledHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight);
      pdf.save(`${checkoutData.event.eventName}-ticket.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background px-4 py-12 md:px-6">
      <div className="max-w-2xl w-full space-y-6">
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="absolute -inset-2 rounded-full border-4 border-primary animate-ping" />
                <CircleCheck className="text-success size-10" />
              </div>
              <h2 className="text-2xl font-bold leading-tight">
                Purchase Successful!
              </h2>
              <p className="text-muted-foreground text-center">
                Your tickets have been confirmed. You can download them or
                access them anytime from your email.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card id="ticket-content" className="border-2">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle className="flex items-center justify-between">
              <span>E-Ticket</span>
              <Badge variant="outline">{orderId}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6 p-6">
            <div className="flex flex-col gap-4">
              <Image
                src={checkoutData.event.eventFlyer ?? "/og-image.png"}
                alt="Event Flyer"
                width={500}
                height={500}
                className="object-cover rounded-lg"
                priority={true}
              />
              {qrCodeUrl && (
                <div className="flex flex-col items-center">
                  <Image
                    src={qrCodeUrl}
                    alt="Ticket QR Code"
                    width={128}
                    height={128}
                    priority={true}
                  />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2">
                  {checkoutData.event.eventName}
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {checkoutData.venue
                      ? [checkoutData.venue.venueName, checkoutData.venue.city]
                          .filter(Boolean)
                          .join(", ")
                      : "Venue to be announced"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {checkoutData.event.timings.map(
                  (timing, index) => (
                    <div key={index} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 font-medium">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(timing.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {timing.startTime} - {timing.endTime}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Ticket Details</h4>
                <div className="space-y-2">
                  {checkoutData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between py-2 border-b"
                    >
                      <span className="font-medium">
                        {item.type} × {item.quantity}
                      </span>
                      <span>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: checkoutData.currency,
                        }).format(item.lineTotalMinor / 100)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/events/${checkoutData.event.id}`)}
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Event
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloading ? "Generating PDF..." : "Download Ticket"}
          </Button>
        </div>
      </div>
    </div>
  );
}
