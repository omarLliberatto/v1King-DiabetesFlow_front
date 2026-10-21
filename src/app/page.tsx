import BolusCalculator from "@/components/BolusCalculator";

export default function CalculatorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-shield-gray pb-5">
        <span className="eyebrow text-viking-red">Calculadora · Apidra</span>
        <h1 className="section-title text-3xl sm:text-4xl">Bolo de comida</h1>
      </div>
      <BolusCalculator />
    </div>
  );
}
