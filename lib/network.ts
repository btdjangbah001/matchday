// The mobile-money networks a customer can pick on the application form. This is
// captured as informational metadata (shown to staff); the payment provider's
// hosted checkout is where the customer actually chooses how to pay.
export const SELECTABLE_NETWORKS = [
  { value: "MTN", label: "MTN MoMo" },
  { value: "VODAFONE", label: "Telecel Cash" },
  { value: "AIRTELTIGO", label: "AirtelTigo Money" },
] as const;

export type SelectableNetwork = (typeof SELECTABLE_NETWORKS)[number]["value"];
