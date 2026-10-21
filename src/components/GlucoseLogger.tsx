"use client";

import { useState } from 'react';
import { createGlucoseLog } from '@/services/api';

export default function GlucoseLogger({ onSuccess }: { onSuccess: () => void }) {
  const [level, setLevel] = useState<string>('');
  const [context, setContext] = useState<string>('Ayunas');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const glucoseValue = Number(level);
    if (!level || isNaN(glucoseValue)) return;

    setIsSubmitting(true);
    try {
      await createGlucoseLog({ level: glucoseValue, context });
      setLevel('');
      setContext('Ayunas');
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="glucose-level" className="field-label">
          Nivel de Glucosa (mg/dL)
        </label>
        <input
          id="glucose-level"
          type="number"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          required
          min="20"
          max="600"
          className="input"
          placeholder="Ej: 110"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="context" className="field-label">
          Contexto
        </label>
        <select
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="input"
        >
          <option value="Ayunas">Ayunas</option>
          <option value="Antes de comer">Antes de comer</option>
          <option value="Post-prandial">Post-prandial</option>
          <option value="Antes de dormir">Antes de dormir</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !level}
        className="btn w-full"
      >
        {isSubmitting ? 'Guardando...' : 'Registrar'}
      </button>
    </form>
  );
}
