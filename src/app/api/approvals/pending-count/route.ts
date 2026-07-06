import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getPendingApprovalCount } from "@/lib/data/requests";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const venueId = url.searchParams.get("venue") ?? undefined;
  const count = await getPendingApprovalCount({
    role: user.role,
    userId: user.id,
    venueId,
  });

  return NextResponse.json({ count });
}
