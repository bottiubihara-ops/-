"use client";

import { useEffect, useMemo, useState } from "react";
import type { InventoryRecord } from "@/lib/types";
import Nav from "./Nav";
import RecordForm, { type FormMode } from "./RecordForm";
import { api, MEMBER_STORAGE_KEY } from "./client";

/** 一覧の下部情報に使う小さなラベルチップ */
function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "amber" | "green";
}) {
  const tones = {
    gray: "bg-gray-100 text-gray-500",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
  } as const;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** チェック状態を色分けして表示するチップ */
function StatusChip({ status }: { status: string }) {
  const map: Record<string, { text: string; cls: string }> = {
    "1回目完了": { text: "1回目完了", cls: "bg-blue-100 text-blue-700" },
    "ダブルチェック完了": {
      text: "✓✓ ダブル完了",
      cls: "bg-emerald-600 text-white",
    },
  };
  const s = map[status] ?? { text: "未確認", cls: "bg-gray-200 text-gray-600" };
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>
      {s.text}
    </span>
  );
}

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

  /** チェック状態ごとの件数（進捗サマリ用） */
  const progress = useMemo(() => {
    let unchecked = 0;
    let first = 0;
    let done = 0;
    for (const r of records) {
      if (r.checkStatus === "ダブルチェック完了") done += 1;
      else if (r.checkStatus === "1回目完了") first += 1;
      else unchecked += 1;
    }
    return { unchecked, first, done };
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

        {records.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white p-2 text-center shadow-sm">
              <p className="text-lg font-bold text-gray-500">{progress.unchecked}</p>
              <p className="text-[11px] font-semibold text-gray-400">未確認</p>
            </div>
            <div className="rounded-xl bg-white p-2 text-center shadow-sm">
              <p className="text-lg font-bold text-blue-600">{progress.first}</p>
              <p className="text-[11px] font-semibold text-gray-400">1回目完了</p>
            </div>
            <div className="rounded-xl bg-white p-2 text-center shadow-sm">
              <p className="text-lg font-bold text-emerald-600">{progress.done}</p>
              <p className="text-[11px] font-semibold text-gray-400">ダブル済</p>
            </div>
          </div>
        )}

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
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusChip status={r.checkStatus} />
                      <Chip>🕐 {r.recordedAt}</Chip>
                      <Chip>👤 {r.member}</Chip>
                      {r.partialQty > 0 && (
                        <Chip>
                          半端 {r.partialQty}
                          {r.unit}
                        </Chip>
                      )}
                      {r.expiredQty > 0 && (
                        <Chip tone="amber">
                          ⚠ 期限切れ {r.expiredQty}
                          {r.unit}
                          {r.expiredDate ? `・${r.expiredDate}` : ""}
                        </Chip>
                      )}
                      {r.location && <Chip>📍 {r.location}</Chip>}
                      {r.expiryKind && (
                        <Chip tone="amber">
                          ⏳ {r.expiryKind}
                          {r.expiryDate ? `・${r.expiryDate}` : ""}
                        </Chip>
                      )}
                      {r.checkStatus === "ダブルチェック完了" && r.checker && (
                        <Chip tone="green">✓✓ {r.checker}</Chip>
                      )}
                    </div>
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
