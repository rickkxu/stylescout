import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { passcode } = await request.json().catch(() => ({}));
  if (!process.env.APP_PASSCODE || passcode !== process.env.APP_PASSCODE) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
