# Matchday — Football Watch Centre Booking Platform

A booking platform for a commercial football watch centre. Entry to the venue is
free; the platform sells the scarce things around a screening — **seats**,
**parking bays** and **vendor pitches** — tied to a specific fixture.

Customers have no account. A phone number is the identity: verify it with an OTP,
pay by mobile money, and receive a **QR pass plus a short check-in code** to
redeem at the gate. **Vendors** are reviewed in the back office first, then
receive an SMS payment link.

Fixtures are imported from [openfootball](https://github.com/openfootball) for
competitions an administrator configures — Premier League, La Liga, Serie A,
Bundesliga and others.

Built on **Next.js 16 (App Router)**, **Postgres (Neon)** via **Drizzle**,
deployable to **Vercel**.

## Documentation

Full engineering documentation lives in [`docs/`](./docs):

| Document | Covers |
| --- | --- |
| [`SRS.md`](./docs/SRS.md) | Requirements, stakeholders, prioritisation, traceability |
| [`System_Design.md`](./docs/System_Design.md) | Architecture, ER model, state machine, sequence diagrams |
| [`Effort_Estimation.md`](./docs/Effort_Estimation.md) | Function Point Analysis and COCOMO II |
| [`Testing_Report.md`](./docs/Testing_Report.md) | Test strategy, results, defects |
| [`Technical_Debt_Plan.md`](./docs/Technical_Debt_Plan.md) | Debt register and repayment plan |
| [`User_Manual.md`](./docs/User_Manual.md) | Customer, staff and operator instructions |
| [`Maintenance_and_Evolution.md`](./docs/Maintenance_and_Evolution.md) | Maintenance model and roadmap |
| [`Project_Documentation.md`](./docs/Project_Documentation.md) | Master document |

## Status

Wired end to end. **SMS and payments ship with mock providers** so the whole flow
runs with no external keys — OTPs and payment links print to the server console,
and checkout uses an in-app simulator. Both sit behind interfaces
(`lib/sms.ts`, `lib/payments.ts`); switching to the real Arkesel and TechupStudio
implementations is an environment-variable change.

## Setup

1. **Database** — create a Neon or Vercel Postgres database and copy the pooled
   connection string.

2. **Environment** — copy `.env.example` to `.env` and set at minimum:

   ```
   DATABASE_URL=postgresql://...      # pooled Neon URL
   SESSION_SECRET=...                 # openssl rand -base64 32
   APP_BASE_URL=http://localhost:3000
   SMS_PROVIDER=mock                  # OTPs and links print to the console
   PAYMENTS_PROVIDER=mock             # in-app simulated checkout
   ```

3. **Install, migrate, seed, run**

   ```bash
   npm install
   npm run db:migrate     # apply schema
   npm run db:seed        # seed competitions, staff allowlist, sample inventory
   npm run dev
   ```

The seed registers the staff allowlist used for back-office sign-in — see
`db/seed.ts` for the numbers. Staff accounts are not self-service; sign-in
requires the phone to be present and `active` in the `staff` table.

## Testing

```bash
npm test            # 72 unit tests over lib/ (~0.3s)
npm run test:watch
npx tsc --noEmit
npm run lint
```

The suite covers pure logic: phone normalisation, input validation, code and
token generation, formatting, and the openfootball fixture parser. There is no
integration or end-to-end coverage yet — see
[TD-05](./docs/Technical_Debt_Plan.md).

## Going live

- **SMS (Arkesel):** set `SMS_PROVIDER=arkesel`, `ARKESEL_API_KEY`,
  `ARKESEL_SENDER`. See `lib/sms.ts`.
- **Payments (TechupStudio):** set `PAYMENTS_PROVIDER=techup` plus the
  `TECHUP_*` variables. Configure Bank → Settlement on the TechUp side first and
  paste the settlement id. See `lib/techup.ts`.
- **`TECHUP_WEBHOOK_SECRET` is required.** The payment webhook **fails closed** —
  it refuses every callback when the secret is unset, because the callback
  reference is the application id the customer already knows.
- **Mock payments are blocked in production** unless `ALLOW_MOCK_PAYMENTS=true`
  is set explicitly, since the mock reports every payment as successful.

## Manual verification (with a database configured)

1. **Fixtures and inventory** — sign in at `/backoffice/login` (the code prints
   to the console), open **Competitions** and sync, then set a price and capacity
   for a fixture's seat row under **Matches**.
2. **Seat flow** — `/apply/seat` → choose the fixture, enter a phone → read the
   OTP from the console → verify → pay (simulated) → land on the QR pass.
3. **Vendor flow** — `/apply/vendor` → verify → status shows *awaiting review* →
   approve under **Vendors** → the payment-link SMS prints to the console → open
   it → pay → pass issued.
4. **Check-in** — `/backoffice/checkin` → type the check-in code, or scan the QR
   on a `localhost`/HTTPS origin. Confirm it flips to *checked in* and that a
   second attempt is refused.
5. **Oversell guard** — set a seat capacity of 1, book it, then attempt a second
   booking; checkout returns *just sold out*.

## Project layout

```
app/                       routes + server actions
  actions.ts               public flow (apply / verify / checkout / poll)
  apply/ verify/ pay/      applicant journey
  ticket/[qrToken]/        QR pass
  account/                 customer sign-in and booking history
  fixtures/                public schedule with filter and search
  checkout/mock/           simulated payment page
  api/payments/techup/     payment webhook
  backoffice/              staff: login, applications, vendors, matches,
                           competitions, check-in, reports
db/                        schema, client, migrations, seed
lib/                       otp, session, sms, payments, techup, orders,
                           schedule, queries, validation, format, phone, codes
components/                UI primitives, forms, QR scanner
docs/                      engineering documentation
```

## Known follow-ups

Tracked with causes, impacts and a repayment schedule in
[`docs/Technical_Debt_Plan.md`](./docs/Technical_Debt_Plan.md). The main ones:
no integration or end-to-end tests (TD-05); inventory is a bare counter rather
than reservation rows, so the double-release fix is a mitigation not a cure
(TD-03); abandoned checkouts hold inventory until released; no refunds; no
runtime monitoring.
