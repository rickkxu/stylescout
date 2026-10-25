"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { ClosetItem, Preference, Profile, Sizes } from "@/lib/types";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { Page } from "@/components/Page";
import { VoiceInput } from "@/components/VoiceInput";
import { ClosetUploader } from "@/components/ClosetUploader";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { CloseIcon, PencilIcon, TrashIcon } from "@/components/icons";

const SOURCE: Record<Preference["source"], string> = {
  told: "You told me",
  onboarding: "From setup",
  feedback: "From your feedback",
  closet: "From your closet",
};
const POLARITY: Record<Preference["polarity"], { label: string; cls: string }> = {
  like: { label: "Likes", cls: "bg-ok/15 text-ok" },
  avoid: { label: "Avoid", cls: "bg-heart/15 text-heart" },
  fact: { label: "Fact", cls: "bg-surface-2 text-muted" },
};

const inputCls = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-fg/40";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const toast = useToast();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Preference[] | null>(null);
  const [closet, setCloset] = useState<ClosetItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tell, setTell] = useState("");
  const [telling, setTelling] = useState(false);
  const [openItem, setOpenItem] = useState<ClosetItem | null>(null);

  useEffect(() => {
    api<Preference[]>("/api/preferences").then(setPrefs).catch(() => setPrefs([]));
    api<ClosetItem[]>("/api/closet").then(setCloset).catch(() => {});
    api<Profile>("/api/profile").then(setProfile).catch(() => {});
  }, []);

  const sendTell = async () => {
    setTelling(true);
    try {
      const res = await api<{ summary: string; preferences: Preference[] }>("/api/preferences", { method: "POST", json: { text: tell } });
      setPrefs(res.preferences);
      setTell("");
      toast({ text: res.summary || "Got it.", tone: "learned" });
    } catch (e) {
      toast({ text: (e as Error).message, tone: "error" });
    } finally {
      setTelling(false);
    }
  };

  const grouped = [{ slug: null as string | null, label: "General" }, ...CATEGORIES.map((c) => ({ slug: c.slug as string | null, label: c.label }))]
    .map((g) => ({ ...g, items: (prefs ?? []).filter((p) => p.category === g.slug) }))
    .filter((g) => g.items.length);

  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <Section title="Tell me about your style" subtitle="Anything you've figured out about what works for you. Type or speak.">
        <VoiceInput
          value={tell}
          onChange={setTell}
          onSubmit={sendTell}
          busy={telling}
          submitLabel="Teach me"
          placeholder="I've realized I hate pleated pants, and I want more shirts I can wear untucked…"
        />
      </Section>

      <Section title="What I know about you" subtitle="This is what I use to pick clothes. Edit or remove anything that's wrong.">
        {prefs === null && <div className="skeleton h-24 rounded-2xl" />}
        {prefs?.length === 0 && <p className="text-sm text-muted">Nothing yet. Tell me something above, or react to a few suggestions.</p>}
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g.label}</h3>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {g.items.map((p) => (
                  <PreferenceRow
                    key={p.id}
                    pref={p}
                    onSave={async (text) => setPrefs(await api<Preference[]>("/api/preferences", { method: "PATCH", json: { id: p.id, text } }))}
                    onDelete={async () => {
                      setPrefs((ps) => ps?.filter((x) => x.id !== p.id) ?? null);
                      await api(`/api/preferences?id=${p.id}`, { method: "DELETE" });
                    }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Your closet" subtitle="Clothes you own and love. Tap one to add a note about why.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <ClosetUploader onAdded={(item) => setCloset((c) => [item, ...c])} />
          {closet.map((c) => (
            <button key={c.id} onClick={() => setOpenItem(c)} className="text-left">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              <img src={c.image_url} alt={c.name ?? ""} className="aspect-[3/4] w-full rounded-2xl bg-surface-2 object-cover" />
              <p className="mt-1 truncate text-xs text-muted">{c.name}</p>
            </button>
          ))}
        </div>
      </Section>

      {profile && <BasicsForm profile={profile} onSaved={setProfile} />}

      <button
        onClick={async () => {
          await api("/api/logout", { method: "POST" });
          router.replace("/login");
        }}
        className="mt-12 text-sm text-muted underline-offset-2 hover:underline"
      >
        Log out
      </button>

      {openItem && (
        <ClosetSheet
          item={openItem}
          onClose={() => setOpenItem(null)}
          onChange={(item) => setCloset((cs) => cs.map((c) => (c.id === item.id ? item : c)))}
          onDelete={() => {
            setCloset((cs) => cs.filter((c) => c.id !== openItem.id));
            setOpenItem(null);
            api(`/api/closet?id=${openItem.id}`, { method: "DELETE" }).catch(() => {});
          }}
        />
      )}
    </Page>
  );
}

function PreferenceRow({ pref, onSave, onDelete }: { pref: Preference; onSave: (text: string) => Promise<void>; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(pref.text);
  const tag = POLARITY[pref.polarity];

  if (editing) {
    return (
      <li className="flex items-center gap-2 p-2.5">
        <input className={inputCls} value={text} autoFocus onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (onSave(text), setEditing(false))} />
        <button
          onClick={() => {
            onSave(text);
            setEditing(false);
          }}
          className="rounded-xl bg-accent px-3.5 py-2.5 text-sm font-medium text-accent-fg"
        >
          Save
        </button>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={`mt-0.5 w-12 shrink-0 rounded-md py-0.5 text-center text-[11px] font-semibold ${tag.cls}`}>{tag.label}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug">{pref.text}</p>
        <p className="mt-0.5 text-xs text-muted">{SOURCE[pref.source]}</p>
      </div>
      <button onClick={() => setEditing(true)} className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit">
        <PencilIcon width={16} height={16} />
      </button>
      <button onClick={onDelete} className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-heart" aria-label="Remove">
        <TrashIcon width={16} height={16} />
      </button>
    </li>
  );
}

function ClosetSheet({ item, onClose, onChange, onDelete }: { item: ClosetItem; onClose: () => void; onChange: (i: ClosetItem) => void; onDelete: () => void }) {
  const [note, setNote] = useState(item.note ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const attrs = Object.entries(item.attributes ?? {}).filter(([, v]) => v);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/closet", { method: "PATCH", json: { id: item.id, note } });
      // Notes about why you love something are worth learning from.
      if (note.trim()) {
        const res = await api<{ summary: string }>("/api/preferences", {
          method: "POST",
          json: { text: `About a ${item.name} I own and love (${item.summary}): ${note}` },
        });
        if (res.summary) toast({ text: res.summary, tone: "learned" });
      }
      onChange({ ...item, note });
      onClose();
    } catch (e) {
      toast({ text: (e as Error).message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={item.name ?? "Closet item"} wide>
      <div className="grid gap-5 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img src={item.image_url} alt="" className="aspect-[3/4] w-full rounded-2xl bg-surface-2 object-cover" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{categoryLabel(item.category ?? "")}</p>
          {item.summary && <p className="mt-1 text-[15px] leading-relaxed">{item.summary}</p>}
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {attrs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="capitalize text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mb-2 mt-5 text-sm font-medium">What do you love about it?</p>
          <VoiceInput value={note} onChange={setNote} rows={3} placeholder="The length hits right at my belt…" />
          <div className="mt-4 flex gap-2">
            <button onClick={onDelete} className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-3 text-sm text-muted hover:text-heart">
              <TrashIcon width={16} height={16} /> Remove
            </button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function BasicsForm({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const toast = useToast();
  const [height, setHeight] = useState(profile.height ?? "");
  const [build, setBuild] = useState(profile.build ?? "");
  const [sizes, setSizes] = useState<Sizes>(profile.sizes ?? {});
  const [min, setMin] = useState(profile.budget_min?.toString() ?? "");
  const [max, setMax] = useState(profile.budget_max?.toString() ?? "");
  const [blocked, setBlocked] = useState<string[]>(profile.blocked_stores ?? []);
  const [newBlock, setNewBlock] = useState("");
  const [saving, setSaving] = useState(false);
  const setSize = (k: keyof Sizes, v: string) => setSizes((s) => ({ ...s, [k]: v }));

  const save = async (override?: Partial<Profile>) => {
    setSaving(true);
    try {
      const p = await api<Profile>("/api/profile", {
        method: "PUT",
        json: {
          height: height || null,
          build: build || null,
          sizes,
          budget_min: min ? Number(min) : null,
          budget_max: max ? Number(max) : null,
          blocked_stores: blocked,
          ...override,
        },
      });
      onSaved(p);
      toast({ text: "Saved", tone: "default" });
    } catch (e) {
      toast({ text: (e as Error).message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const addBlock = () => {
    const host = newBlock.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (!host || blocked.includes(host)) return;
    const next = [...blocked, host];
    setBlocked(next);
    setNewBlock("");
    save({ blocked_stores: next });
  };

  return (
    <>
      <Section title="Basics">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ["Height", height, setHeight],
              ["Build", build, setBuild],
            ] as const
          ).map(([label, v, set]) => (
            <label key={label} className="col-span-2 block text-sm md:col-span-2">
              <span className="text-muted">{label}</span>
              <input className={`${inputCls} mt-1`} value={v} onChange={(e) => set(e.target.value)} />
            </label>
          ))}
          {(["tops", "waist", "inseam", "shoes"] as const).map((k) => (
            <label key={k} className="block text-sm">
              <span className="capitalize text-muted">{k}</span>
              <input className={`${inputCls} mt-1`} value={sizes[k] ?? ""} onChange={(e) => setSize(k, e.target.value)} />
            </label>
          ))}
          <label className="col-span-2 block text-sm md:col-span-4">
            <span className="text-muted">Other sizing notes</span>
            <input className={`${inputCls} mt-1`} value={sizes.other ?? ""} onChange={(e) => setSize("other", e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Budget min ($)</span>
            <input className={`${inputCls} mt-1`} inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Budget max ($)</span>
            <input className={`${inputCls} mt-1`} inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
          </label>
        </div>
        <button onClick={() => save()} disabled={saving} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-50">
          {saving ? "Saving…" : "Save basics"}
        </button>
      </Section>

      <Section title="Blocked stores" subtitle="I'll never suggest anything from these. Resale sites like eBay, Poshmark and Depop are always blocked.">
        <div className="flex flex-wrap gap-2">
          {blocked.map((b) => (
            <span key={b} className="flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-sm">
              {b}
              <button
                onClick={() => {
                  const next = blocked.filter((x) => x !== b);
                  setBlocked(next);
                  save({ blocked_stores: next });
                }}
                className="rounded-full p-1 text-muted hover:text-fg"
                aria-label={`Unblock ${b}`}
              >
                <CloseIcon width={14} height={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex max-w-sm gap-2">
          <input className={inputCls} placeholder="store.com" value={newBlock} onChange={(e) => setNewBlock(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBlock()} />
          <button onClick={addBlock} className="rounded-xl border border-line px-4 text-sm font-medium">
            Block
          </button>
        </div>
      </Section>
    </>
  );
}
