import { CheckCircle2, Circle, RotateCcw, XCircle } from "lucide-react";

/**
 * Filter options for the attendees table.
 *
 * Values must match the ticket_status enum exactly — these are compared
 * against the column value, and the previous list used display-cased strings
 * ("Active", "Used") that never matched anything.
 */
export const ticketStatuses = [
  { value: "active", label: "Not arrived", icon: Circle },
  { value: "checked_in", label: "Checked in", icon: CheckCircle2 },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
  { value: "refunded", label: "Refunded", icon: RotateCcw },
];
