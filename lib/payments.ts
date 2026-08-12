// Payment provider abstraction.
// - "mock" uses an in-app checkout page (redirect) so the flow works with no keys.
// - "eganow" pushes a MoMo prompt to the customer's phone (poll/callback) — there
//   is no redirect; we wait for the callback or a status check, first one wins.

export interface InitiateParams {
  /** Our transaction id, sent to the provider. */
  reference: string;
  amountMinor: number;
  currency: string;
  customerPhone: string;
  customerName: string;
  /** Customer-selected MoMo network ("MTN" | "VODAFONE" | "AIRTELTIGO"). */
  network?: string;
  description: string;
  /** Where the provider should POST its result. */
  callbackUrl: string;
}

/**
 * `providerRef` is what we store and reconcile against later (status checks +
 * callback). For mock it's our own reference; for Eganow it's the
 * `eganowReferenceNo` returned by the collection call.
 */
export type InitiateResult =
  | { mode: "redirect"; checkoutUrl: string; providerRef: string }
  | { mode: "poll"; providerRef: string };

export type PaymentStatus = "pending" | "success" | "failed";

export interface PaymentProvider {
  readonly name: string;
  initiate(params: InitiateParams): Promise<InitiateResult>;
  checkStatus(providerRef: string): Promise<PaymentStatus>;
}

function baseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

const mockPaymentProvider: PaymentProvider = {
  name: "mock",
  async initiate({ reference }) {
    return {
      mode: "redirect",
      checkoutUrl: `${baseUrl()}/checkout/mock/${reference}`,
      providerRef: reference,
    };
  },
  async checkStatus() {
    // The mock checkout page drives fulfilment directly; treat as paid if asked.
    return "success";
  },
};

const eganowPaymentProvider: PaymentProvider = {
  name: "eganow",
  async initiate(params) {
    const { initiateCollection } = await import("@/lib/eganow");
    const providerRef = await initiateCollection(params);
    return { mode: "poll", providerRef };
  },
  async checkStatus(providerRef) {
    const { getCollectionStatus } = await import("@/lib/eganow");
    return getCollectionStatus(providerRef);
  },
};

export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENTS_PROVIDER === "eganow"
    ? eganowPaymentProvider
    : mockPaymentProvider;
}
