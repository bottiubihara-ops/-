"use client";

import { useState } from "react";
import type { InventoryRecord, Item, RecordInput } from "@/lib/types";
import { CATEGORIES, EXPIRY_KINDS, expiryKindFor } from "@/lib/types";
import { api, jstStamp } from "./client";

export type FormMode =
  | { kind: "new"; item: Item } // マスタから選択して新規登録
  | { kind: "manual" } // マスタにない品目を手入力で新規登録
  | { kind: "edit"; record: InventoryRecord }; // 既存記録の編集

interface Props {
  mode: FormMode;
  members: string[];
  /** 新規登録時に初期選択する入力者 */
  defaultMember: string;
  onClose: () => void;
  onSaved: (record: InventoryRecord, isEdit: boolean) => void;
  onDeleted?: (id: string) => void;
}

const UNIT_SUGGESTIONS = ["kg", "箱", "本", "個", "袋", "L"];

export default function RecordForm({
  mode,
  members,
  defaultMember,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const item = mode.kind === "new" ? mode.item : null;
  const record = mode.kind === "edit" ? mode.record : null;

  const [name, setName] = useState(record?.name ?? item?.name ?? "");
  const [category, setCategory] = useState(
    record?.category ?? item?.category ?? "その他",
  );
  // 数量は半端を含んだ合計をそのまま入力・表示する（期限切れ分は含めない）
  const [quantity, setQuantity] = useState(
    record ? String(record.quantity) : "",
  );
  const [partialQty, setPartialQty] = useState(
    record && record.partialQty ? String(record.partialQty) : "",
  );
  const [expiredQty, setExpiredQty] = useState(
    record && record.expiredQty ? String(record.expiredQty) : "",
  );
  const [expiredDate, setExpiredDate] = useState(record?.expiredDate ?? "");
  const [unit, setUnit] = useState(record?.unit ?? item?.units[0] ?? "個");
  const [location, setLocation] = useState(record?.location ?? "");
  const [expiryDate, setExpiryDate] = useState(record?.expiryDate ?? "");
  const [expiryKind, setExpiryKind] = useState(record?.expiryKind ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [member, setMember] = useState(record?.member ?? defaultMember);
  // チェック状態: 新規は「1回目完了」（登録＝1回目カウント済み）を既定にする
  const [checkStatus, setCheckStatus] = useState(
    record ? record.checkStatus : "1回目完了",
  );
  const [checker, setChecker] = useState(record?.checker ?? "");
  const [checkedAt, setCheckedAt] = useState(record?.checkedAt ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const unitOptions = item && item.units.length > 1 ? item.units : null;
  // 半端量欄は副原料のみ表示（数量のうち端数分が何kgかのメモ）
  const showPartial = category === "副原料";
  // 期限切れ別枠は原料豆・副原料で表示（数量には含めない・紙棚卸表と同じ運用）
  const showExpired = category === "原料豆" || category === "副原料";

  function onExpiryDateChange(value: string) {
    setExpiryDate(value);
    setExpiryKind(expiryKindFor(value));
  }

  /** チェック状態を切り替える。ダブルチェック完了時は実施者と日時を記録する */
  function setStatus(next: string) {
    setCheckStatus(next);
    if (next === "ダブルチェック完了") {
      setChecker(defaultMember || member);
      setCheckedAt(jstStamp());
    } else {
      setChecker("");
      setCheckedAt("");
    }
  }

  function step(delta: number) {
    const cur = parseFloat(quantity);
    const next = (Number.isFinite(cur) ? cur : 0) + delta;
    setQuantity(String(Math.max(0, Math.round(next * 1000) / 1000)));
  }

  async function submit() {
    const q = parseFloat(quantity);
    if (!name.trim()) return setError("品名を入力してください");
    if (!member) return setError("入力者を選択してください");
    if (!Number.isFinite(q) || q < 0)
      return setError("数量には0以上の数値を入力してください");
    const partial = showPartial ? parseFloat(partialQty) || 0 : 0;
    if (partial < 0 || partial > q)
      return setError("半端量は0以上・数量（合計）以下で入力してください");
    const expired = showExpired ? parseFloat(expiredQty) || 0 : 0;
    if (expired < 0)
      return setError("期限切れ量には0以上の数値を入力してください");
    const input: RecordInput = {
      code: record?.code ?? item?.code ?? "",
      name: name.trim(),
      category,
      quantity: q,
      unit,
      partialQty: partial,
      expiredQty: expired,
      expiredDate: showExpired ? expiredDate : "",
      location: location.trim(),
      expiryDate,
      expiryKind,
      member,
      checkStatus,
      checker,
      checkedAt,
      note: note.trim(),
    };
    setBusy(true);
    setError("");
    try {
      if (record) {
        const data = await api<{ record: InventoryRecord }>(
          `/api/records/${record.id}`,
          { method: "PATCH", body: JSON.stringify(input) },
        );
        onSaved(data.record, true);
      } else {
        const data = await api<{ record: InventoryRecord }>("/api/records", {
          method: "POST",
          body: JSON.stringify(input),
        });
        onSaved(data.record, false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!record || !onDeleted) return;
    if (!window.confirm(`「${record.name}」の記録を削除しますか？`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/records/${record.id}`, { method: "DELETE" });
      onDeleted(record.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
      setBusy(false);
    }
  }

  const label = "block text-xs font-semibold text-gray-500";
  const field =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 pb-8 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold">
            {mode.kind === "edit"
              ? "記録を編集"
              : mode.kind === "manual"
                ? "手入力で登録"
                : "数量を入力"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-2xl leading-none text-gray-400"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {/* 品名・カテゴリ: マスタ選択時は表示のみ、手入力/編集時は編集可 */}
          {item ? (
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="font-bold">{item.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                {item.code ? `コード: ${item.code}　` : ""}
                {item.category}
                {item.note ? `　${item.note}` : ""}
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={label}>品名 *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={field}
                  placeholder="品名を入力"
                />
              </div>
              <div className="w-32">
                <label className={label}>カテゴリ</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={field}
                >
                  {(CATEGORIES.includes(
                    category as (typeof CATEGORIES)[number],
                  )
                    ? [...CATEGORIES]
                    : [category, ...CATEGORIES]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 数量 + 単位 */}
          <div>
            <label className={label}>数量 *</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                className="h-12 w-14 rounded-xl bg-gray-100 text-2xl font-bold text-gray-600 active:bg-gray-200"
              >
                −
              </button>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="decimal"
                className="h-12 flex-1 rounded-xl border border-gray-300 text-center text-2xl font-bold focus:border-blue-500 focus:outline-none"
                placeholder="0"
                autoFocus={mode.kind === "new"}
              />
              <button
                type="button"
                onClick={() => step(1)}
                className="h-12 w-14 rounded-xl bg-gray-100 text-2xl font-bold text-gray-600 active:bg-gray-200"
              >
                ＋
              </button>
              {unitOptions ? (
                <div className="flex flex-col gap-1">
                  {unitOptions.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                        unit === u
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              ) : item ? (
                <span className="w-12 text-center font-semibold text-gray-600">
                  {unit}
                </span>
              ) : (
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  list="unit-suggestions"
                  className="h-12 w-20 rounded-xl border border-gray-300 text-center focus:border-blue-500 focus:outline-none"
                />
              )}
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 半端量（副原料のみ）: 数量（合計）のうち端数分が何kgかをメモする */}
          {showPartial && (
            <div className="rounded-xl bg-gray-50 p-3">
              <label className={label}>
                半端量（任意・上の数量のうち端数分）
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={partialQty}
                  onChange={(e) => setPartialQty(e.target.value)}
                  inputMode="decimal"
                  className="h-11 w-32 rounded-xl border border-gray-300 bg-white text-center text-lg font-bold focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                />
                <span className="text-sm font-semibold text-gray-500">
                  {unit}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  数量{quantity || 0}
                  {unit}のうち半端が何{unit}か
                </span>
              </div>
            </div>
          )}

          {/* 期限切れ別枠（原料豆・副原料）: 数量には含めず、量と期限日を別に記録する */}
          {showExpired && (
            <div className="rounded-xl bg-amber-50 p-3">
              <label className={label}>
                期限切れ分（任意・上の数量には含めない）
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={expiredQty}
                  onChange={(e) => setExpiredQty(e.target.value)}
                  inputMode="decimal"
                  className="h-11 w-28 rounded-xl border border-gray-300 bg-white text-center text-lg font-bold focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                />
                <span className="text-sm font-semibold text-gray-500">
                  {unit}
                </span>
                <input
                  type="date"
                  value={expiredDate}
                  onChange={(e) => setExpiredDate(e.target.value)}
                  aria-label="期限切れ日"
                  className="h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 保管場所・期限 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={label}>保管場所（任意）</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={field}
                placeholder="例: 2F資材庫"
              />
            </div>
            <div className="w-36">
              <label className={label}>期限区分（自動・変更可）</label>
              <select
                value={expiryKind}
                onChange={(e) => setExpiryKind(e.target.value)}
                className={field}
              >
                <option value="">なし</option>
                {EXPIRY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={label}>期限日（任意）</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => onExpiryDateChange(e.target.value)}
                className={field}
              />
            </div>
            <div className="flex-1">
              <label className={label}>入力者 *</label>
              <select
                value={member}
                onChange={(e) => setMember(e.target.value)}
                className={field}
              >
                <option value="">選択してください</option>
                {members.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>備考（任意）</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={field}
              placeholder="メモ"
            />
          </div>

          {/* チェック状態: 未確認 → 1回目完了 → ダブルチェック完了 */}
          <div className="rounded-xl bg-gray-50 p-3">
            <label className={label}>棚卸しチェック</label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                { value: "", text: "未確認", on: "bg-gray-500" },
                { value: "1回目完了", text: "1回目完了", on: "bg-blue-600" },
                {
                  value: "ダブルチェック完了",
                  text: "ダブル完了",
                  on: "bg-emerald-600",
                },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`rounded-lg py-2.5 text-sm font-bold ${
                    checkStatus === s.value
                      ? `${s.on} text-white`
                      : "bg-white text-gray-500 shadow-sm"
                  }`}
                >
                  {s.text}
                </button>
              ))}
            </div>
            {checkStatus === "ダブルチェック完了" && checker && (
              <p className="mt-2 text-xs text-emerald-700">
                ✓✓ {checker}
                {checkedAt ? `（${checkedAt}）` : ""} が確認済み
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-lg font-bold text-white disabled:opacity-40"
          >
            {busy ? "保存中..." : mode.kind === "edit" ? "更新する" : "登録する"}
          </button>
          {mode.kind === "edit" && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="w-full rounded-xl border border-red-300 py-3 font-bold text-red-600 disabled:opacity-40"
            >
              この記録を削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
