import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  // No passcode configured: the app is open (useful for local development).
  if (!process.env.APP_PASSCODE) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken())) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
