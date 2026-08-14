"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setError("PINが違います");
        setPin("");
        return;
      }
      router.replace("/");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow"
      >
        <h1 className="text-center text-xl font-bold">📦 棚卸しアプリ</h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          共通PINコードを入力してください
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mt-6 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:border-blue-500 focus:outline-none"
          placeholder="••••"
          autoFocus
        />
        {error && (
          <p className="mt-3 text-center text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || pin.length === 0}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white disabled:opacity-40"
        >
          {busy ? "確認中..." : "ログイン"}
        </button>
      </form>
    </main>
  );
}
