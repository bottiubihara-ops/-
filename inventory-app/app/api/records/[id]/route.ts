import { NextResponse, type NextRequest } from "next/server";
import { parseRecordInput, withAuth } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(req, async () => {
    const { id } = await params;
    const input = parseRecordInput(await req.json().catch(() => null));
    if (typeof input === "string") {
      return NextResponse.json({ error: input }, { status: 400 });
    }
    const record = await getStore().updateRecord(id, input);
    return NextResponse.json({ record });
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withAuth(req, async () => {
    const { id } = await params;
    await getStore().deleteRecord(id);
    return NextResponse.json({ ok: true });
  });
}
