import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/lib/api";
import { getStore } from "@/lib/store";
import { RECORD_HEADERS, recordToRow, nowStamp } from "@/lib/store/shared";

export const dynamic = "force-dynamic";

function csvField(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 棚卸し記録をCSV（UTF-8 BOM付き・Excelでそのまま開ける）でダウンロード */
export async function GET(req: NextRequest) {
  return withAuth(req, async () => {
    const records = await getStore().getRecords();
    const lines = [
      RECORD_HEADERS.join(","),
      ...records.map((r) => recordToRow(r).map(csvField).join(",")),
    ];
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
    const stamp = nowStamp().recordedAt.replace(/[- :]/g, "");
    const filename = encodeURIComponent(`棚卸し記録_${stamp}.csv`);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventory_records.csv"; filename*=UTF-8''${filename}`,
      },
    });
  });
}
