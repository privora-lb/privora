import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { cleanUpStaleListingImageAssets } from "@/lib/listing-image-assets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await cleanUpStaleListingImageAssets();

    if (result.failedCount) {
      console.error("Scheduled listing image cleanup left failed assets queued.", {
        failedCount: result.failedCount,
        remainingCount: result.remainingCount,
      });
      return NextResponse.json(
        { message: "Scheduled image cleanup will retry.", ...result },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Scheduled listing image cleanup failed.", {
      message: error instanceof Error ? error.message : "Unknown cleanup error",
    });
    return NextResponse.json(
      { message: "Scheduled image cleanup failed." },
      { status: 503 },
    );
  }
}

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";

  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}
