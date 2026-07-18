import { NextResponse } from "next/server";

import {
  getPublicCalendarStatuses,
  getPublishedCalendarVenue,
} from "@/lib/data/listings";
import { getMonthRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const month = new URL(request.url).searchParams.get("month") ?? "";

  if (!isValidMonth(month)) {
    return NextResponse.json({ message: "Invalid month." }, { status: 400 });
  }

  const venue = await getPublishedCalendarVenue(slug);

  if (!venue) {
    return NextResponse.json({ message: "Calendar not found." }, { status: 404 });
  }

  const range = getMonthRange(month);
  const statuses = await getPublicCalendarStatuses(
    venue.id,
    range.start,
    range.end,
  );

  return NextResponse.json(
    { month, statuses },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function isValidMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}
