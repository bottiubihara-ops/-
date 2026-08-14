import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const members = await getStore().getMembers();
    return NextResponse.json({ members });
  });
}
