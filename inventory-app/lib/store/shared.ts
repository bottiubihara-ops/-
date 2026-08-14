import type { InventoryRecord, Item, RecordInput } from "@/lib/types";

/** 「棚卸し記録」シートの列順。Excel側のテーブル(RecordTable)と一致させること */
export const RECORD_HEADERS = [
  "記録ID",
  "記録日時",
  "棚卸し月",
  "原料コード",
  "品名",
  "カテゴリ",
  "数量",
  "単位",
  "半端量",
  "期限切れ量",
  "期限切れ日",
  "保管場所",
  "期限日",
  "期限区分",
  "入力者",
  "チェック状態",
  "ダブルチェック者",
  "ダブルチェック日時",
  "備考",
] as const;

/** 「品目マスタ」シートの列順（MasterTable） */
export const MASTER_HEADERS = [
  "品目ID",
  "原料コード",
  "品名",
  "カテゴリ",
  "単位",
  "備考",
] as const;

export function asText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    // exceljsのリッチテキスト・数式セルを吸収する
    const o = v as { richText?: { text: string }[]; result?: unknown; text?: unknown };
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join("");
    if (o.result !== undefined) return asText(o.result);
    if (o.text !== undefined) return asText(o.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return "";
  }
  return String(v).trim();
}

export function asNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(asText(v));
  return Number.isFinite(n) ? n : 0;
}

/** マスタ行（[品目ID, 原料コード, 品名, カテゴリ, 単位, 備考]）→ Item */
export function rowToItem(vals: unknown[]): Item | null {
  const name = asText(vals[2]);
  if (!name || name === "品名") return null;
  const units = asText(vals[4])
    .split("/")
    .map((u) => u.trim())
    .filter(Boolean);
  return {
    id: asText(vals[0]),
    code: asText(vals[1]),
    name,
    category: asText(vals[3]),
    units: units.length ? units : ["個"],
    note: asText(vals[5]),
  };
}

/** 記録行（RECORD_HEADERS順の配列）→ InventoryRecord */
export function rowToRecord(vals: unknown[]): InventoryRecord | null {
  const id = asText(vals[0]);
  if (!id || id === "記録ID") return null;
  return {
    id,
    recordedAt: asText(vals[1]),
    month: asText(vals[2]),
    code: asText(vals[3]),
    name: asText(vals[4]),
    category: asText(vals[5]),
    quantity: asNumber(vals[6]),
    unit: asText(vals[7]),
    partialQty: asNumber(vals[8]),
    expiredQty: asNumber(vals[9]),
    expiredDate: asText(vals[10]),
    location: asText(vals[11]),
    expiryDate: asText(vals[12]),
    expiryKind: asText(vals[13]),
    member: asText(vals[14]),
    checkStatus: asText(vals[15]),
    checker: asText(vals[16]),
    checkedAt: asText(vals[17]),
    note: asText(vals[18]),
  };
}

/** InventoryRecord → 記録行（RECORD_HEADERS順） */
export function recordToRow(r: InventoryRecord): (string | number)[] {
  return [
    r.id,
    r.recordedAt,
    r.month,
    r.code,
    r.name,
    r.category,
    r.quantity,
    r.unit,
    r.partialQty || "",
    r.expiredQty || "",
    r.expiredDate,
    r.location,
    r.expiryDate,
    r.expiryKind,
    r.member,
    r.checkStatus,
    r.checker,
    r.checkedAt,
    r.note,
  ];
}

/** 現在の日本時間から 記録日時 / 棚卸し月 を作る */
export function nowStamp(): { recordedAt: string; month: string } {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    recordedAt: `${ymd} ${get("hour")}:${get("minute")}`,
    month: ymd.slice(0, 7),
  };
}

/** 入力値 + 既存情報から保存用レコードを組み立てる */
export function buildRecord(
  input: RecordInput,
  existing?: Pick<InventoryRecord, "id" | "recordedAt" | "month">,
): InventoryRecord {
  const stamp = nowStamp();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    recordedAt: existing?.recordedAt ?? stamp.recordedAt,
    month: existing?.month ?? stamp.month,
    code: input.code ?? "",
    name: input.name,
    category: input.category ?? "",
    quantity: input.quantity,
    unit: input.unit ?? "",
    partialQty: input.partialQty ?? 0,
    expiredQty: input.expiredQty ?? 0,
    expiredDate: input.expiredDate ?? "",
    location: input.location ?? "",
    expiryDate: input.expiryDate ?? "",
    expiryKind: input.expiryKind ?? "",
    member: input.member,
    checkStatus: input.checkStatus ?? "",
    checker: input.checker ?? "",
    checkedAt: input.checkedAt ?? "",
    note: input.note ?? "",
  };
}
