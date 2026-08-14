import type { InventoryRecord, Item, RecordInput } from "@/lib/types";
import type { InventoryStore } from "./index";
import { buildRecord, recordToRow, rowToItem, rowToRecord } from "./shared";

const TABLE_MASTER = "MasterTable";
const TABLE_RECORDS = "RecordTable";
const TABLE_MEMBERS = "MemberTable";

interface GraphTableRow {
  index: number;
  values: unknown[][];
}

/**
 * Teams（SharePoint）上のExcelファイルを Microsoft Graph API（アプリケーション権限 /
 * client credentials）で読み書きするストア。現場ユーザーのMicrosoftログインは不要。
 *
 * 必要な環境変数:
 *   AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET
 *   GRAPH_DRIVE_ID / GRAPH_ITEM_ID  （docs/inventory-app-Azure設定手順.md 参照）
 *
 * Excel側は import_master.py が生成する3テーブル
 * （MasterTable / RecordTable / MemberTable）を前提とする。
 */
export class GraphExcelStore implements InventoryStore {
  private token: { value: string; expiresAt: number } | null = null;

  private env(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`環境変数 ${name} が設定されていません（STORE_MODE=graph には必須）`);
    return v;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.value;
    }
    const tenant = this.env("AZURE_TENANT_ID");
    const res = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.env("AZURE_CLIENT_ID"),
          client_secret: this.env("AZURE_CLIENT_SECRET"),
          scope: "https://graph.microsoft.com/.default",
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Azure ADトークン取得に失敗 (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.token.value;
  }

  private workbookUrl(suffix: string): string {
    const driveId = this.env("GRAPH_DRIVE_ID");
    const itemId = this.env("GRAPH_ITEM_ID");
    return `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/workbook/${suffix}`;
  }

  private async graphFetch<T>(suffix: string, init?: RequestInit): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(this.workbookUrl(suffix), {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`Graph API エラー (${res.status} ${suffix}): ${await res.text()}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async tableRows(table: string): Promise<GraphTableRow[]> {
    const data = await this.graphFetch<{ value: GraphTableRow[] }>(
      `tables('${table}')/rows`,
    );
    return data.value;
  }

  async getMaster(): Promise<Item[]> {
    const rows = await this.tableRows(TABLE_MASTER);
    return rows
      .map((r) => rowToItem(r.values[0] ?? []))
      .filter((x): x is Item => x !== null);
  }

  async getMembers(): Promise<string[]> {
    const rows = await this.tableRows(TABLE_MEMBERS);
    return rows
      .map((r) => String(r.values[0]?.[0] ?? "").trim())
      .filter(Boolean);
  }

  async getRecords(): Promise<InventoryRecord[]> {
    const rows = await this.tableRows(TABLE_RECORDS);
    return rows
      .map((r) => rowToRecord(r.values[0] ?? []))
      .filter((x): x is InventoryRecord => x !== null);
  }

  async addRecord(input: RecordInput): Promise<InventoryRecord> {
    const record = buildRecord(input);
    await this.graphFetch(`tables('${TABLE_RECORDS}')/rows`, {
      method: "POST",
      body: JSON.stringify({ index: null, values: [recordToRow(record)] }),
    });
    return record;
  }

  async updateRecord(id: string, input: RecordInput): Promise<InventoryRecord> {
    const hit = await this.findRow(id);
    const record = buildRecord(input, hit.existing);
    await this.graphFetch(
      `tables('${TABLE_RECORDS}')/rows/itemAt(index=${hit.index})`,
      {
        method: "PATCH",
        body: JSON.stringify({ values: [recordToRow(record)] }),
      },
    );
    return record;
  }

  async deleteRecord(id: string): Promise<void> {
    const hit = await this.findRow(id);
    await this.graphFetch(
      `tables('${TABLE_RECORDS}')/rows/itemAt(index=${hit.index})`,
      { method: "DELETE" },
    );
  }

  /** テーブル内の行番号（0始まり）を記録IDから探す */
  private async findRow(
    id: string,
  ): Promise<{ index: number; existing: InventoryRecord }> {
    const rows = await this.tableRows(TABLE_RECORDS);
    for (const row of rows) {
      const rec = rowToRecord(row.values[0] ?? []);
      if (rec?.id === id) return { index: row.index, existing: rec };
    }
    throw new Error(`記録が見つかりません（既に削除された可能性があります）: ${id}`);
  }
}
