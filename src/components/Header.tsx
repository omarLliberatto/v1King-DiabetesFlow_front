"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getGlucoseLogs, getLastInsulin, type GlucoseLog, type InsulinLog } from "@/services/api";

const LINKS = [
  { href: "/", label: "Calculadora" },
  { href: "/food/", label: "Alimentos" },
  { href: "/glucose/", label: "Glucemias" },
  { href: "/activities/", label: "Actividad" },
  { href: "/settings/", label: "Ajustes" },
];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function Brandmark() {
  return (
    <span className="font-space text-xl font-bold tracking-tight text-saga-cream">
      v1<span className="text-viking-red">K</span> <span className="font-syne">DiabetesFlow</span>
    </span>
  );
}

export function StatusStrip() {
  const pathname = usePathname();
  const [glucose, setGlucose] = useState<GlucoseLog>();
  const [insulin, setInsulin] = useState<InsulinLog>();

  useEffect(() => {
    getGlucoseLogs().then((l) => setGlucose(l[0]));
    getLastInsulin().then(setInsulin);
  }, [pathname]);

  return (
    <div className="w-full bg-[#111111] border-y border-shield-gray py-2">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-saga-cream">
        <span className="border-l-4 border-viking-red pl-3">
          Última glucemia:{" "}
          <span className="font-bold">{glucose ? `${glucose.level} mg/dL · ${fmt(glucose.timestamp)}` : "—"}</span>
        </span>
        <span className="border-l-4 border-helm-gold pl-3">
          Última dosis:{" "}
          <span className="font-bold">{insulin ? `${insulin.units} U · ${fmt(insulin.timestamp)}` : "—"}</span>
        </span>
      </div>
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  return (
    <>
      <header className="bg-forge-black pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Brandmark />
          <nav className="flex flex-wrap gap-1">
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href.slice(0, -1));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-2 py-2 text-xs font-space uppercase tracking-widest font-bold transition-colors ${
                    active ? "text-viking-red" : "text-saga-cream hover:text-viking-red"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <StatusStrip />
    </>
  );
}
