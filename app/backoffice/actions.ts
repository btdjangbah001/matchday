"use server";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { applications, competitions, inventory, matches, staff } from "@/db/schema";
import { issueOtp, verifyOtp } from "@/lib/otp";
import {
  createStaffSession,
  destroyStaffSession,
  requireStaff,
} from "@/lib/session";
import { syncCompetitionById, syncSchedules } from "@/lib/schedule";
import { normalizeCheckInCode } from "@/lib/codes";
import { fixtureTitle, formatKickoff } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { sendSms } from "@/lib/sms";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function baseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

// ---------- Staff login (OTP to a pre-registered staff phone) ----------

export interface LoginState {
  step?: "code";
  phone?: string;
  error?: string;
}

export async function staffRequestOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter a valid phone number." };

  const [member] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.phone, phone), eq(staff.active, true)))
    .limit(1);
  if (!member) {
    return { error: "This number is not registered for back-office access." };
  }

  try {
    await issueOtp({
      phone,
      purpose: "staff_login",
      message: (code) => `Your Matchday staff login code is ${code}.`,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { step: "code", phone };
}

export async function staffVerifyOtp(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  if (!phone) return { error: "Something went wrong. Start again." };

  const result = await verifyOtp({ phone, code, purpose: "staff_login" });
  if (!result.ok) {
    return { step: "code", phone, error: "Incorrect or expired code." };
  }

  const [member] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.phone, phone), eq(staff.active, true)))
    .limit(1);
  if (!member) return { error: "Access revoked." };

  await createStaffSession({
    staffId: member.id,
    name: member.name,
    role: member.role,
  });
  redirect("/backoffice");
}

export async function logout(): Promise<void> {
  await destroyStaffSession();
  redirect("/backoffice/login");
}

// ---------- Vendor review ----------

export async function approveVendor(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("applicationId") ?? "");

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  if (!app || app.type !== "vendor" || app.status !== "awaiting_review") {
    redirect("/backoffice/vendors");
  }

  await db
    .update(applications)
    .set({ status: "awaiting_payment" })
    .where(eq(applications.id, id));

  await sendSms(
    app.phone,
    `Good news! Your Matchday vendor application is approved. ` +
      `Pay to confirm your slot: ${baseUrl()}/pay/${id}`,
  );

  revalidatePath("/backoffice/vendors");
}

export async function rejectVendor(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("applicationId") ?? "");

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  if (!app || app.type !== "vendor" || app.status !== "awaiting_review") {
    redirect("/backoffice/vendors");
  }

  await db
    .update(applications)
    .set({ status: "rejected" })
    .where(eq(applications.id, id));

  await sendSms(
    app.phone,
    `Thank you for applying to vend at Matchday. Unfortunately your ` +
      `application was not approved on this occasion.`,
  );

  revalidatePath("/backoffice/vendors");
}

// ---------- Check-in (manual code or scanned QR token) ----------

export interface CheckInState {
  error?: string;
  success?: {
    name: string;
    type: string;
    fixture: string;
    code: string;
  };
}

export async function checkIn(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  await requireStaff();
  const raw = String(formData.get("value") ?? "").trim();
  if (!raw) return { error: "Enter a check-in code or scan a QR." };

  const condition = UUID_RE.test(raw)
    ? eq(applications.qrToken, raw)
    : eq(applications.checkInCode, normalizeCheckInCode(raw));

  const [row] = await db
    .select({ application: applications, match: matches })
    .from(applications)
    .innerJoin(matches, eq(applications.matchId, matches.id))
    .where(condition)
    .limit(1);

  if (!row) return { error: "No matching pass found." };
  const { application: app, match } = row;
  const fixture = fixtureTitle(match.team1, match.team2);
  const name =
    [app.firstName, app.lastName].filter(Boolean).join(" ") || app.phone;

  if (app.status === "checked_in") {
    return { error: `Already checked in: ${name} (${fixture}).` };
  }
  if (app.status !== "paid") {
    return { error: `This pass is not paid (status: ${app.status}).` };
  }

  // Check-in only opens a configurable window before kickoff (default 60 min).
  if (match.kickoff) {
    const raw = process.env.CHECKIN_WINDOW_MINUTES;
    const windowMinutes =
      raw != null && raw.trim() !== "" && Number.isFinite(Number(raw))
        ? Number(raw)
        : 60;
    const opensAt = new Date(match.kickoff.getTime() - windowMinutes * 60_000);
    if (Date.now() < opensAt.getTime()) {
      return {
        error: `Check-in opens ${windowMinutes} minutes before kickoff — from ${formatKickoff(
          opensAt,
        )}.`,
      };
    }
  }

  await db
    .update(applications)
    .set({ status: "checked_in", checkedInAt: new Date() })
    .where(eq(applications.id, app.id));

  revalidatePath("/backoffice/checkin");
  return {
    success: { name, type: app.type, fixture, code: app.checkInCode ?? "" },
  };
}

// ---------- Schedule + inventory management ----------

export async function syncSchedule(): Promise<void> {
  await requireStaff();
  await syncSchedules();
  revalidatePath("/backoffice/matches");
  revalidatePath("/backoffice/competitions");
  revalidatePath("/");
}

// ---------- Competition (data source) management ----------

export async function addCompetition(formData: FormData): Promise<void> {
  await requireStaff();
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const sourceKind = String(formData.get("sourceKind") ?? "").trim();
  const repo = String(formData.get("repo") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const file = String(formData.get("file") ?? "").trim();

  if (
    !code || !name || !repo || !season || !file ||
    !["json", "txt"].includes(sourceKind)
  ) {
    redirect("/backoffice/competitions?error=invalid");
  }

  await db
    .insert(competitions)
    .values({ code, name, sourceKind, repo, season, file })
    .onConflictDoNothing({ target: competitions.code });

  revalidatePath("/backoffice/competitions");
}

export async function syncOneCompetition(formData: FormData): Promise<void> {
  await requireStaff();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await syncCompetitionById(id);
  revalidatePath("/backoffice/competitions");
  revalidatePath("/backoffice/matches");
  revalidatePath("/");
}

export async function toggleCompetition(formData: FormData): Promise<void> {
  await requireStaff();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) redirect("/backoffice/competitions");
  const [c] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, id))
    .limit(1);
  if (c) {
    await db
      .update(competitions)
      .set({ active: !c.active })
      .where(eq(competitions.id, id));
  }
  revalidatePath("/backoffice/competitions");
}

export async function saveInventory(formData: FormData): Promise<void> {
  await requireStaff();
  const matchId = Number(formData.get("matchId"));
  const type = String(formData.get("type"));
  const priceCedis = Number(formData.get("price"));
  const capacity = Number(formData.get("capacity"));

  if (
    !Number.isInteger(matchId) ||
    !["seat", "parking", "vendor"].includes(type) ||
    !Number.isFinite(priceCedis) ||
    !Number.isInteger(capacity) ||
    capacity < 0
  ) {
    redirect("/backoffice/matches");
  }

  const priceMinor = Math.round(priceCedis * 100);
  await db
    .insert(inventory)
    .values({
      matchId,
      type: type as "seat" | "parking" | "vendor",
      priceMinor,
      capacity,
    })
    .onConflictDoUpdate({
      target: [inventory.matchId, inventory.type],
      set: { priceMinor, capacity },
    });

  revalidatePath("/backoffice/matches");
  revalidatePath("/");
}

/**
 * Apply a price + capacity to a ticket type across the fixtures currently in
 * scope (the next 14 days, optionally filtered to one competition) — the same
 * set shown on the matches page. Per-match values can still be overridden
 * afterwards via saveInventory. `sold` counts are preserved. Leave a type's
 * capacity blank to skip that type.
 */
export async function applyInventoryToAll(formData: FormData): Promise<void> {
  await requireStaff();

  const types = ["seat", "parking", "vendor"] as const;
  const competition = String(formData.get("competition") ?? "").trim();

  // Match the matches-page scope: a competition filter opens that whole
  // competition; otherwise just the next 14 days.
  const now = new Date();
  const scope = competition
    ? and(eq(matches.competition, competition), gte(matches.kickoff, now))
    : and(
        gte(matches.kickoff, now),
        lte(matches.kickoff, new Date(now.getTime() + 14 * 86_400_000)),
      );
  const upcoming = await db
    .select({ id: matches.id })
    .from(matches)
    .where(scope);
  if (upcoming.length === 0) redirect("/backoffice/matches");

  const rows: (typeof inventory.$inferInsert)[] = [];
  for (const type of types) {
    const rawCap = formData.get(`${type}_capacity`);
    const rawPrice = formData.get(`${type}_price`);
    // Skip a type entirely when its capacity field is left blank.
    if (rawCap == null || String(rawCap).trim() === "") continue;

    const capacity = Number(rawCap);
    const price = Number(rawPrice);
    if (!Number.isInteger(capacity) || capacity < 0 || !Number.isFinite(price) || price < 0) {
      continue;
    }
    const priceMinor = Math.round(price * 100);
    for (const m of upcoming) {
      rows.push({ matchId: m.id, type, priceMinor, capacity });
    }
  }

  if (rows.length > 0) {
    await db
      .insert(inventory)
      .values(rows)
      .onConflictDoUpdate({
        target: [inventory.matchId, inventory.type],
        // Use the proposed (excluded) row so each type keeps its own values.
        set: {
          priceMinor: sql`excluded.price_minor`,
          capacity: sql`excluded.capacity`,
        },
      });
  }

  revalidatePath("/backoffice/matches");
  revalidatePath("/");
}
