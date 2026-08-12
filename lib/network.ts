// Detect the Ghana mobile-money network from a phone number so MoMo collections
// can be routed to the right channel. Prefixes are the two digits after +233.
export type MomoNetwork = "MTN" | "VODAFONE" | "AIRTELTIGO" | "UNKNOWN";

const PREFIXES: Record<string, MomoNetwork> = {
  "24": "MTN",
  "25": "MTN",
  "53": "MTN",
  "54": "MTN",
  "55": "MTN",
  "59": "MTN",
  "20": "VODAFONE", // now Telecel
  "50": "VODAFONE",
  "26": "AIRTELTIGO",
  "27": "AIRTELTIGO",
  "56": "AIRTELTIGO",
  "57": "AIRTELTIGO",
};

export function detectNetwork(phone: string): MomoNetwork {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("233") ? digits.slice(3) : digits;
  return PREFIXES[national.slice(0, 2)] ?? "UNKNOWN";
}

// The networks a customer can pick on the payment form. We ask explicitly
// because number porting means the prefix no longer reliably implies the
// network the MoMo wallet lives on.
export const SELECTABLE_NETWORKS = [
  { value: "MTN", label: "MTN MoMo" },
  { value: "VODAFONE", label: "Telecel Cash" },
  { value: "AIRTELTIGO", label: "AirtelTigo Money" },
] as const;

export type SelectableNetwork = (typeof SELECTABLE_NETWORKS)[number]["value"];
