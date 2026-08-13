export interface InitiateParams {
  reference: string;
  amountMinor: number;
  currency: string;
  customerPhone: string;
  customerName: string;
  description: string;
  callbackUrl: string;
}

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
    return "success";
  },
};

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

export function isMockPayments(): boolean {
  return process.env.PAYMENTS_PROVIDER !== "techup";
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENTS_PROVIDER === "techup") return techupPaymentProvider;

  // The mock settles every payment as successful.
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
