"use server";

import { redirect } from "next/navigation";
import { issueOtp, verifyOtp } from "@/lib/otp";
import {
  createCustomerSession,
  destroyCustomerSession,
} from "@/lib/customer-session";
import { normalizePhone } from "@/lib/phone";

export interface LoginState {
  step?: "code";
  phone?: string;
  error?: string;
}

export async function requestCustomerOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter a valid phone number." };

  try {
    await issueOtp({
      phone,
      purpose: "customer_login",
      message: (code) => `Your Matchday sign-in code is ${code}.`,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { step: "code", phone };
}

export async function verifyCustomerOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  if (!phone) return { error: "Something went wrong. Start again." };

  const result = await verifyOtp({ phone, code, purpose: "customer_login" });
  if (!result.ok) {
    return { step: "code", phone, error: "Incorrect or expired code." };
  }

  await createCustomerSession(phone);
  redirect("/account");
}

export async function logoutCustomer(): Promise<void> {
  await destroyCustomerSession();
  redirect("/");
}
