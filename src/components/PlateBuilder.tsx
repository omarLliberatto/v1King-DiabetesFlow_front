"use client";

import { useEffect, useMemo, useState } from "react";
import { itemCarbs } from "@/lib/bolus";
import { getFoods, type Food, type MealItem } from "@/services/api";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function unitAllowed(f: Food) {
  return f.carbsPerUnit !== undefined || f.unitGrams !== undefined;
}

function gramsAllowed(f: Food) {
  return f.carbsPer100g !== undefined;
}

export default function PlateBuilder({ items, onChange }: { items: MealItem[]; onChange: (items: MealItem[]) => void }) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"g" | "u">("g");

  useEffect(() => {
    getFoods().then(setFoods);
  }, []);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q || selected) return [];
    return foods.filter((f) => normalize(f.name).includes(q)).slice(0, 8);
  }, [foods, query, selected]);

  const pick = (f: Food) => {
    setSelected(f);
    setQuery(f.name);
    setMode(gramsAllowed(f) ? "g" : "u");
  };

  const preview = selected && amount ? itemCarbs(selected, Number(amount), mode) : 0;

  const add = () => {
    if (!selected || !amount || Number(amount) <= 0) return;
    onChange([
      ...items,
      { foodId: selected.id, name: selected.name, amount: Number(amount), mode, carbs: itemCarbs(selected, Number(amount), mode) },
    ]);
    setSelected(null);
    setQuery("");
    setAmount("");
  };

  const total = items.reduce((s, i) => s + i.carbs, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex flex-col gap-1.5">
        <label className="field-label" htmlFor="food-search">Alimento</label>
        <input
          id="food-search"
          className="input"
          placeholder="Buscar en la tabla…"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
        />
        {matches.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-10 bg-[#111111] border border-shield-gray max-h-72 overflow-y-auto">
            {matches.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => pick(f)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-shield-gray flex justify-between gap-3"
                >
                  <span>{f.name}</span>
                  <span className="font-mono text-helm-gold whitespace-nowrap">
                    {f.carbsPer100g !== undefined ? `${f.carbsPer100g} g/100` : `${f.carbsPerUnit} g/u`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected?.note && <p className="text-xs text-[#A3A099] leading-relaxed">{selected.note}</p>}

      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="field-label" htmlFor="food-amount">Cantidad</label>
          <input
            id="food-amount"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex">
          {(["g", "u"] as const).map((m) => {
            const enabled = selected ? (m === "g" ? gramsAllowed(selected) : unitAllowed(selected)) : m === "g";
            return (
              <button
                key={m}
                type="button"
                disabled={!enabled}
                onClick={() => setMode(m)}
                className={`px-4 py-2.5 border font-space font-bold text-sm disabled:opacity-30 ${
                  mode === m ? "bg-saga-cream text-forge-black border-saga-cream" : "border-shield-gray text-saga-cream"
                }`}
              >
                {m === "g" ? "g" : "unid."}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn" onClick={add} disabled={!selected || !amount}>
          +
        </button>
      </div>
      {preview > 0 && <p className="text-xs font-mono text-helm-gold">= {preview.toFixed(1)} g HC</p>}

      {items.length > 0 && (
        <ul className="flex flex-col border border-shield-gray">
          {items.map((i, idx) => (
            <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-shield-gray last:border-0 text-sm">
              <span className="flex-1">
                {i.name} <span className="text-[#A3A099]">· {i.amount} {i.mode === "g" ? "g" : "u"}</span>
              </span>
              <span className="font-mono text-helm-gold">{i.carbs.toFixed(1)} g</span>
              <button
                type="button"
                aria-label={`Quitar ${i.name}`}
                className="text-viking-red font-bold px-2"
                onClick={() => onChange(items.filter((_, j) => j !== idx))}
              >
                ×
              </button>
            </li>
          ))}
          <li className="flex justify-between px-3 py-2 bg-[#111111] font-space font-bold text-sm uppercase tracking-wider">
            <span>Total del plato</span>
            <span className="font-mono text-helm-gold">{total.toFixed(1)} g HC</span>
          </li>
        </ul>
      )}
    </div>
  );
}
