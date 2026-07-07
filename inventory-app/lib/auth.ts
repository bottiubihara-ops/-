import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export const AUTH_COOKIE = "inv_auth";

function appPin(): string {
  // 本番（Vercel）では必ず環境変数 APP_PIN を設定すること。既定値は開発用。
  return process.env.APP_PIN ?? "1234";
}

/** PINから導出する固定トークン。PINを変更すると全端末が再ログインになる */
export function authToken(): string {
  return createHash("sha256").update(`${appPin()}:inventory-app-v1`).digest("hex");
}

export function verifyPin(pin: string): boolean {
  return pin === appPin();
}

/** APIルート用: 認証済みかどうか */
export function isAuthedRequest(req: NextRequest): boolean {
  return req.cookies.get(AUTH_COOKIE)?.value === authToken();
}

/** ページ(サーバーコンポーネント)用: 未認証なら /pin へリダイレクト */
export async function requireAuthPage(): Promise<void> {
  const store = await cookies();
  if (store.get(AUTH_COOKIE)?.value !== authToken()) {
    redirect("/pin");
  }
}
