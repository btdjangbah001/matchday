export function baseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

export function vendorPaymentLink(applicationId: string): string {
  return `${baseUrl()}/pay/${applicationId}`;
}

export function vendorPaymentMessage(applicationId: string): string {
  return (
    `Good news! Your Matchday vendor application is approved. ` +
    `Pay to confirm your slot: ${vendorPaymentLink(applicationId)}`
  );
}
