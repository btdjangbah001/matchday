import { z } from "zod";
import { VENDOR_TYPES } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Ghana phone number" });
      return z.NEVER;
    }
    return normalized;
  });

function idSchema(message: string) {
  return z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? undefined : Number(v)),
    z
      .number({ message })
      .refine((n) => Number.isInteger(n) && n > 0, { message }),
  );
}

const matchIdSchema = idSchema("Select a match");

const networkSchema = z.enum(["MTN", "VODAFONE", "AIRTELTIGO"], {
  message: "Select your mobile money network",
});

export const seatSchema = z.object({
  matchId: matchIdSchema,
  phone: phoneSchema,
  network: networkSchema,
});

export const parkingSchema = z.object({
  matchId: matchIdSchema,
  carRegistration: z.string().trim().min(2, "Car registration is required").max(20),
  phone: phoneSchema,
  network: networkSchema,
});

export const vendorSchema = z.object({
  seasonId: idSchema("Select a season"),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  vendorType: z.enum(VENDOR_TYPES),
  phone: phoneSchema,
  network: networkSchema,
});

export const otpInputSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");
