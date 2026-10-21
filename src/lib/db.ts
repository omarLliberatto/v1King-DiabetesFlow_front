import Dexie, { type EntityTable } from "dexie";
import type { BolusParams } from "./bolus";

export type Kind = "settings" | "food" | "meal" | "glucose" | "insulin" | "activity";

interface Synced {
  dirty?: 1;
}

export interface Settings extends BolusParams, Synced {
  id: "main";
}

export interface Food extends Synced {
  id: string;
  name: string;
  carbsPer100g?: number;
  carbsPerUnit?: number;
  unitGrams?: number;
  note?: string;
  source: "planilla" | "propio";
}

export interface MealItem {
  foodId: string;
  name: string;
  amount: number;
  mode: "g" | "u";
  carbs: number;
}

export interface Meal extends Synced {
  id: string;
  timestamp: string;
  items: MealItem[];
  totalCarbs: number;
}

export interface GlucoseLog extends Synced {
  id: string;
  level: number;
  timestamp: string;
  context: string;
}

export interface InsulinLog extends Synced {
  id: string;
  units: number;
  timestamp: string;
}

export interface Activity extends Synced {
  id: string;
  duration_min?: number;
  steps?: number;
  createdAt: string;
}

export interface Tombstone {
  key: string;
  kind: Kind;
  id: string;
}

export interface Meta {
  key: string;
  value: string;
}

export const db = new Dexie("diabetesflow-v2") as Dexie & {
  settings: EntityTable<Settings, "id">;
  foods: EntityTable<Food, "id">;
  meals: EntityTable<Meal, "id">;
  glucoseLogs: EntityTable<GlucoseLog, "id">;
  insulinLogs: EntityTable<InsulinLog, "id">;
  activities: EntityTable<Activity, "id">;
  tombstones: EntityTable<Tombstone, "key">;
  meta: EntityTable<Meta, "key">;
};

db.version(1).stores({
  settings: "id, dirty",
  foods: "id, name, source, dirty",
  meals: "id, timestamp, dirty",
  glucoseLogs: "id, timestamp, dirty",
  insulinLogs: "id, timestamp, dirty",
  activities: "id, createdAt, dirty",
  tombstones: "key",
  meta: "key",
});

export const TABLE_BY_KIND: Record<Kind, "settings" | "foods" | "meals" | "glucoseLogs" | "insulinLogs" | "activities"> = {
  settings: "settings",
  food: "foods",
  meal: "meals",
  glucose: "glucoseLogs",
  insulin: "insulinLogs",
  activity: "activities",
};

export const KINDS = Object.keys(TABLE_BY_KIND) as Kind[];

export const SYNCED_EVENT = "diabetesflow:synced";

export async function migrateLegacy(): Promise<void> {
  if (!(await Dexie.exists("diabetesflow"))) return;
  const legacy = new Dexie("diabetesflow");
  legacy.version(1).stores({
    settings: "id",
    foods: "id, name, source",
    meals: "++id, timestamp",
    glucoseLogs: "++id, timestamp",
    insulinLogs: "++id, timestamp",
    activities: "++id, createdAt",
  });
  const fresh = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, id: crypto.randomUUID(), dirty: 1 as const }));
  const [settings, foods, meals, glucose, insulin, activities] = await Promise.all([
    legacy.table("settings").toArray(),
    legacy.table("foods").where("source").equals("propio").toArray(),
    legacy.table("meals").toArray(),
    legacy.table("glucoseLogs").toArray(),
    legacy.table("insulinLogs").toArray(),
    legacy.table("activities").toArray(),
  ]);
  await db.transaction("rw", [db.settings, db.foods, db.meals, db.glucoseLogs, db.insulinLogs, db.activities], async () => {
    await db.settings.bulkPut(settings.map((s) => ({ ...s, dirty: 1 })));
    await db.foods.bulkPut(foods.map((f) => ({ ...f, dirty: 1 })));
    await db.meals.bulkPut(fresh(meals));
    await db.glucoseLogs.bulkPut(fresh(glucose));
    await db.insulinLogs.bulkPut(fresh(insulin));
    await db.activities.bulkPut(fresh(activities));
  });
  legacy.close();
  await Dexie.delete("diabetesflow");
}
