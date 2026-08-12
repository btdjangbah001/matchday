# Matchday — World Cup 2026 Watch-Party Ticketing

A serverless ticketing platform for a World Cup watch party. Entry is free;
**seats**, **parking**, and **vendor** slots are paid. Applicants verify their
phone with an OTP, then pay via **Eganow** direct checkout. **Vendors** are
reviewed in the back office first, then receive an **SMS** payment link. Every
paid applicant gets a **QR pass + check-in code** redeemable at the venue.

Built on **Next.js 16 (App Router)**, **Postgres (Vercel/Neon)** via **Drizzle**,
deployable to **Vercel**.

## Status

Fully wired end-to-end with **mock** SMS and payment providers so it runs with
no external keys. Eganow and Arkesel are stubbed behind interfaces
(`lib/payments.ts`, `lib/sms.ts`) — flip a single env var to go live later.

## Setup

1. **Database** — create a Neon / Vercel Postgres database and copy the
   connection string.
2. **Env** — copy `.env.example` to `.env` and fill in at least:
   ```
   DATABASE_URL=postgresql://...      # your Neon pooled URL
   SESSION_SECRET=...                 # openssl rand -base64 32
   APP_BASE_URL=http://localhost:3000
   SMS_PROVIDER=mock                  # OTPs/links print to the server console
   PAYMENTS_PROVIDER=mock             # in-app simulated checkout
   ```
3. **Install & migrate**
   ```bash
   npm install
   npm run db:migrate     # apply schema
   npm run db:seed        # sync 2026 schedule + seed staff & sample inventory
   npm run dev
   ```

The seed registers two staff phones for back-office login:
`+233200000001` (admin) and `+233200000002`.

## Going live later

- **SMS (Arkesel):** set `SMS_PROVIDER=arkesel`, `ARKESEL_API_KEY`,
  `ARKESEL_SENDER`. See `lib/sms.ts`.
- **Payments (Eganow):** set `PAYMENTS_PROVIDER=eganow` and the `EGANOW_*` vars.
  Confirm the checkout endpoint/fields and webhook signature scheme against
  Eganow's docs — placeholders are marked in `lib/payments.ts` and
  `app/api/payments/eganow/webhook/route.ts`.

## Manual verification (with a database configured)

1. **Schedule + inventory:** sign in at `/backoffice/login` (code prints to the
   console), open **Matches**, click **Sync schedule**, set a price/capacity for
   a match's seat row.
2. **Seat flow:** `/apply/seat` → pick the match, enter a phone → read the OTP
   from the console → verify → **Pay now (simulate success)** → land on the QR
   pass with a check-in code.
3. **Vendor flow:** `/apply/vendor` → verify OTP → status shows *awaiting
   review* → in **Vendors**, approve → payment-link SMS prints to the console →
   open it → pay → pass issued.
4. **Check-in:** `/backoffice/checkin` → type the check-in code (or scan the QR
   on a `localhost`/HTTPS origin). Confirm it flips to *checked in* and a second
   attempt is rejected.
5. **Oversell guard:** set a seat capacity of 1, book it, then try a second
   booking — checkout returns *just sold out*.

## Project layout

```
app/                    routes + server actions
  actions.ts            public flow actions (apply / verify / checkout)
  apply/ verify/ pay/   applicant journey
  ticket/[qrToken]/     QR pass
  checkout/mock/        dev payment simulator
  api/payments/eganow/  live payment webhook
  backoffice/           staff: login, dashboard, vendors, check-in, matches
db/                     schema, client, migrations, seed
lib/                    otp, session, sms, payments, orders, worldcup, queries
components/             UI kit + forms + QR scanner
```

## Known follow-ups

Real Eganow/Arkesel calls; reservation-hold expiry (abandoned checkouts hold
inventory until released); OTP rate-limiting; refunds.
