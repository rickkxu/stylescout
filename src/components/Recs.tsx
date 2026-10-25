"use client";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { Recommendation, RecStatus } from "@/lib/types";
import { api, formatPrice, hostname } from "@/lib/client";
import { dislikeReasons } from "@/lib/categories";
import { Sheet } from "./Sheet";
import { VoiceInput } from "./VoiceInput";
import { useToast } from "./Toast";
import { BagIcon, ChatIcon, HeartIcon, ThumbDownIcon } from "./icons";

type FeedbackResult = { ok: boolean; feedbackId: string; learned: string | null };

export type RecActions = ReturnType<typeof useRecActions>;

// Feedback handling shared by every list of suggestions. Renders its own sheets via `sheets`.
export function useRecActions(setItems: Dispatch<SetStateAction<Recommendation[]>>) {
  const toast = useToast();
  const [detail, setDetail] = useState<Recommendation | null>(null);
  const [feedback, setFeedback] = useState<{ rec: Recommendation; mode: "dislike" | "comment"; feedbackId?: string } | null>(null);

  const setStatus = useCallback(
    (id: string, status: RecStatus) => setItems((items) => items.map((i) => (i.id === id ? { ...i, status } : i))),
    [setItems],
  );

  const send = useCallback(
    (body: Record<string, unknown>) => api<FeedbackResult>("/api/feedback", { method: "POST", json: body }),
    [],
  );

  const heart = useCallback(
    async (rec: Recommendation) => {
      const undo = rec.status === "hearted";
      setStatus(rec.id, undo ? "new" : "hearted");
      setDetail((d) => (d?.id === rec.id ? { ...d, status: undo ? "new" : "hearted" } : d));
      try {
        await send({ recommendationId: rec.id, kind: undo ? "undo" : "heart" });
        if (!undo) toast({ text: "Saved. I'll find more like this.", tone: "default" });
      } catch (e) {
        setStatus(rec.id, rec.status);
        toast({ text: (e as Error).message, tone: "error" });
      }
    },
    [send, setStatus, toast],
  );

  const dislike = useCallback(
    async (rec: Recommendation) => {
      setDetail(null);
      setStatus(rec.id, "disliked");
      setFeedback({ rec, mode: "dislike" });
      try {
        const res = await send({ recommendationId: rec.id, kind: "dislike" });
        setFeedback((f) => (f?.rec.id === rec.id ? { ...f, feedbackId: res.feedbackId } : f));
      } catch (e) {
        setStatus(rec.id, rec.status);
        setFeedback(null);
        toast({ text: (e as Error).message, tone: "error" });
      }
    },
    [send, setStatus, toast],
  );

  const undoDislike = useCallback(
    async (rec: Recommendation) => {
      setStatus(rec.id, "new");
      await send({ recommendationId: rec.id, kind: "undo" }).catch(() => {});
    },
    [send, setStatus],
  );

  const bought = useCallback(
    async (rec: Recommendation) => {
      setStatus(rec.id, "bought");
      setDetail((d) => (d?.id === rec.id ? { ...d, status: "bought" } : d));
      await send({ recommendationId: rec.id, kind: "bought" }).catch(() => {});
      toast({ text: "Nice pick! Noted as bought.", tone: "default" });
    },
    [send, setStatus, toast],
  );

  const comment = useCallback((rec: Recommendation) => {
    setDetail(null);
    setFeedback({ rec, mode: "comment" });
  }, []);

  const sheets = (
    <>
      <DetailSheet rec={detail} onClose={() => setDetail(null)} onHeart={heart} onDislike={dislike} onComment={comment} onBought={bought} />
      {feedback && (
        <FeedbackSheet
          key={feedback.rec.id + feedback.mode}
          rec={feedback.rec}
          mode={feedback.mode}
          onSubmit={async (reasons, text) => {
            const f = feedback;
            setFeedback(null);
            if (!reasons.length && !text) return;
            try {
              const res = await send(
                f.mode === "dislike" && f.feedbackId
                  ? { recommendationId: f.rec.id, feedbackId: f.feedbackId, reasons, comment: text }
                  : { recommendationId: f.rec.id, kind: "comment", comment: text },
              );
              toast(res.learned ? { text: res.learned, tone: "learned" } : { text: "Thanks, noted.", tone: "default" });
            } catch (e) {
              toast({ text: (e as Error).message, tone: "error" });
            }
          }}
          onUndo={
            feedback.mode === "dislike"
              ? () => {
                  undoDislike(feedback.rec);
                  setFeedback(null);
                }
              : undefined
          }
        />
      )}
    </>
  );

  return { heart, dislike, comment, bought, open: setDetail, sheets };
}

function ProductImage({ rec, className }: { rec: Recommendation; className?: string }) {
  const [failed, setFailed] = useState(false);
  const p = rec.product;
  if (!p.image_url || failed) {
    return (
      <div className={`flex items-center justify-center bg-surface-2 p-4 text-center text-sm text-muted ${className}`}>
        <span>
          <span className="block font-semibold text-fg">{p.brand ?? p.retailer}</span>
          {p.title}
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote store images from any domain
    <img
      src={p.image_url}
      alt={p.title}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`bg-surface-2 object-cover ${className}`}
    />
  );
}

export function ProductCard({ rec, actions, compact }: { rec: Recommendation; actions: RecActions; compact?: boolean }) {
  const p = rec.product;
  const hearted = rec.status === "hearted" || rec.status === "bought";
  return (
    <div className="group relative flex flex-col">
      <button onClick={() => actions.open(rec)} className="relative block overflow-hidden rounded-2xl text-left">
        <ProductImage rec={rec} className="aspect-[3/4] w-full transition duration-300 group-hover:scale-[1.02]" />
        {rec.status === "bought" && (
          <span className="absolute left-2 top-2 rounded-full bg-ok px-2 py-0.5 text-[11px] font-semibold text-white">Bought</span>
        )}
      </button>
      <div className="absolute right-2 top-2 flex flex-col gap-2">
        <button
          onClick={() => actions.heart(rec)}
          className={`flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur transition active:scale-90 ${
            hearted ? "bg-heart text-white" : "bg-white/90 text-neutral-900 hover:text-heart"
          }`}
          aria-label={hearted ? "Remove from saved" : "Love it"}
        >
          <HeartIcon filled={hearted} width={20} height={20} />
        </button>
        {!hearted && (
          <button
            onClick={() => actions.dislike(rec)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur transition hover:text-neutral-500 active:scale-90"
            aria-label="Not for me"
          >
            <ThumbDownIcon width={19} height={19} />
          </button>
        )}
      </div>
      <button onClick={() => actions.open(rec)} className="mt-2 block text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold">{p.brand ?? p.retailer}</span>
          <span className="shrink-0 text-[13px] font-semibold">{formatPrice(p.price, p.currency)}</span>
        </div>
        <div className="truncate text-[13px] text-muted">{p.title}</div>
        {!compact && rec.reason && <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-fg/80">{rec.reason}</p>}
      </button>
    </div>
  );
}

function DetailSheet({
  rec,
  onClose,
  onHeart,
  onDislike,
  onComment,
  onBought,
}: {
  rec: Recommendation | null;
  onClose: () => void;
  onHeart: (r: Recommendation) => void;
  onDislike: (r: Recommendation) => void;
  onComment: (r: Recommendation) => void;
  onBought: (r: Recommendation) => void;
}) {
  if (!rec) return null;
  const p = rec.product;
  const hearted = rec.status === "hearted" || rec.status === "bought";
  return (
    <Sheet open onClose={onClose} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <ProductImage rec={rec} className="mx-auto aspect-[3/4] max-h-[42dvh] w-auto rounded-2xl md:max-h-none md:w-full" />
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-muted">{p.brand ?? p.retailer}</div>
          <h3 className="mt-0.5 text-xl font-semibold leading-tight">{p.title}</h3>
          <div className="mt-2 text-lg font-semibold">{formatPrice(p.price, p.currency)}</div>
          <div className="text-xs text-muted">at {p.retailer ?? hostname(p.url)}</div>
          {rec.reason && (
            <div className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed">
              <span className="font-semibold">Why this: </span>
              {rec.reason}
            </div>
          )}
          {p.description && <p className="mt-3 text-sm leading-relaxed text-muted">{p.description}</p>}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              onClick={() => onHeart(rec)}
              className={`flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-medium ${
                hearted ? "border-heart bg-heart text-white" : "border-line hover:border-fg/30"
              }`}
            >
              <HeartIcon filled={hearted} width={20} height={20} />
              {hearted ? "Saved" : "Love it"}
            </button>
            <button onClick={() => onDislike(rec)} className="flex flex-col items-center gap-1 rounded-2xl border border-line py-3 text-xs font-medium hover:border-fg/30">
              <ThumbDownIcon width={20} height={20} />
              Not for me
            </button>
            <button onClick={() => onComment(rec)} className="flex flex-col items-center gap-1 rounded-2xl border border-line py-3 text-xs font-medium hover:border-fg/30">
              <ChatIcon width={20} height={20} />
              Tell me more
            </button>
          </div>

          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[15px] font-semibold text-accent-fg"
          >
            <BagIcon width={19} height={19} />
            View at {p.retailer ?? hostname(p.url)}
          </a>
          {rec.status !== "bought" && (
            <button onClick={() => onBought(rec)} className="mt-2 py-2 text-sm text-muted underline-offset-2 hover:underline">
              I bought this
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function FeedbackSheet({
  rec,
  mode,
  onSubmit,
  onUndo,
}: {
  rec: Recommendation;
  mode: "dislike" | "comment";
  onSubmit: (reasons: string[], comment: string) => void;
  onUndo?: () => void;
}) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [text, setText] = useState("");
  const p = rec.product;
  const toggle = (r: string) => setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

  return (
    <Sheet open onClose={() => onSubmit(reasons, text.trim())} title={mode === "dislike" ? "What's off?" : "What do you think?"}>
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2">
        <ProductImage rec={rec} className="h-16 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 text-sm">
          <div className="truncate font-semibold">{p.brand ?? p.retailer}</div>
          <div className="truncate text-muted">{p.title}</div>
        </div>
      </div>

      {mode === "dislike" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dislikeReasons(rec.category).map((r) => (
            <button
              key={r}
              onClick={() => toggle(r)}
              className={`rounded-full border px-3.5 py-2 text-sm transition ${
                reasons.includes(r) ? "border-fg bg-fg text-bg" : "border-line hover:border-fg/40"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <VoiceInput
          value={text}
          onChange={setText}
          rows={mode === "comment" ? 4 : 2}
          autoFocus={mode === "comment"}
          placeholder={mode === "dislike" ? "Anything else? (optional)" : "Love the fabric but the collar's too wide…"}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        {onUndo && (
          <button onClick={onUndo} className="rounded-full px-4 py-3 text-sm text-muted hover:bg-surface-2">
            Undo
          </button>
        )}
        <button
          onClick={() => onSubmit(reasons, text.trim())}
          className="flex-1 rounded-full bg-accent py-3 text-[15px] font-semibold text-accent-fg disabled:opacity-40"
          disabled={mode === "comment" && !text.trim()}
        >
          {mode === "dislike" && !reasons.length && !text.trim() ? "Skip" : "Send"}
        </button>
      </div>
    </Sheet>
  );
}

export function CardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[3/4] w-full rounded-2xl" />
      <div className="skeleton mt-2 h-3 w-2/3 rounded" />
      <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
    </div>
  );
}
