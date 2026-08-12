import type { TicketType } from "@/db/schema";

export const VENDOR_TYPES = [
  "Food",
  "Drinks",
  "Merchandise",
  "Crafts & Art",
  "Other",
] as const;

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  seat: "Seat",
  parking: "Parking",
  vendor: "Vendor",
};

export const CURRENCY = "GHS";
