import { NextResponse, type NextRequest } from "next/server";
import { parseRecordInput, withAuth } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const records = await getStore().getRecords();
    return NextResponse.json({ records });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    const input = parseRecordInput(await req.json().catch(() => null));
    if (typeof input === "string") {
      return NextResponse.json({ error: input }, { status: 400 });
    }
    const record = await getStore().addRecord(input);
    return NextResponse.json({ record }, { status: 201 });
  });
}
