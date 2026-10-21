import catalog from "@/data/foods.json";
import {
  db,
  migrateLegacy,
  type Activity,
  type Food,
  type GlucoseLog,
  type InsulinLog,
  type Meal,
  type MealItem,
  type Settings,
} from "@/lib/db";
import { requestSync } from "@/lib/sync";
import type { BolusParams } from "@/lib/bolus";

export type { Activity, Food, GlucoseLog, InsulinLog, Meal, MealItem };

const BACKUP_TABLES = ["settings", "foods", "meals", "glucoseLogs", "insulinLogs", "activities"] as const;

let readyPromise: Promise<void> | null = null;

function ready(): Promise<void> {
  readyPromise ??= migrateLegacy().then(() =>
    db.transaction("rw", db.foods, async () => {
      await db.foods.where("source").equals("planilla").delete();
      await db.foods.bulkPut((catalog as Omit<Food, "source">[]).map((f) => ({ ...f, source: "planilla" as const })));
    }),
  );
  return readyPromise;
}

async function write<T>(op: () => Promise<T>): Promise<T> {
  await ready();
  const result = await op();
  requestSync();
  return result;
}

export async function getSettings(): Promise<BolusParams | null> {
  await ready();
  const s = await db.settings.get("main");
  if (!s) return null;
  return { threshold: s.threshold, target: s.target, isf: s.isf, icr: s.icr, duration: s.duration };
}

export function saveSettings(params: BolusParams): Promise<void> {
  return write(async () => {
    await db.settings.put({ id: "main", ...params, dirty: 1 } satisfies Settings);
  });
}

export async function getFoods(): Promise<Food[]> {
  await ready();
  return db.foods.orderBy("name").toArray();
}

export function createFood(data: Omit<Food, "id" | "source" | "dirty">): Promise<void> {
  return write(async () => {
    await db.foods.add({ ...data, id: `u-${crypto.randomUUID()}`, source: "propio", dirty: 1 });
  });
}

export function deleteFood(id: string): Promise<void> {
  return write(() =>
    db.transaction("rw", db.foods, db.tombstones, async () => {
      await db.foods.delete(id);
      await db.tombstones.put({ key: `food:${id}`, kind: "food", id });
    }),
  );
}

export async function getMeals(): Promise<Meal[]> {
  await ready();
  return db.meals.orderBy("timestamp").reverse().limit(50).toArray();
}

export function createMeal(items: MealItem[]): Promise<void> {
  return write(async () => {
    await db.meals.add({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      items,
      totalCarbs: items.reduce((sum, i) => sum + i.carbs, 0),
      dirty: 1,
    });
  });
}

export async function getGlucoseLogs(): Promise<GlucoseLog[]> {
  await ready();
  return db.glucoseLogs.orderBy("timestamp").reverse().limit(100).toArray();
}

export function createGlucoseLog(data: Pick<GlucoseLog, "level" | "context">): Promise<void> {
  return write(async () => {
    await db.glucoseLogs.add({ ...data, id: crypto.randomUUID(), timestamp: new Date().toISOString(), dirty: 1 });
  });
}

export async function getLastInsulin(): Promise<InsulinLog | undefined> {
  await ready();
  return db.insulinLogs.orderBy("timestamp").last();
}

export function createInsulinLog(units: number): Promise<void> {
  return write(async () => {
    await db.insulinLogs.add({ id: crypto.randomUUID(), units, timestamp: new Date().toISOString(), dirty: 1 });
  });
}

export async function getActivities(): Promise<Activity[]> {
  await ready();
  return db.activities.orderBy("createdAt").reverse().limit(50).toArray();
}

export function createActivity(data: Pick<Activity, "duration_min" | "steps">): Promise<void> {
  return write(async () => {
    await db.activities.add({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), dirty: 1 });
  });
}

export async function exportBackup(): Promise<Blob> {
  await ready();
  const data: Record<string, unknown[]> = {};
  for (const name of BACKUP_TABLES) {
    const rows: Record<string, unknown>[] =
      name === "foods" ? await db.foods.where("source").equals("propio").toArray() : await db.table(name).toArray();
    data[name] = rows.map(({ dirty: _dirty, ...rest }) => rest);
  }
  return new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), data }, null, 2)], {
    type: "application/json",
  });
}

export function importBackup(file: File): Promise<void> {
  return write(async () => {
    const parsed = JSON.parse(await file.text()) as { version: number; data: Record<string, Record<string, unknown>[]> };
    if (![1, 2].includes(parsed.version) || typeof parsed.data !== "object") throw new Error("Archivo de respaldo inválido");
    await db.transaction("rw", BACKUP_TABLES.map((n) => db.table(n)), async () => {
      for (const name of BACKUP_TABLES) {
        const rows = parsed.data[name];
        if (!Array.isArray(rows)) continue;
        const newIds = parsed.version === 1 && name !== "settings" && name !== "foods";
        await db.table(name).bulkPut(rows.map((r) => ({ ...r, id: newIds ? crypto.randomUUID() : r.id, dirty: 1 })));
      }
    });
  });
}
