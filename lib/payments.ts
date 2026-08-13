// Payment provider abstraction.
// - "mock"   uses an in-app checkout page (redirect) so the flow works with no keys.
// - "techup" uses TechupStudio's hosted checkout (redirect) — the customer picks
//   their method on the provider's page; a callback + status endpoint confirm it.

export interface InitiateParams {
  /** Our transaction id, sent to the provider. */
  reference: string;
  amountMinor: number;
  currency: string;
  customerPhone: string;
  customerName: string;
  description: string;
  /** Where the provider should POST its result. */
  callbackUrl: string;
}

/**
 * `providerRef` is what we store and reconcile against later (status checks +
 * callback). For mock it's our own reference; for TechUp it's the reference the
 * initiate call returns.
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

// TechupStudio: hosted-checkout Receive flow — redirect the customer to the
// returned actionUrl; the callback + status endpoint confirm payment.
const techupPaymentProvider: PaymentProvider = {
  name: "techup",
  async initiate(params) {
    const { initiatePayment } = await import("@/lib/techup");
    const { actionUrl, reference } = await initiatePayment({
      correlationId: params.reference,
      amountMinor: params.amountMinor,
      description: params.description,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      callbackUrl: params.callbackUrl,
    });
    return { mode: "redirect", checkoutUrl: actionUrl, providerRef: reference };
  },
  async checkStatus(providerRef) {
    const { getPaymentStatus } = await import("@/lib/techup");
    return getPaymentStatus(providerRef);
  },
};

/**
 * True when the mock provider is active. The mock reports every payment as
 * successful, so anything it settles is a simulation — callers use this to make
 * that unmistakable in the interface. See TD-02.
 */
export function isMockPayments(): boolean {
  return process.env.PAYMENTS_PROVIDER !== "techup";
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENTS_PROVIDER === "techup") return techupPaymentProvider;

  // The mock provider's checkStatus() returns "success" unconditionally, so
  // selecting it in production would issue valid passes to anyone who reaches
  // the confirm page. Being the default made that a single missing environment
  // variable away. Demonstration deployments must opt in explicitly. See TD-02.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_MOCK_PAYMENTS !== "true"
  ) {
    throw new Error(
      "Refusing to use the mock payment provider in production. " +
        "Set PAYMENTS_PROVIDER=techup for real payments, or " +
        "ALLOW_MOCK_PAYMENTS=true to run an explicit demonstration deployment.",
    );
  }

  return mockPaymentProvider;
}
