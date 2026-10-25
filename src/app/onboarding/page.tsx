"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { ClosetItem, Profile, Sizes } from "@/lib/types";
import { VoiceInput } from "@/components/VoiceInput";
import { ClosetUploader } from "@/components/ClosetUploader";
import { useToast } from "@/components/Toast";

const STEPS = ["You", "Sizes & budget", "Clothes you love", "Your style"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] outline-none focus:border-fg/40";

export default function Onboarding() {
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState("Menswear");
  const [height, setHeight] = useState("");
  const [build, setBuild] = useState("");
  const [sizes, setSizes] = useState<Sizes>({});
  const [budgetMin, setBudgetMin] = useState("20");
  const [budgetMax, setBudgetMax] = useState("150");
  const [closet, setCloset] = useState<ClosetItem[]>([]);
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);

  // Pick up anything already entered (e.g. returning to onboarding).
  useEffect(() => {
    api<Profile>("/api/profile")
      .then((p) => {
        if (p.gender) setGender(p.gender);
        if (p.height) setHeight(p.height);
        if (p.build) setBuild(p.build);
        if (p.sizes) setSizes(p.sizes);
        if (p.budget_min != null) setBudgetMin(String(p.budget_min));
        if (p.budget_max != null) setBudgetMax(String(p.budget_max));
      })
      .catch(() => {});
    api<ClosetItem[]>("/api/closet").then(setCloset).catch(() => {});
  }, []);

  const finish = async () => {
    setBusy(true);
    try {
      await api("/api/onboarding", {
        method: "POST",
        json: {
          gender,
          height,
          build,
          sizes,
          budget_min: budgetMin ? Number(budgetMin) : null,
          budget_max: budgetMax ? Number(budgetMax) : null,
          about,
        },
      });
      router.replace("/");
    } catch (e) {
      toast({ text: (e as Error).message, tone: "error" });
      setBusy(false);
    }
  };

  const setSize = (k: keyof Sizes, v: string) => setSizes((s) => ({ ...s, [k]: v }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-fg" : "bg-line"}`} />
        ))}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      <div className="flex-1">
        {step === 0 && (
          <section className="mt-2 space-y-5">
            <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s get to know you</h1>
            <Field label="I shop">
              <div className="grid grid-cols-3 gap-2">
                {["Menswear", "Womenswear", "Both"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-xl border py-3 text-sm font-medium ${gender === g ? "border-fg bg-fg text-bg" : "border-line bg-surface"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Height">
              <input className={inputCls} value={height} onChange={(e) => setHeight(e.target.value)} placeholder={`5'6"`} />
            </Field>
            <Field label="Build" hint="in your own words">
              <input className={inputCls} value={build} onChange={(e) => setBuild(e.target.value)} placeholder="Slim, broad shoulders, short torso…" />
            </Field>
          </section>
        )}

        {step === 1 && (
          <section className="mt-2 space-y-5">
            <h1 className="text-2xl font-semibold tracking-tight">Sizes and budget</h1>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tops">
                <input className={inputCls} value={sizes.tops ?? ""} onChange={(e) => setSize("tops", e.target.value)} placeholder="M" />
              </Field>
              <Field label="Shoes">
                <input className={inputCls} value={sizes.shoes ?? ""} onChange={(e) => setSize("shoes", e.target.value)} placeholder="US 9.5" />
              </Field>
              <Field label="Waist">
                <input className={inputCls} value={sizes.waist ?? ""} onChange={(e) => setSize("waist", e.target.value)} placeholder="30" />
              </Field>
              <Field label="Inseam">
                <input className={inputCls} value={sizes.inseam ?? ""} onChange={(e) => setSize("inseam", e.target.value)} placeholder="30" />
              </Field>
            </div>
            <Field label="Other sizing notes" hint="optional">
              <input className={inputCls} value={sizes.other ?? ""} onChange={(e) => setSize("other", e.target.value)} placeholder="S at Zara, M at Uniqlo" />
            </Field>
            <Field label="Budget per item" hint="USD">
              <div className="flex items-center gap-3">
                <input className={inputCls} inputMode="numeric" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ""))} placeholder="Min" />
                <span className="text-muted">to</span>
                <input className={inputCls} inputMode="numeric" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ""))} placeholder="Max" />
              </div>
            </Field>
          </section>
        )}

        {step === 2 && (
          <section className="mt-2">
            <h1 className="text-2xl font-semibold tracking-tight">Clothes you already love</h1>
            <p className="mt-2 text-[15px] text-muted">
              Add photos of a few favorites. I&apos;ll read the fit, length and fabric so I can find more like them. You can add notes later in Profile.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <ClosetUploader onAdded={(item) => setCloset((c) => [item, ...c])} label="Add photos" />
              {closet.map((c) => (
                <div key={c.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                  <img src={c.image_url} alt={c.name ?? ""} className="aspect-[3/4] w-full rounded-2xl bg-surface-2 object-cover" />
                  <p className="mt-1 truncate text-xs text-muted">{c.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mt-2">
            <h1 className="text-2xl font-semibold tracking-tight">What do you know about your style?</h1>
            <p className="mt-2 text-[15px] text-muted">
              Type or tap Speak and just talk. Fits that work for you, things you never wear, colors, brands, occasions.
            </p>
            <div className="mt-5">
              <VoiceInput
                value={about}
                onChange={setAbout}
                rows={7}
                placeholder="I like t-shirts with a bit of a crop since I'm 5'6. Mostly earth tones, no big logos. I wear a lot of straight-leg jeans…"
              />
            </div>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 flex gap-3 bg-bg pt-3 pb-[env(safe-area-inset-bottom)]">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="rounded-2xl border border-line px-5 py-3.5 font-medium">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)} className="flex-1 rounded-2xl bg-accent py-3.5 font-semibold text-accent-fg">
            {step === 2 && !closet.length ? "Skip for now" : "Continue"}
          </button>
        ) : (
          <button onClick={finish} disabled={busy} className="flex-1 rounded-2xl bg-accent py-3.5 font-semibold text-accent-fg disabled:opacity-50">
            {busy ? "Setting things up…" : "Start finding clothes"}
          </button>
        )}
      </div>
    </main>
  );
}
