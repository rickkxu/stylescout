export const SESSION_COOKIE = "ss_session";

// The session cookie holds a hash of the passcode and secret, so changing either logs you out.
export async function sessionToken(): Promise<string> {
  const passcode = process.env.APP_PASSCODE ?? "";
  const secret = process.env.SESSION_SECRET ?? "stylescout";
  const data = new TextEncoder().encode(`${passcode}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
