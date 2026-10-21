"use client";

import { useState, useEffect } from 'react';
import { getActivities, createActivity, Activity } from '@/services/api';

export default function ActivityManager() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [durationMin, setDurationMin] = useState<number | ''>('');
  const [steps, setSteps] = useState<number | ''>('');
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    try {
      const data = await getActivities();
      setActivities(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getActivities().then(setActivities).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMin === '' && steps === '') return;

    setIsCreating(true);
    try {
      await createActivity({
        duration_min: durationMin !== '' ? Number(durationMin) : undefined,
        steps: steps !== '' ? Number(steps) : undefined,
      });
      setDurationMin('');
      setSteps('');
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section className="bg-forge-black p-6 border-2 border-shield-gray rounded-none">
        <h2 className="text-xl font-syne mb-6 text-saga-cream">Registrar Actividad</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-space text-saga-cream">Duración (Minutos)</label>
            <input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value === '' ? '' : Number(e.target.value))}
              min="0"
              className="bg-forge-black text-saga-cream border-2 border-shield-gray rounded-none px-4 py-2.5 outline-none focus:border-viking-red transition-colors"
              placeholder="Ej: 45"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-space text-saga-cream">Pasos (Conteo Pasivo)</label>
            <input
              type="number"
              value={steps}
              onChange={(e) => setSteps(e.target.value === '' ? '' : Number(e.target.value))}
              min="0"
              className="bg-forge-black text-saga-cream border-2 border-shield-gray rounded-none px-4 py-2.5 outline-none focus:border-viking-red transition-colors"
              placeholder="Ej: 10000"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || (durationMin === '' && steps === '')}
            className="mt-2 bg-viking-red font-space text-saga-cream py-2.5 px-4 rounded-none border-2 border-viking-red hover:bg-forge-black hover:text-viking-red transition-colors disabled:opacity-50"
          >
            {isCreating ? 'REGISTRANDO...' : 'REGISTRAR ACTIVIDAD'}
          </button>
        </form>
      </section>

      <section className="bg-forge-black p-6 border-2 border-shield-gray rounded-none flex flex-col gap-6">
        <h2 className="text-xl font-syne text-saga-cream">Historial de Actividades</h2>
        {activities.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {activities.map((act, index) => (
              <li key={act.id || index} className="flex justify-between items-center bg-forge-black p-3 border-2 border-shield-gray rounded-none">
                <span className="font-inter text-saga-cream">
                  {act.duration_min ? `${act.duration_min} min` : ''} 
                  {act.duration_min && act.steps ? ' • ' : ''}
                  {act.steps ? `${act.steps} pasos` : ''}
                </span>
                <span className="font-mono text-viking-red text-sm">
                  {act.createdAt ? new Date(act.createdAt).toLocaleDateString('es-AR') : 'Hoy'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-shield-gray font-space text-sm">No hay actividades registradas.</p>
        )}
      </section>
    </div>
  );
}
