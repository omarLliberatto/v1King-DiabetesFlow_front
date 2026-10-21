"use client";

import { useEffect, useMemo, useState } from "react";
import { SYNCED_EVENT } from "@/lib/db";
import { createFood, deleteFood, getFoods, getMeals, type Food, type Meal } from "@/services/api";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const optional = (v: string) => (v === "" ? undefined : Number(v));

export default function FoodManager() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [per100, setPer100] = useState("");
  const [unitGrams, setUnitGrams] = useState("");
  const [perUnit, setPerUnit] = useState("");

  const load = async () => {
    const [f, m] = await Promise.all([getFoods(), getMeals()]);
    setFoods(f);
    setMeals(m);
  };

  useEffect(() => {
    const reload = () => {
      Promise.all([getFoods(), getMeals()]).then(([f, m]) => {
        setFoods(f);
        setMeals(m);
      });
    };
    reload();
    window.addEventListener(SYNCED_EVENT, reload);
    return () => window.removeEventListener(SYNCED_EVENT, reload);
  }, []);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return q ? foods.filter((f) => normalize(f.name).includes(q)) : foods;
  }, [foods, query]);

  const valid = name.trim() !== "" && (per100 !== "" || perUnit !== "");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    await createFood({
      name: name.trim(),
      carbsPer100g: optional(per100),
      unitGrams: optional(unitGrams),
      carbsPerUnit: per100 === "" ? optional(perUnit) : undefined,
    });
    setName("");
    setPer100("");
    setUnitGrams("");
    setPerUnit("");
    await load();
  };

  return (
    <div className="base-grid">
      <section className="panel flex flex-col gap-4">
        <h2 className="eyebrow">01 · Tabla de hidratos</h2>
        <input className="input" placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="flex flex-col border border-shield-gray max-h-[60vh] overflow-y-auto">
          {visible.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 px-3 py-2.5 border-b border-shield-gray last:border-0">
              <div className="flex flex-col gap-0.5 flex-1">
                <span className="text-sm">
                  {f.name}
                  {f.source === "propio" && <span className="ml-2 text-[10px] font-space uppercase tracking-wider text-helm-gold">propio</span>}
                </span>
                {f.note && <span className="text-xs text-[#A3A099]">{f.note}</span>}
              </div>
              <div className="flex flex-col items-end font-mono text-xs text-helm-gold whitespace-nowrap">
                {f.carbsPer100g !== undefined && <span>{f.carbsPer100g} g/100 g</span>}
                {f.unitGrams !== undefined && <span className="text-[#A3A099]">unid. {f.unitGrams} g</span>}
                {f.carbsPerUnit !== undefined && <span>{f.carbsPerUnit} g/unid.</span>}
              </div>
              {f.source === "propio" && (
                <button
                  type="button"
                  aria-label={`Borrar ${f.name}`}
                  className="text-viking-red font-bold px-1"
                  onClick={async () => {
                    await deleteFood(f.id);
                    await load();
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-6">
        <section className="panel">
          <h2 className="eyebrow mb-4">02 · Agregar alimento propio</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="food-name">Nombre</label>
              <input id="food-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="food-per100">HC por 100 g</label>
                <input id="food-per100" className="input" type="number" inputMode="decimal" min="0" step="any" value={per100} onChange={(e) => setPer100(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="food-unit">Peso de 1 unidad (g)</label>
                <input id="food-unit" className="input" type="number" inputMode="decimal" min="0" step="any" value={unitGrams} onChange={(e) => setUnitGrams(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="food-perunit">O bien: HC por porción (sin peso)</label>
              <input
                id="food-perunit"
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={perUnit}
                disabled={per100 !== ""}
                onChange={(e) => setPerUnit(e.target.value)}
              />
            </div>
            <button type="submit" className="btn" disabled={!valid}>Guardar alimento</button>
          </form>
        </section>

        <section className="panel">
          <h2 className="eyebrow mb-4">03 · Últimos platos</h2>
          {meals.length === 0 ? (
            <p className="text-sm text-[#A3A099]">Todavía no registraste platos desde la calculadora.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {meals.map((m) => (
                <li key={m.id} className="border-b border-shield-gray pb-3 last:border-0 text-sm">
                  <div className="flex justify-between font-mono text-xs">
                    <span>{new Date(m.timestamp).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span className="text-helm-gold font-bold">{m.totalCarbs.toFixed(1)} g HC</span>
                  </div>
                  <p className="text-[#A3A099] mt-1">{m.items.map((i) => `${i.name} ${i.amount}${i.mode === "g" ? " g" : " u"}`).join(" · ")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
