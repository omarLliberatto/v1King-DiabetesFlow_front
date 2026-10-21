"use client";

import { useEffect, useRef, useState } from "react";
import type { BolusParams } from "@/lib/bolus";
import SyncPanel from "@/components/SyncPanel";
import { SYNCED_EVENT } from "@/lib/db";
import { exportBackup, getSettings, importBackup, saveSettings } from "@/services/api";

const FIELDS: { key: keyof BolusParams; label: string; unit: string; help: string; step: string }[] = [
  { key: "threshold", label: "Corregir desde", unit: "mg/dL", help: "Por debajo de este valor no se suma corrección.", step: "5" },
  { key: "target", label: "Objetivo", unit: "mg/dL", help: "Valor al que lleva la corrección.", step: "5" },
  { key: "isf", label: "FSI", unit: "mg/dL por U", help: "Cuánto baja la glucemia una unidad de insulina rápida.", step: "0.5" },
  { key: "icr", label: "ICR", unit: "g HC por U", help: "Gramos de hidratos que cubre una unidad.", step: "0.1" },
  { key: "duration", label: "Duración", unit: "horas", help: "Tiempo de acción de la insulina rápida, para la IOB.", step: "0.5" },
];

type Form = Record<keyof BolusParams, string>;

const EMPTY: Form = { threshold: "", target: "", isf: "", icr: "", duration: "" };

export default function SettingsPage() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    getSettings().then((s) => {
      if (s) setForm({ threshold: String(s.threshold), target: String(s.target), isf: String(s.isf), icr: String(s.icr), duration: String(s.duration) });
    });

  useEffect(() => {
    load();
    window.addEventListener(SYNCED_EVENT, load);
    return () => window.removeEventListener(SYNCED_EVENT, load);
  }, []);

  const valid = FIELDS.every((f) => Number(form[f.key]) > 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    await saveSettings({
      threshold: Number(form.threshold),
      target: Number(form.target),
      isf: Number(form.isf),
      icr: Number(form.icr),
      duration: Number(form.duration),
    });
    setStatus("Parámetros guardados.");
  };

  const handleExport = async () => {
    const blob = await exportBackup();
    const file = new File([blob], `diabetesflow-${new Date().toISOString().slice(0, 10)}.json`, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(file);
      await load();
      setStatus("Respaldo importado.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "No se pudo importar el respaldo.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-shield-gray pb-5">
        <span className="eyebrow text-viking-red">Ajustes</span>
        <h1 className="section-title text-3xl sm:text-4xl">Parámetros</h1>
        <p className="text-sm text-[#A3A099] max-w-2xl leading-relaxed">
          Se guardan sólo en este dispositivo. Cada cambio modifica la dosis sugerida de inmediato.
        </p>
      </div>

      <form onSubmit={handleSave} className="panel flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor={f.key}>
                {f.label} <span className="normal-case tracking-normal">({f.unit})</span>
              </label>
              <input
                id={f.key}
                className="input font-mono"
                type="number"
                inputMode="decimal"
                min="0"
                step={f.step}
                value={form[f.key]}
                onChange={(e) => {
                  setForm({ ...form, [f.key]: e.target.value });
                  setStatus("");
                }}
              />
              <p className="text-xs text-[#A3A099]">{f.help}</p>
            </div>
          ))}
        </div>
        <button type="submit" className="btn self-start" disabled={!valid}>Guardar parámetros</button>
      </form>

      <SyncPanel />

      <section className="panel flex flex-col gap-4">
        <h2 className="eyebrow">Respaldo</h2>
        <p className="text-sm text-[#A3A099] leading-relaxed">
          Exportá un JSON con parámetros, alimentos propios, platos, glucemias, dosis y actividad. En el iPad, elegí «Guardar en Archivos» → iCloud Drive.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-outline" onClick={handleExport}>Exportar</button>
          <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()}>Importar</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
        </div>
      </section>

      {status && <p className="font-mono text-sm text-helm-gold">{status}</p>}
    </div>
  );
}
