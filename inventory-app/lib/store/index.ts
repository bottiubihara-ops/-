import type { InventoryRecord, Item, RecordInput } from "@/lib/types";
import { LocalExcelStore } from "./local";
import { GraphExcelStore } from "./graph";

/**
 * データ層の抽象化。
 * - local: リポジトリ内の data/inventory.xlsx を読み書き（開発・デモ用）
 * - graph: Teams上のExcelファイルを Microsoft Graph API で読み書き（本番用）
 * STORE_MODE 環境変数で切り替える。
 */
export interface InventoryStore {
  getMaster(): Promise<Item[]>;
  getMembers(): Promise<string[]>;
  getRecords(): Promise<InventoryRecord[]>;
  addRecord(input: RecordInput): Promise<InventoryRecord>;
  updateRecord(id: string, input: RecordInput): Promise<InventoryRecord>;
  deleteRecord(id: string): Promise<void>;
}

let store: InventoryStore | undefined;

export function getStore(): InventoryStore {
  if (!store) {
    store =
      process.env.STORE_MODE === "graph"
        ? new GraphExcelStore()
        : new LocalExcelStore();
  }
  return store;
}
