import {
  CheckCircle2,
  Circle,
  Clock,
  RotateCcw,
  XCircle,
} from "lucide-react";

/**
 * Filter options for the orders table. Values match the payment_status and
 * order_status enums exactly; a mismatch silently filters everything out.
 */
export const paymentStatuses = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "authorized", label: "Authorized", icon: Circle },
  { value: "completed", label: "Paid", icon: CheckCircle2 },
  { value: "failed", label: "Failed", icon: XCircle },
  { value: "refunded", label: "Refunded", icon: RotateCcw },
];

export const orderStatuses = [
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
  { value: "refunded", label: "Refunded", icon: RotateCcw },
];
