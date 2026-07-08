/** 品目マスタの1行（「品目マスタ」シート） */
export interface Item {
  /** 品目ID（例: M001） */
  id: string;
  /** 原料コード（無い品目は空文字。後日追記可能） */
  code: string;
  /** 品名 */
  name: string;
  /** カテゴリ（元Excelのシート名: 原料豆 / 副原料 / フィルター など） */
  category: string;
  /** 単位。複数単位はスラッシュ区切り（例: 箱/本） */
  units: string[];
  /** 備考（型番など） */
  note: string;
}

/** 棚卸し記録の1行（「棚卸し記録」シート） */
export interface InventoryRecord {
  /** 記録ID（UUID） */
  id: string;
  /** 記録日時 "YYYY-MM-DD HH:mm"（日本時間） */
  recordedAt: string;
  /** 棚卸し月 "YYYY-MM"（Excel側での月別フィルタ用） */
  month: string;
  code: string;
  name: string;
  category: string;
  /** 数量（半端量を含んだ合計をそのまま入力する。期限切れ分は含めない） */
  quantity: number;
  unit: string;
  /** 半端量（任意・数量のうち端数分が何kgかのメモ。副原料のみ） */
  partialQty: number;
  /** 期限切れ量（任意・数量とは別枠。原料豆/副原料のみ） */
  expiredQty: number;
  /** 期限切れ日（任意・期限切れ分の期限日 "YYYY-MM-DD"） */
  expiredDate: string;
  /** 保管場所（任意） */
  location: string;
  /** 期限日 "YYYY-MM-DD"（任意） */
  expiryDate: string;
  /** 期限区分（任意: 来月期限 / 再来月期限 / 期限切れ） */
  expiryKind: string;
  /** 入力者 */
  member: string;
  note: string;
}

/** 新規登録・編集でクライアントから受け取る入力値 */
export type RecordInput = Omit<InventoryRecord, "id" | "recordedAt" | "month">;

export const EXPIRY_KINDS = ["来月期限", "再来月期限", "期限切れ"] as const;

/**
 * 期限日から期限区分を自動判定する（月末実地棚卸し基準・手動変更可）。
 * 今月中に期限が来る（または既に過ぎた）→ 期限切れ / 来月中 → 来月期限 /
 * 再来月中 → 再来月期限 / それより先 → 空欄
 */
export function expiryKindFor(dateStr: string, now: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})/.exec(dateStr);
  if (!m) return "";
  const diff =
    Number(m[1]) * 12 + (Number(m[2]) - 1) - (now.getFullYear() * 12 + now.getMonth());
  if (diff <= 0) return "期限切れ";
  if (diff === 1) return "来月期限";
  if (diff === 2) return "再来月期限";
  return "";
}

export const CATEGORIES = ["原料豆", "副原料", "フィルター", "その他"] as const;
