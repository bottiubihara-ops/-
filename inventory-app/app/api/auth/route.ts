import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken, verifyPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  if (typeof body.pin !== "string" || !verifyPin(body.pin)) {
    return NextResponse.json({ error: "PINが違います" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, authToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
  return res;
}
