"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureSession, getSupabase } from "@/lib/supabase/client";
import { isSamples, type Samples } from "@/lib/knn";

const LOCAL_KEY = "punte-sign-samples";

export type SyncState = "loading" | "saved" | "saving" | "local" | "error";

function readLocal(): Samples {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isSamples(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocal(samples: Samples) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(samples));
  } catch {
    // stocarea locală poate fi indisponibilă (mod privat)
  }
}

/**
 * Antrenarea semnelor: salvată în sign_profiles (Supabase), cu rezervă în localStorage
 * când nu există conexiune. Se salvează doar landmark-uri, niciodată imagini.
 */
export function useSignProfile() {
  const [samples, setSamplesState] = useState<Samples>(() => (typeof window === "undefined" ? {} : readLocal()));
  const [sync, setSync] = useState<SyncState>("loading");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await ensureSession();
        userIdRef.current = session.user.id;
        const { data, error } = await getSupabase()
          .from("sign_profiles")
          .select("samples")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (data && isSamples(data.samples) && Object.keys(data.samples).length > 0) {
          setSamplesState(data.samples);
          writeLocal(data.samples);
        }
        setSync("saved");
      } catch {
        if (!cancelled) setSync("local");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Samples) => {
    writeLocal(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSync("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const session = await ensureSession();
        const { error } = await getSupabase()
          .from("sign_profiles")
          .upsert({ user_id: session.user.id, samples: next, updated_at: new Date().toISOString() });
        if (error) throw error;
        setSync("saved");
      } catch {
        setSync("local");
      }
    }, 600);
  }, []);

  const setSamples = useCallback(
    (updater: Samples | ((prev: Samples) => Samples)) => {
      setSamplesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { samples, setSamples, sync };
}
