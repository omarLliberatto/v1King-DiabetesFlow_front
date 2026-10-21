import catalog from "@/data/foods.json";
import { db, type Activity, type Food, type GlucoseLog, type InsulinLog, type Meal, type MealItem, type Settings } from "@/lib/db";
import type { BolusParams } from "@/lib/bolus";

export type { Activity, Food, GlucoseLog, InsulinLog, Meal, MealItem };

const BACKUP_TABLES = ["settings", "foods", "meals", "glucoseLogs", "insulinLogs", "activities"] as const;

let catalogSynced: Promise<void> | null = null;

function syncCatalog(): Promise<void> {
  catalogSynced ??= db.transaction("rw", db.foods, async () => {
    await db.foods.where("source").equals("planilla").delete();
    await db.foods.bulkPut((catalog as Omit<Food, "source">[]).map((f) => ({ ...f, source: "planilla" as const })));
  });
  return catalogSynced;
}

export async function getSettings(): Promise<BolusParams | null> {
  const s = await db.settings.get("main");
  if (!s) return null;
  return { threshold: s.threshold, target: s.target, isf: s.isf, icr: s.icr, duration: s.duration };
}

export async function saveSettings(params: BolusParams): Promise<void> {
  await db.settings.put({ id: "main", ...params } satisfies Settings);
}

export async function getFoods(): Promise<Food[]> {
  await syncCatalog();
  return db.foods.orderBy("name").toArray();
}

export async function createFood(data: Omit<Food, "id" | "source">): Promise<void> {
  await db.foods.add({ ...data, id: `u-${crypto.randomUUID()}`, source: "propio" });
}

export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}

export async function getMeals(): Promise<Meal[]> {
  return db.meals.orderBy("timestamp").reverse().limit(50).toArray();
}

export async function createMeal(items: MealItem[]): Promise<void> {
  await db.meals.add({
    timestamp: new Date().toISOString(),
    items,
    totalCarbs: items.reduce((sum, i) => sum + i.carbs, 0),
  });
}

export async function getGlucoseLogs(): Promise<GlucoseLog[]> {
  return db.glucoseLogs.orderBy("timestamp").reverse().limit(100).toArray();
}

export async function createGlucoseLog(data: Omit<GlucoseLog, "id" | "timestamp">): Promise<void> {
  await db.glucoseLogs.add({ ...data, timestamp: new Date().toISOString() });
}

export async function getLastInsulin(): Promise<InsulinLog | undefined> {
  return db.insulinLogs.orderBy("timestamp").last();
}

export async function createInsulinLog(units: number): Promise<void> {
  await db.insulinLogs.add({ units, timestamp: new Date().toISOString() });
}

export async function getActivities(): Promise<Activity[]> {
  return db.activities.orderBy("createdAt").reverse().limit(50).toArray();
}

export async function createActivity(data: Omit<Activity, "id" | "createdAt">): Promise<void> {
  await db.activities.add({ ...data, createdAt: new Date().toISOString() });
}

export async function exportBackup(): Promise<Blob> {
  const data: Record<string, unknown[]> = {};
  for (const name of BACKUP_TABLES) {
    data[name] = name === "foods" ? await db.foods.where("source").equals("propio").toArray() : await db.table(name).toArray();
  }
  return new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], {
    type: "application/json",
  });
}

export async function importBackup(file: File): Promise<void> {
  const parsed = JSON.parse(await file.text()) as { version: number; data: Record<string, unknown[]> };
  if (parsed.version !== 1 || typeof parsed.data !== "object") throw new Error("Archivo de respaldo inválido");
  await db.transaction("rw", BACKUP_TABLES.map((n) => db.table(n)), async () => {
    for (const name of BACKUP_TABLES) {
      const rows = parsed.data[name];
      if (Array.isArray(rows)) await db.table(name).bulkPut(rows);
    }
  });
}
