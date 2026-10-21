"use client";

import { useState, useEffect } from 'react';
import GlucoseLogger from '@/components/GlucoseLogger';
import GlucoseHistory from '@/components/GlucoseHistory';
import { SYNCED_EVENT } from '@/lib/db';
import { getGlucoseLogs, type GlucoseLog } from '@/services/api';

export default function GlucosePage() {
  const [logs, setLogs] = useState<GlucoseLog[]>([]);

  const refreshLogs = async () => {
    try {
      setLogs(await getGlucoseLogs());
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    const reload = () => {
      getGlucoseLogs().then(setLogs).catch(() => setLogs([]));
    };
    getGlucoseLogs().then(setLogs).catch(() => setLogs([]));
    window.addEventListener(SYNCED_EVENT, reload);
    return () => window.removeEventListener(SYNCED_EVENT, reload);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 mb-4 border-b border-[#3D3D3D] pb-6">
        <span className="eyebrow text-viking-red">Glucemias</span>
        <h1 className="section-title text-3xl sm:text-4xl">
          Control de Glucemia
        </h1>
        <p className="text-sm text-[#A3A099] max-w-2xl leading-relaxed">
          Las mediciones se guardan en este dispositivo. Las que registrás desde la calculadora aparecen acá.
        </p>
      </div>
      <div className="base-grid">
        <section className="panel">
          <h2 className="eyebrow mb-6">01 · Nuevo registro</h2>
          <GlucoseLogger onSuccess={refreshLogs} />
        </section>
        <section className="panel flex flex-col gap-6">
          <h2 className="eyebrow">02 · Historial</h2>
          <GlucoseHistory logs={logs} />
        </section>
      </div>
    </div>
  );
}
