"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Recommendation } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { Page } from "@/components/Page";
import { CardSkeleton, ProductCard, useRecActions } from "@/components/Recs";

export default function SavedPage() {
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const actions = useRecActions(setItems as React.Dispatch<React.SetStateAction<Recommendation[]>>);

  useEffect(() => {
    api<Recommendation[]>("/api/saved").then(setItems).catch(() => setItems([]));
  }, []);

  // Keep un-hearted items visible until the page reloads, so an accidental tap is easy to undo.
  const groups = CATEGORIES.map((c) => ({ ...c, items: (items ?? []).filter((i) => i.category === c.slug && i.status !== "disliked") })).filter(
    (g) => g.items.length,
  );

  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">Saved</h1>
      {items === null && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}
      {items?.length === 0 && (
        <p className="mt-6 text-[15px] text-muted">Nothing saved yet. Tap the heart on anything you love and it shows up here.</p>
      )}
      <div className="mt-6 space-y-9">
        {groups.map((g) => (
          <section key={g.slug}>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              {g.label} <span className="text-sm font-normal text-muted">{g.items.length}</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map((rec) => (
                <ProductCard key={rec.id} rec={rec} actions={actions} compact />
              ))}
            </div>
          </section>
        ))}
      </div>
      {actions.sheets}
    </Page>
  );
}
