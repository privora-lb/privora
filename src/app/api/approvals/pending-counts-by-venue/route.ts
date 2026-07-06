import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getOwnerPendingApprovalCountsByVenue } from "@/lib/data/requests";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "owner") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const counts = await getOwnerPendingApprovalCountsByVenue(user.id);

  return NextResponse.json({ counts });
}
