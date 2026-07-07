"use client";

import { useEffect, useMemo, useState } from "react";
import type { InventoryRecord, Item } from "@/lib/types";
import Nav from "./Nav";
import RecordForm, { type FormMode } from "./RecordForm";
import { api, MEMBER_STORAGE_KEY, normalizeForSearch } from "./client";

export default function EntryScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [member, setMember] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");
  const [form, setForm] = useState<FormMode | null>(null);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, mem] = await Promise.all([
          api<{ items: Item[] }>("/api/master"),
          api<{ members: string[] }>("/api/members"),
        ]);
        setItems(m.items);
        setMembers(mem.members);
        const saved = localStorage.getItem(MEMBER_STORAGE_KEY) ?? "";
        if (saved && mem.members.includes(saved)) setMember(saved);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(
    () => ["すべて", ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    return items.filter(
      (i) =>
        (category === "すべて" || i.category === category) &&
        (q === "" ||
          normalizeForSearch(i.name).includes(q) ||
          i.code.includes(q.trim())),
    );
  }, [items, query, category]);

  function selectMember(name: string) {
    setMember(name);
    localStorage.setItem(MEMBER_STORAGE_KEY, name);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  function onSaved(record: InventoryRecord) {
    setForm(null);
    setQuery("");
    if (record.member) selectMember(record.member);
    showToast(`登録しました: ${record.name} ${record.quantity}${record.unit}`);
  }

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-4">
        {/* 入力者 */}
        <section className="rounded-xl bg-white p-3 shadow-sm">
          <label className="text-xs font-semibold text-gray-500">
            入力者（だれが数えていますか？）
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => selectMember(m)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  member === m
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {m}
              </button>
            ))}
            {!loading && members.length === 0 && (
              <p className="text-sm text-gray-400">
                Excelの「入力者」シートに名前を追加してください
              </p>
            )}
          </div>
        </section>

        {/* 検索 */}
        <section className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-blue-500 focus:outline-none"
            placeholder="🔍 品名・原料コードで検索"
          />
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${
                  category === c
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-600 shadow-sm"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* 品目リスト */}
        <section className="mt-3">
          {loading && <p className="p-4 text-center text-gray-400">読み込み中...</p>}
          {loadError && (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600">
              {loadError}
            </p>
          )}
          <ul className="space-y-2">
            {filtered.slice(0, 50).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setForm({ kind: "new", item })}
                  className="w-full rounded-xl bg-white p-3 text-left shadow-sm active:bg-blue-50"
                >
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {item.code ? `${item.code}　` : ""}
                    {item.category}　単位: {item.units.join("/")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-400">
              該当する品目がありません
            </p>
          )}
          {filtered.length > 50 && (
            <p className="p-2 text-center text-xs text-gray-400">
              他 {filtered.length - 50} 件 — 検索で絞り込んでください
            </p>
          )}
          <button
            type="button"
            onClick={() => setForm({ kind: "manual" })}
            className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-300 py-3 font-semibold text-gray-500 active:bg-gray-50"
          >
            ＋ マスタにない品目を手入力
          </button>
        </section>
      </main>

      {form && (
        <RecordForm
          mode={form}
          members={members}
          defaultMember={member}
          onClose={() => setForm(null)}
          onSaved={onSaved}
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
