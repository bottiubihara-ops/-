import path from "node:path";
import { copyFile, access } from "node:fs/promises";
import ExcelJS from "exceljs";
import type { InventoryRecord, Item, RecordInput } from "@/lib/types";
import type { InventoryStore } from "./index";
import { buildRecord, recordToRow, rowToItem, rowToRecord } from "./shared";

const SHEET_MASTER = "品目マスタ";
const SHEET_RECORDS = "棚卸し記録";
const SHEET_MEMBERS = "入力者";

const SEED_PATH = path.join(process.cwd(), "data", "inventory.xlsx");
const WORK_PATH =
  process.env.LOCAL_XLSX_PATH ??
  path.join(process.cwd(), "data", "inventory.local.xlsx");

/**
 * ローカルのExcelファイルを共有DB代わりに使うストア（開発・デモ用）。
 * 初回アクセス時に data/inventory.xlsx（コミット済みseed）を
 * data/inventory.local.xlsx（gitignore対象）へコピーして、そちらを読み書きする。
 * 注意: Vercel等のサーバーレス環境ではファイルシステムが永続しないため、
 * 本番は STORE_MODE=graph を使うこと。
 */
export class LocalExcelStore implements InventoryStore {
  /** 読み書きを直列化するためのキュー（同時アクセスは要件外だが自衛として） */
  private queue: Promise<unknown> = Promise.resolve();

  private run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => {});
    return next;
  }

  private async load(): Promise<ExcelJS.Workbook> {
    try {
      await access(WORK_PATH);
    } catch {
      await copyFile(SEED_PATH, WORK_PATH);
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(WORK_PATH);
    return wb;
  }

  private sheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
    const ws = wb.getWorksheet(name);
    if (!ws) throw new Error(`シート「${name}」が見つかりません: ${WORK_PATH}`);
    return ws;
  }

  /** 1始まりの行番号つきで全データ行の値配列を返す（ヘッダー行を除く） */
  private dataRows(ws: ExcelJS.Worksheet): { rowNumber: number; vals: unknown[] }[] {
    const out: { rowNumber: number; vals: unknown[] }[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const raw = row.values;
      // exceljsのrow.valuesは先頭に空要素が入る1始まりの配列
      const vals = Array.isArray(raw) ? raw.slice(1) : [];
      out.push({ rowNumber, vals });
    });
    return out;
  }

  getMaster(): Promise<Item[]> {
    return this.run(async () => {
      const wb = await this.load();
      return this.dataRows(this.sheet(wb, SHEET_MASTER))
        .map(({ vals }) => rowToItem(vals))
        .filter((x): x is Item => x !== null);
    });
  }

  getMembers(): Promise<string[]> {
    return this.run(async () => {
      const wb = await this.load();
      return this.dataRows(this.sheet(wb, SHEET_MEMBERS))
        .map(({ vals }) => String(vals[0] ?? "").trim())
        .filter(Boolean);
    });
  }

  getRecords(): Promise<InventoryRecord[]> {
    return this.run(async () => {
      const wb = await this.load();
      return this.dataRows(this.sheet(wb, SHEET_RECORDS))
        .map(({ vals }) => rowToRecord(vals))
        .filter((x): x is InventoryRecord => x !== null);
    });
  }

  addRecord(input: RecordInput): Promise<InventoryRecord> {
    return this.run(async () => {
      const wb = await this.load();
      const ws = this.sheet(wb, SHEET_RECORDS);
      const record = buildRecord(input);
      const rows = this.dataRows(ws);
      const last = rows.filter(({ vals }) => rowToRecord(vals) !== null).at(-1);
      ws.getRow((last?.rowNumber ?? 1) + 1).values = recordToRow(record);
      await wb.xlsx.writeFile(WORK_PATH);
      return record;
    });
  }

  updateRecord(id: string, input: RecordInput): Promise<InventoryRecord> {
    return this.run(async () => {
      const wb = await this.load();
      const ws = this.sheet(wb, SHEET_RECORDS);
      const hit = this.findRow(ws, id);
      const record = buildRecord(input, hit.existing);
      ws.getRow(hit.rowNumber).values = recordToRow(record);
      await wb.xlsx.writeFile(WORK_PATH);
      return record;
    });
  }

  deleteRecord(id: string): Promise<void> {
    return this.run(async () => {
      const wb = await this.load();
      const ws = this.sheet(wb, SHEET_RECORDS);
      const hit = this.findRow(ws, id);
      ws.spliceRows(hit.rowNumber, 1);
      await wb.xlsx.writeFile(WORK_PATH);
    });
  }

  private findRow(
    ws: ExcelJS.Worksheet,
    id: string,
  ): { rowNumber: number; existing: InventoryRecord } {
    for (const { rowNumber, vals } of this.dataRows(ws)) {
      const rec = rowToRecord(vals);
      if (rec?.id === id) return { rowNumber, existing: rec };
    }
    throw new Error(`記録が見つかりません（既に削除された可能性があります）: ${id}`);
  }
}
