import Dexie, { type EntityTable } from "dexie";
import type { BolusParams } from "./bolus";

export interface Settings extends BolusParams {
  id: "main";
}

export interface Food {
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

export interface Meal {
  id?: number;
  timestamp: string;
  items: MealItem[];
  totalCarbs: number;
}

export interface GlucoseLog {
  id?: number;
  level: number;
  timestamp: string;
  context: string;
}

export interface InsulinLog {
  id?: number;
  units: number;
  timestamp: string;
}

export interface Activity {
  id?: number;
  duration_min?: number;
  steps?: number;
  createdAt: string;
}

export const db = new Dexie("diabetesflow") as Dexie & {
  settings: EntityTable<Settings, "id">;
  foods: EntityTable<Food, "id">;
  meals: EntityTable<Meal, "id">;
  glucoseLogs: EntityTable<GlucoseLog, "id">;
  insulinLogs: EntityTable<InsulinLog, "id">;
  activities: EntityTable<Activity, "id">;
};

db.version(1).stores({
  settings: "id",
  foods: "id, name, source",
  meals: "++id, timestamp",
  glucoseLogs: "++id, timestamp",
  insulinLogs: "++id, timestamp",
  activities: "++id, createdAt",
});
