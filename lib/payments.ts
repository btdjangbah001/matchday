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

const PAYMENT_PROVIDERS: Record<string, PaymentProvider> = {
  mock: mockPaymentProvider,
  techup: techupPaymentProvider,
};

export function isMockPayments(): boolean {
  return process.env.PAYMENTS_PROVIDER === "mock";
}

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENTS_PROVIDER;
  const known = Object.keys(PAYMENT_PROVIDERS).join(", ");

  if (!name) {
    throw new Error(`PAYMENTS_PROVIDER is not set. Choose one of: ${known}.`);
  }

  const provider = PAYMENT_PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `PAYMENTS_PROVIDER is "${name}", which is not a known payment provider. ` +
        `Choose one of: ${known}.`,
    );
  }

  // The mock settles every payment as successful.
  if (
    name === "mock" &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_MOCK_PAYMENTS !== "true"
  ) {
    throw new Error(
      "Refusing to use the mock payment provider in production. " +
        "Set PAYMENTS_PROVIDER=techup for real payments, or " +
        "ALLOW_MOCK_PAYMENTS=true to run an explicit demonstration deployment.",
    );
  }

  return provider;
}
