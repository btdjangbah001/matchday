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

export const ticketTypeEnum = pgEnum("ticket_type", [
  "seat",
  "parking",
  "vendor",
]);

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

export const reservationStatusEnum = pgEnum("reservation_status", [
  "held",
  "released",
  "consumed",
]);

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

export const applications = pgTable(
  "applications",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  type: ticketTypeEnum("type").notNull(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id),
  phone: text("phone").notNull(),
  // Asked for explicitly: porting makes prefix detection unreliable.
  momoNetwork: text("momo_network"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  vendorType: text("vendor_type"),
  carRegistration: text("car_registration"),
  amountMinor: integer("amount_minor").notNull().default(0),
  status: applicationStatusEnum("status").notNull().default("pending_otp"),
  checkInCode: text("check_in_code").unique(),
  qrToken: uuid("qr_token").unique(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  },
  (t) => [
    // Excluding abandoned/rejected/cancelled rows lets a customer retry after
    // a failed attempt instead of being locked out of the fixture.
    uniqueIndex("uniq_active_application")
      .on(t.phone, t.matchId, t.type)
      .where(
        sql`status in ('otp_verified','awaiting_review','approved','awaiting_payment','paid','checked_in')`,
      ),
  ],
);

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

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref").notNull(),
  checkoutUrl: text("checkout_url"),
  amountMinor: integer("amount_minor").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A held unit of inventory, tied to the application holding it. Inventory.sold
// is only ever moved alongside a status change here, so a unit cannot be
// released twice, and `expires_at` lets abandoned checkouts be swept back.
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .unique()
    .references(() => applications.id, { onDelete: "cascade" }),
  inventoryId: integer("inventory_id")
    .notNull()
    .references(() => inventory.id, { onDelete: "cascade" }),
  status: reservationStatusEnum("status").notNull().default("held"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  sourceKind: text("source_kind").notNull(),
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
export type Reservation = typeof reservations.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
