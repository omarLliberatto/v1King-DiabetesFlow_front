export interface BolusParams {
  threshold: number;
  target: number;
  isf: number;
  icr: number;
  duration: number;
}

export interface BolusInput {
  currentGlucose: number;
  carbs: number;
  lastDose: number;
  hoursSinceDose: number;
}

export interface BolusResult {
  meal: number;
  correction: number;
  iob: number;
  total: number;
  pen: number;
}

export function calculateBolus(input: BolusInput, params: BolusParams): BolusResult {
  const meal = input.carbs > 0 ? input.carbs / params.icr : 0;
  const rawCorrection =
    input.currentGlucose >= params.threshold ? (input.currentGlucose - params.target) / params.isf : 0;
  const remaining =
    input.hoursSinceDose >= params.duration ? 0 : Math.max(0, 1 - input.hoursSinceDose / params.duration);
  const iob = Math.min(input.lastDose * remaining, rawCorrection);
  const correction = rawCorrection - iob;
  const total = meal + correction;
  return { meal, correction, iob, total, pen: Math.round(total) };
}

export function itemCarbs(
  food: { carbsPer100g?: number; carbsPerUnit?: number; unitGrams?: number },
  amount: number,
  mode: "g" | "u",
): number {
  if (mode === "u") {
    if (food.carbsPerUnit !== undefined) return food.carbsPerUnit * amount;
    if (food.unitGrams !== undefined && food.carbsPer100g !== undefined)
      return (food.unitGrams * amount * food.carbsPer100g) / 100;
    return 0;
  }
  return food.carbsPer100g !== undefined ? (amount * food.carbsPer100g) / 100 : 0;
}
