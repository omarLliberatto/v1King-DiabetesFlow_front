"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { calculateBolus, type BolusParams } from "@/lib/bolus";
import PlateBuilder from "@/components/PlateBuilder";
import {
  createGlucoseLog,
  createInsulinLog,
  createMeal,
  getLastInsulin,
  getSettings,
  type MealItem,
} from "@/services/api";

const num = (v: string) => (v === "" ? 0 : Number(v) || 0);

function NumberField({
  id,
  label,
  value,
  onChange,
  step = "1",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function BolusCalculator() {
  const [params, setParams] = useState<BolusParams | null | undefined>(undefined);
  const [glucose, setGlucose] = useState("");
  const [carbs, setCarbs] = useState("");
  const [lastDose, setLastDose] = useState("0");
  const [hours, setHours] = useState("");
  const [plate, setPlate] = useState<MealItem[]>([]);
  const [showPlate, setShowPlate] = useState(false);
  const [applied, setApplied] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setParams);
    getLastInsulin().then((last) => {
      if (!last) return;
      setLastDose(String(last.units));
      setHours(((Date.now() - new Date(last.timestamp).getTime()) / 3_600_000).toFixed(1));
    });
  }, []);

  const result = useMemo(
    () =>
      params
        ? calculateBolus(
            { currentGlucose: num(glucose), carbs: num(carbs), lastDose: num(lastDose), hoursSinceDose: hours === "" ? 24 : num(hours) },
            params,
          )
        : null,
    [params, glucose, carbs, lastDose, hours],
  );

  const register = async () => {
    if (!result) return;
    const units = applied === "" ? result.pen : num(applied);
    if (glucose) await createGlucoseLog({ level: num(glucose), context: "Antes de comer" });
    if (plate.length > 0) await createMeal(plate);
    if (units > 0) await createInsulinLog(units);
    setSaved(true);
  };

  if (params === undefined) return null;

  if (params === null) {
    return (
      <div className="panel flex flex-col gap-4 border-l-4 border-l-viking-red">
        <p className="eyebrow text-viking-red">Falta configurar</p>
        <p className="text-sm leading-relaxed">
          Cargá tus parámetros (umbral de corrección, objetivo, FSI, ICR y duración de la insulina) antes de calcular. Se guardan en este dispositivo.
        </p>
        <Link href="/settings/" className="btn self-start">Ir a Ajustes</Link>
      </div>
    );
  }

  const low = glucose !== "" && num(glucose) < 70;
  const units = applied === "" ? result!.pen : num(applied);

  return (
    <div className="base-grid">
      <section className="panel flex flex-col gap-5">
        <h2 className="eyebrow">01 · Datos</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField id="glucose" label="Glucemia (mg/dL)" value={glucose} onChange={setGlucose} />
          <NumberField
            id="carbs"
            label="Hidratos (g)"
            value={carbs}
            step="0.1"
            onChange={(v) => {
              setCarbs(v);
              setPlate([]);
            }}
          />
          <NumberField id="last-dose" label="Última dosis (U)" value={lastDose} step="0.5" onChange={setLastDose} />
          <NumberField id="hours" label="Horas desde dosis" value={hours} step="0.25" onChange={setHours} />
        </div>
        <button type="button" className="btn-outline" onClick={() => setShowPlate((s) => !s)}>
          {showPlate ? "Ocultar plato" : "Armar plato"}
        </button>
        {showPlate && (
          <PlateBuilder
            items={plate}
            onChange={(items) => {
              setPlate(items);
              setCarbs(items.length > 0 ? items.reduce((s, i) => s + i.carbs, 0).toFixed(1) : "");
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        {low && (
          <div className="bg-viking-red text-saga-cream p-4 font-space font-bold text-sm uppercase tracking-wider">
            Glucemia por debajo de 70: tratá la hipoglucemia antes de calcular.
          </div>
        )}
        <div className="panel flex flex-col gap-4">
          <h2 className="eyebrow">02 · Dosis sugerida</h2>
          <div className="flex items-baseline gap-3">
            <span className="font-mono font-bold text-6xl leading-none text-saga-cream">{result!.total.toFixed(1)}</span>
            <span className="font-mono text-xl text-[#A3A099]">U</span>
          </div>
          <p className="font-space text-sm">
            Lapicera (pasos de 1 U): <span className="font-bold text-helm-gold">{result!.pen} U</span>
          </p>
          <dl className="grid grid-cols-3 border-t border-shield-gray pt-4 text-xs">
            <div>
              <dt className="field-label">Hidratos</dt>
              <dd className="font-mono text-lg font-bold">{result!.meal.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="field-label">Corrección</dt>
              <dd className="font-mono text-lg font-bold">+{result!.correction.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="field-label">IOB</dt>
              <dd className="font-mono text-lg font-bold">−{result!.iob.toFixed(1)}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-1.5 border-t border-shield-gray pt-4">
            <label className="field-label" htmlFor="applied">Unidades aplicadas</label>
            <input
              id="applied"
              className="input font-mono"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder={String(result!.pen)}
              value={applied}
              disabled={saved}
              onChange={(e) => setApplied(e.target.value)}
            />
            <p className="text-xs text-[#A3A099]">Vacío = la dosis sugerida para la lapicera. Cambialo si aplicaste otra cantidad.</p>
          </div>
          <button type="button" className="btn" onClick={register} disabled={saved || (!glucose && units === 0)}>
            {saved ? `Registrado: ${units} U` : `Registrar ${units} U aplicadas`}
          </button>
        </div>
        <p className="text-xs text-[#A3A099] leading-relaxed">
          Corrige sólo desde {params.threshold} mg/dL y hasta {params.target}. La insulina activa (IOB) decae en forma lineal en{" "}
          {params.duration} h y se descuenta sólo de la corrección, nunca de los hidratos.
        </p>
      </section>
    </div>
  );
}
