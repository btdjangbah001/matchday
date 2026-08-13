import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// A paid item type. "vendor" goes through back-office review before payment;
// "seat" and "parking" check out directly after OTP verification.
export const ticketTypeEnum = pgEnum("ticket_type", [
  "seat",
  "parking",
  "vendor",
]);

// Lifecycle of an application. Seat/parking skip the review states.
export const applicationStatusEnum = pgEnum("application_status", [
  "pending_otp", // created, waiting for phone verification
  "otp_verified", // phone verified
  "awaiting_review", // vendor only: waiting for back-office decision
  "approved", // vendor only: approved, payment link sent
  "rejected", // vendor only: declined
  "awaiting_payment", // checkout can be initiated
  "paid", // payment confirmed, pass issued
  "checked_in", // redeemed at the venue
  "cancelled",
]);

export const otpPurposeEnum = pgEnum("otp_purpose", [
  "application",
  "staff_login",
  "customer_login",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
]);

// Football fixtures, synced from openfootball/football.json (multiple leagues).
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  extId: text("ext_id").notNull().unique(),
  competition: text("competition"),
  round: text("round"),
  groupName: text("group_name"),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  kickoff: timestamp("kickoff", { withTimezone: true }),
  venue: text("venue"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Capacity and price per match per ticket type. Availability = capacity - sold.
export const inventory = pgTable(
  "inventory",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    type: ticketTypeEnum("type").notNull(),
    priceMinor: integer("price_minor").notNull().default(0),
    capacity: integer("capacity").notNull().default(0),
    sold: integer("sold").notNull().default(0),
  },
  (t) => [unique("inventory_match_type").on(t.matchId, t.type)],
);

// One row per applicant across all three flows.
export const applications = pgTable(
  "applications",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  type: ticketTypeEnum("type").notNull(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  phone: text("phone").notNull(),
  // Mobile-money network chosen by the applicant (number porting makes prefix
  // detection unreliable): "MTN" | "VODAFONE" | "AIRTELTIGO".
  momoNetwork: text("momo_network"),
  // Vendor fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  vendorType: text("vendor_type"),
  // Parking fields
  carRegistration: text("car_registration"),
  amountMinor: integer("amount_minor").notNull().default(0),
  status: applicationStatusEnum("status").notNull().default("pending_otp"),
  // Issued once paid: a short human-readable code and an opaque token for the QR.
  checkInCode: text("check_in_code").unique(),
  qrToken: uuid("qr_token").unique(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  },
  (t) => [
    // A phone may hold only ONE active application per (match, type). Abandoned
    // (pending_otp), rejected and cancelled rows are excluded so failed/aborted
    // attempts don't lock the customer out. This is the DB-level backstop to the
    // checks in the apply/verify server actions.
    uniqueIndex("uniq_active_application")
      .on(t.phone, t.matchId, t.type)
      .where(
        sql`status in ('otp_verified','awaiting_review','approved','awaiting_payment','paid','checked_in')`,
      ),
  ],
);

// Short-lived one-time passwords for both applicant and staff verification.
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: otpPurposeEnum("purpose").notNull(),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "cascade",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Allowlist of venue staff who may sign in to the back office.
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Checkout attempts + webhook reconciliation.
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref").notNull(),
  // Hosted-checkout URL for redirect providers (mock, TechUp); null for MoMo push.
  checkoutUrl: text("checkout_url"),
  amountMinor: integer("amount_minor").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Admin-managed schedule sources. Admins add a competition + its openfootball
// source here and trigger a sync; fixtures only appear when real data exists.
export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  // Stable prefix for a fixture's ext_id, e.g. "en.1" or "ucl".
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  // "json" (openfootball/football.json) or "txt" (openfootball text DSL repos).
  sourceKind: text("source_kind").notNull(),
  // openfootball repo, e.g. "england" or "football.json".
  repo: text("repo").notNull(),
  season: text("season").notNull(), // e.g. "2026-27"
  file: text("file").notNull(), // e.g. "1-premierleague.txt"
  active: boolean("active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastCount: integer("last_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TicketType = (typeof ticketTypeEnum.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];
export type Match = typeof matches.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
