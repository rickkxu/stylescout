import "server-only";
import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Something went wrong";
  console.error(err);
  return NextResponse.json({ error: message }, { status });
}

export const REC_SELECT = "id, category, search_id, reason, status, created_at, product:products(*)";
