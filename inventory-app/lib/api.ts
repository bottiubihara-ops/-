import { NextResponse, type NextRequest } from "next/server";
import { isAuthedRequest } from "@/lib/auth";
import { CHECK_STATUSES, type CheckStatus, type RecordInput } from "@/lib/types";

/** 認証チェック込みでAPIハンドラを実行し、例外を500 JSONへ変換する */
export async function withAuth(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isAuthedRequest(req)) {
    return NextResponse.json({ error: "PINで認証してください" }, { status: 401 });
  }
  try {
    return await handler();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 記録入力のバリデーション。問題があればエラーメッセージを返す */
export function parseRecordInput(body: unknown): RecordInput | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = text(b.name);
  if (!name) return "品名を入力してください";
  const member = text(b.member);
  if (!member) return "入力者を選択してください";
  const quantity = typeof b.quantity === "number" ? b.quantity : parseFloat(text(b.quantity));
  if (!Number.isFinite(quantity) || quantity < 0) {
    return "数量には0以上の数値を入力してください";
  }
  const rawPartial =
    typeof b.partialQty === "number" ? b.partialQty : parseFloat(text(b.partialQty));
  const partialQty = Number.isFinite(rawPartial) ? rawPartial : 0;
  if (partialQty < 0 || partialQty > quantity) {
    return "半端量には0以上・数量（合計）以下の数値を入力してください";
  }
  const rawExpired =
    typeof b.expiredQty === "number" ? b.expiredQty : parseFloat(text(b.expiredQty));
  const expiredQty = Number.isFinite(rawExpired) ? rawExpired : 0;
  if (expiredQty < 0) {
    return "期限切れ量には0以上の数値を入力してください";
  }
  const rawStatus = text(b.checkStatus);
  const checkStatus = (
    CHECK_STATUSES.includes(rawStatus as CheckStatus) ? rawStatus : ""
  ) as CheckStatus;
  return {
    code: text(b.code),
    name,
    category: text(b.category),
    quantity,
    unit: text(b.unit),
    partialQty,
    expiredQty,
    expiredDate: text(b.expiredDate),
    location: text(b.location),
    expiryDate: text(b.expiryDate),
    expiryKind: text(b.expiryKind),
    member,
    checkStatus,
    checker: text(b.checker),
    checkedAt: text(b.checkedAt),
    note: text(b.note),
  };
}
