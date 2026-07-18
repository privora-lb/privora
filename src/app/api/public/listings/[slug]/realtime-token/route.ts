import { Rest, type TokenParams } from "ably";
import { NextResponse } from "next/server";

import { getPublishedCalendarVenue } from "@/lib/data/listings";
import { getVenueRealtimeChannel } from "@/lib/realtime-channels";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const venue = await getPublishedCalendarVenue(slug);

  if (!venue) {
    return NextResponse.json({ message: "Calendar not found." }, { status: 404 });
  }

  const key = process.env.ABLY_API_KEY;

  if (!key) {
    return NextResponse.json(
      { message: "Realtime is not configured." },
      { status: 503 },
    );
  }

  const channel = getVenueRealtimeChannel(venue.id);
  const tokenParams: TokenParams = {
    capability: JSON.stringify({ [channel]: ["subscribe"] }),
    clientId: `public-listing:${slug}`,
    ttl: 1000 * 60 * 60,
  };
  const client = new Rest({ key });
  const token = await client.auth.requestToken(tokenParams);

  return NextResponse.json(token, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
