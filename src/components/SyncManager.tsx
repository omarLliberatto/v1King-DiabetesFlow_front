"use client";

import { useEffect } from "react";
import { requestSync, supabase } from "@/lib/sync";

export default function SyncManager() {
  useEffect(() => {
    if (!supabase) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") requestSync();
    };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") requestSync();
    });
    window.addEventListener("online", requestSync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", requestSync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
