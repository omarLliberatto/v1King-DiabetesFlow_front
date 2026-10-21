import ActivityManager from '@/components/ActivityManager';

export default function ActivitiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-shield-gray pb-5">
        <span className="eyebrow text-viking-red">Actividad</span>
        <h1 className="section-title text-3xl sm:text-4xl">Actividad física</h1>
      </div>
      <ActivityManager />
    </div>
  );
}
