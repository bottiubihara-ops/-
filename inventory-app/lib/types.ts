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
  quantity: number;
  unit: string;
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

export const CATEGORIES = ["原料豆", "副原料", "フィルター", "その他"] as const;
