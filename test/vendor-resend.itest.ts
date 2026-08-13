import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";
import { db } from "@/db";
import { applications, inventory, seasons } from "@/db/schema";
import { formData, testPhone } from "./fixtures";

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

vi.mock("@/lib/session", () => ({
  requireStaff: async () => ({ staffId: 1, name: "Admin", role: "admin" }),
  getStaffSession: async () => ({ staffId: 1, name: "Admin", role: "admin" }),
}));

const sent: { to: string; message: string }[] = [];
vi.mock("@/lib/sms", () => ({
  sendSms: async (to: string, message: string) => {
    sent.push({ to, message });
    return { ok: true };
  },
  getSmsSender: () => ({ send: async () => ({ ok: true }) }),
}));

const PREFIX = "itest-resend";

async function cleanup() {
  const rows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(like(seasons.name, `${PREFIX}%`));
  for (const s of rows) {
    await db.delete(applications).where(eq(applications.seasonId, s.id));
    await db.delete(inventory).where(eq(inventory.seasonId, s.id));
    await db.delete(seasons).where(eq(seasons.id, s.id));
  }
}

async function vendorAwaitingPayment() {
  const [season] = await db
    .insert(seasons)
    .values({
      name: `${PREFIX}-${Math.random().toString(36).slice(2, 9)}`,
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 200 * 86_400_000),
    })
    .returning({ id: seasons.id });

  const [app] = await db
    .insert(applications)
    .values({
      type: "vendor",
      seasonId: season.id,
      phone: testPhone(),
      firstName: "Ama",
      lastName: "Mensah",
      vendorType: "Food",
      amountMinor: 150000,
      status: "awaiting_payment",
    })
    .returning({ id: applications.id, phone: applications.phone });
  return app;
}

beforeAll(cleanup);
afterAll(cleanup);

describe("resending a vendor payment link", () => {
  it("texts the payment link again", async () => {
    const { resendVendorPaymentLink } = await import(
      "@/app/backoffice/actions"
    );
    const app = await vendorAwaitingPayment();
    sent.length = 0;

    const result = await resendVendorPaymentLink(
      {},
      formData({ applicationId: app.id }),
    );

    expect(result.sent).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(app.phone);
    expect(sent[0].message).toContain(`/pay/${app.id}`);
  });

  it("sends the same link the approval sent", async () => {
    const { vendorPaymentLink } = await import("@/lib/links");
    const app = await vendorAwaitingPayment();
    sent.length = 0;

    const { resendVendorPaymentLink } = await import(
      "@/app/backoffice/actions"
    );
    await resendVendorPaymentLink({}, formData({ applicationId: app.id }));

    expect(sent[0].message).toContain(vendorPaymentLink(app.id));
  });

  it("refuses once the vendor has paid", async () => {
    const { resendVendorPaymentLink } = await import(
      "@/app/backoffice/actions"
    );
    const app = await vendorAwaitingPayment();
    await db
      .update(applications)
      .set({ status: "paid" })
      .where(eq(applications.id, app.id));
    sent.length = 0;

    const result = await resendVendorPaymentLink(
      {},
      formData({ applicationId: app.id }),
    );

    expect(result.error).toMatch(/already paid/i);
    expect(sent).toHaveLength(0);
  });

  it("refuses while the vendor is still awaiting review", async () => {
    const { resendVendorPaymentLink } = await import(
      "@/app/backoffice/actions"
    );
    const app = await vendorAwaitingPayment();
    await db
      .update(applications)
      .set({ status: "awaiting_review" })
      .where(eq(applications.id, app.id));
    sent.length = 0;

    const result = await resendVendorPaymentLink(
      {},
      formData({ applicationId: app.id }),
    );

    expect(result.error).toMatch(/not awaiting payment/i);
    expect(sent).toHaveLength(0);
  });

  it("reports an unknown application rather than throwing", async () => {
    const { resendVendorPaymentLink } = await import(
      "@/app/backoffice/actions"
    );
    const result = await resendVendorPaymentLink(
      {},
      formData({ applicationId: "11111111-2222-3333-4444-555555555555" }),
    );
    expect(result.error).toMatch(/not found/i);
  });
});
