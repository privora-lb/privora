import { Rest, type TokenParams } from "ably";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getVisibleVenues } from "@/lib/data/venues";
import {
  getVenueRealtimeChannel,
  realtimeGlobalChannel,
} from "@/lib/realtime-channels";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.ABLY_API_KEY;

  if (!key) {
    return NextResponse.json(
      { message: "ABLY_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const tokenParams: TokenParams = {
    clientId: user.id,
    capability: await getRealtimeCapability(user),
    ttl: 1000 * 60 * 60,
  };
  const client = new Rest({ key });
  const token = await client.auth.requestToken(tokenParams);

  return NextResponse.json(token);
}

async function getRealtimeCapability(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  if (user.role === "superadmin") {
    return JSON.stringify({
      [realtimeGlobalChannel]: ["subscribe"],
    });
  }

  const venues = await getVisibleVenues(user);

  return JSON.stringify(
    Object.fromEntries(
      venues.map((venue) => [getVenueRealtimeChannel(venue.id), ["subscribe"]]),
    ),
  );
}
