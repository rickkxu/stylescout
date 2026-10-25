"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }) });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    }
    else {
      setError("That's not it. Try again.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs text-center">
        <h1 className="text-3xl font-semibold tracking-tight">StyleScout</h1>
        <p className="mt-2 text-sm text-muted">Enter your passcode</p>
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-6 w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-center text-lg tracking-widest outline-none focus:border-fg/40"
        />
        {error && <p className="mt-2 text-sm text-heart">{error}</p>}
        <button disabled={busy || !passcode} className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-semibold text-accent-fg disabled:opacity-40">
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
