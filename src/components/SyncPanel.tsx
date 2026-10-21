"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SYNCED_EVENT } from "@/lib/db";
import { getLastSync, supabase, syncNow } from "@/lib/sync";

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "nunca";

export default function SyncPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastSync, setLastSync] = useState<string>();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      getLastSync().then(setLastSync);
    });
    const onSynced = (e: Event) => setLastSync((e as CustomEvent<{ at: string }>).detail.at);
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener(SYNCED_EVENT, onSynced);
    };
  }, []);

  if (!supabase) {
    return (
      <section className="panel flex flex-col gap-2">
        <h2 className="eyebrow">Sincronización</h2>
        <p className="text-sm text-[#A3A099]">No está configurada en esta versión. Los datos quedan sólo en este dispositivo.</p>
      </section>
    );
  }

  const run = async (op: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setStatus("");
    try {
      await op();
      setStatus(ok);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error de sincronización.");
    } finally {
      setBusy(false);
    }
  };

  const signIn = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "Mail o contraseña incorrectos." : error.message);
      setPassword("");
      await syncNow();
    }, "Sesión iniciada y datos sincronizados.");
  };

  return (
    <section className="panel flex flex-col gap-4">
      <h2 className="eyebrow">Sincronización</h2>
      {session ? (
        <>
          <p className="text-sm leading-relaxed">
            Conectado como <span className="font-mono">{session.user.email}</span>. Última sincronización:{" "}
            <span className="font-mono text-helm-gold">{fmt(lastSync)}</span>.
          </p>
          <p className="text-xs text-[#A3A099] leading-relaxed">
            Se sincronizan parámetros, glucemias, dosis, platos, actividad y alimentos propios. Sin conexión se guarda igual y se sube al volver.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn" disabled={busy} onClick={() => run(syncNow, "Datos sincronizados.")}>
              Sincronizar ahora
            </button>
            <button type="button" className="btn-outline" disabled={busy} onClick={() => run(() => supabase!.auth.signOut(), "Sesión cerrada. Los datos siguen en este dispositivo.")}>
              Cerrar sesión
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={signIn} className="flex flex-col gap-4">
          <p className="text-sm text-[#A3A099] leading-relaxed">Iniciá sesión para compartir los datos entre tus dispositivos.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="sync-email">Mail</label>
              <input id="sync-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="sync-password">Contraseña</label>
              <input
                id="sync-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn self-start" disabled={busy || !email || !password}>
            Iniciar sesión
          </button>
        </form>
      )}
      {status && <p className="font-mono text-sm text-helm-gold">{status}</p>}
    </section>
  );
}
