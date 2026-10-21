import FoodManager from "@/components/FoodManager";

export default function FoodPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-shield-gray pb-5">
        <span className="eyebrow text-viking-red">Alimentos</span>
        <h1 className="section-title text-3xl sm:text-4xl">Tabla de hidratos</h1>
        <p className="text-sm text-[#A3A099] max-w-2xl leading-relaxed">
          Valores de referencia cada 100 g. Los del envase de cada producto son los definitivos.
        </p>
      </div>
      <FoodManager />
    </div>
  );
}
