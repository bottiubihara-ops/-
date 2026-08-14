"use client";

/** fetchラッパー。401なら /pin へ、その他エラーはメッセージ付き例外に */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    window.location.href = "/pin";
    throw new Error("PIN認証が必要です");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `通信エラー (${res.status})`);
  }
  return data;
}

/**
 * 検索用の文字列正規化。
 * NFKCで半角カナ→全角・全角英数→半角へ寄せ、ひらがな→カタカナ、小文字化。
 * 例: 「ふぃるたー」「ﾌｨﾙﾀｰ」「フィルター」がすべて一致する
 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[ぁ-ゖ]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60),
    )
    .toLowerCase()
    .replace(/\s+/g, "");
}

export const MEMBER_STORAGE_KEY = "inventory-app-member";

/** 現在の日本時間を "YYYY-MM-DD HH:mm" で返す（ダブルチェック日時などに使用） */
export function jstStamp(): string {
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
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}
