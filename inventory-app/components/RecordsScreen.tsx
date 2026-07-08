"use client";

import { useEffect, useMemo, useState } from "react";
import type { InventoryRecord } from "@/lib/types";
import Nav from "./Nav";
import RecordForm, { type FormMode } from "./RecordForm";
import { api, MEMBER_STORAGE_KEY } from "./client";

export default function RecordsScreen() {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [form, setForm] = useState<FormMode | null>(null);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, m] = await Promise.all([
          api<{ records: InventoryRecord[] }>("/api/records"),
          api<{ members: string[] }>("/api/members"),
        ]);
        if (cancelled) return;
        setRecords(r.records);
        setMembers(m.members);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  function handleReload() {
    setLoading(true);
    setLoadError("");
    setRefreshTick((t) => t + 1);
  }

  /** 月ごとにグループ化し、新しい順に並べる */
  const groups = useMemo(() => {
    const sorted = [...records].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt),
    );
    const map = new Map<string, InventoryRecord[]>();
    for (const r of sorted) {
      const key = r.month || "月不明";
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  function onSaved(record: InventoryRecord) {
    setForm(null);
    setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
    showToast("更新しました");
  }

  function onDeleted(id: string) {
    setForm(null);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showToast("削除しました");
  }

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">
            記録 <span className="font-bold text-gray-800">{records.length}</span> 件
          </p>
          <button
            type="button"
            onClick={handleReload}
            className="ml-auto rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            ↻ 最新を取得
          </button>
          <a
            href="/api/export"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
          >
            CSV出力
          </a>
        </div>

        {loading && <p className="p-6 text-center text-gray-400">読み込み中...</p>}
        {loadError && (
          <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
            {loadError}
          </p>
        )}
        {!loading && !loadError && records.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">
            まだ記録がありません。「入力」タブから登録してください。
          </p>
        )}

        {groups.map(([month, list]) => (
          <section key={month} className="mt-5">
            <h2 className="px-1 text-sm font-bold text-gray-500">
              {month}（{list.length}件）
            </h2>
            <ul className="mt-2 space-y-2">
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setForm({ kind: "edit", record: r })}
                    className="w-full rounded-xl bg-white p-3 text-left shadow-sm active:bg-blue-50"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold">{r.name}</p>
                      <p className="shrink-0 text-lg font-bold text-blue-700">
                        {r.quantity}
                        <span className="ml-0.5 text-xs font-semibold text-gray-500">
                          {r.unit}
                        </span>
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {r.recordedAt}　{r.member}
                      {r.partialQty ? `　(内 半端${r.partialQty}${r.unit})` : ""}
                      {r.expiredQty
                        ? `　⚠期限切れ${r.expiredQty}${r.unit}${r.expiredDate ? `(${r.expiredDate})` : ""}`
                        : ""}
                      {r.location ? `　📍${r.location}` : ""}
                      {r.expiryKind ? `　⚠${r.expiryKind}` : ""}
                      {r.expiryDate ? `(${r.expiryDate})` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {form && (
        <RecordForm
          mode={form}
          members={members}
          defaultMember={
            typeof window !== "undefined"
              ? (localStorage.getItem(MEMBER_STORAGE_KEY) ?? "")
              : ""
          }
          onClose={() => setForm(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-900/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
