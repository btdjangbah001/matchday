import type { NextRequest } from "next/server";
import { sweepExpiredReservations } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const released = await sweepExpiredReservations();
  return Response.json({ ok: true, released });
}
