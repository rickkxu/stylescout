"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

// Load JSON from an endpoint and keep polling while `shouldPoll` says work is in progress.
export function usePolling<T>(url: string, shouldPoll: (data: T) => boolean, intervalMs = 6000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef(shouldPoll);
  useEffect(() => {
    poll.current = shouldPoll;
  });

  const load = useCallback(async () => {
    try {
      const d = await api<T>(url);
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [url]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const tick = async () => {
      const d = await load();
      if (alive && d && poll.current(d)) timer = setTimeout(tick, intervalMs);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load, intervalMs]);

  return { data, setData, error, reload: load };
}
