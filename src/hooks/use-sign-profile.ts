"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureSession, getSupabase } from "@/lib/supabase/client";
import { FEATURE_SIZE, FEATURES_PER_HAND, isSamples, type Samples } from "@/lib/knn";
import { isMovingSamples, type MovingExample, type MovingSamples } from "@/lib/moving-signs";
import { BASE_DICTIONARY, buildDictionary, slugify, type CustomWord } from "@/lib/signs";

const LOCAL_KEY = "punte-sign-profile-v2";
const PROFILE_VERSION = 2;

export type SyncState = "loading" | "saved" | "saving" | "local" | "error";

export interface SignProfile {
  v: number;
  dictionary: CustomWord[];
  samples: Samples;
  /** Semnele cu mișcare (secvențe), pentru semne LSR reale. */
  moving: MovingSamples;
}

const EMPTY: SignProfile = { v: PROFILE_VERSION, dictionary: [], samples: {}, moving: {} };

function isCustomWords(value: unknown): value is CustomWord[] {
  return (
    Array.isArray(value) &&
    value.every((w) => w && typeof w === "object" && typeof w.id === "string" && typeof w.word === "string")
  );
}

/** Acceptă doar profilul v2; formatele vechi (alte caracteristici) se ignoră. */
export function parseProfile(value: unknown): SignProfile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<SignProfile>;
  if (p.v !== PROFILE_VERSION || !isSamples(p.samples) || !isCustomWords(p.dictionary ?? [])) return null;
  const moving = isMovingSamples(p.moving) ? p.moving : {};
  return { v: PROFILE_VERSION, dictionary: p.dictionary ?? [], samples: p.samples, moving };
}

function normalizeWord(w: string) {
  return w
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Importă baza din LSR Translator (localStorage „lsr_samples_v1”):
 * un șir de { word, feature } cu 63 de valori (o mână) sau 68 (cu mănușa).
 */
export function parseLsrExport(value: unknown, current: SignProfile): SignProfile | null {
  if (!Array.isArray(value)) return null;
  const entries = value.filter(
    (s): s is { word: string; feature: number[] } =>
      s && typeof s.word === "string" && Array.isArray(s.feature) && s.feature.length >= FEATURES_PER_HAND,
  );
  if (!entries.length) return null;
  const dictionary = [...current.dictionary];
  const samples: Samples = { ...current.samples };
  const known: { id: string; word: string }[] = [...BASE_DICTIONARY, ...dictionary];
  for (const { word, feature } of entries) {
    let entry = known.find((s) => normalizeWord(s.word) === normalizeWord(word));
    if (!entry) {
      entry = { id: slugify(word), word: word.toUpperCase() } satisfies CustomWord;
      dictionary.push(entry);
      known.push(entry);
    }
    const hand = feature.slice(0, FEATURES_PER_HAND).map(Number);
    const vector = [...hand, ...new Array(FEATURE_SIZE - FEATURES_PER_HAND).fill(0)];
    samples[entry.id] = [...(samples[entry.id] ?? []), vector];
  }
  return { v: PROFILE_VERSION, dictionary, samples, moving: current.moving };
}

function readLocal(): SignProfile {
  try {
    return parseProfile(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null")) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(profile: SignProfile) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
  } catch {
    // stocarea locală poate fi indisponibilă (mod privat)
  }
}

/**
 * Dicționarul personal și antrenarea semnelor: salvate în sign_profiles (Supabase),
 * cu rezervă în localStorage când nu există conexiune. Doar landmark-uri, niciodată imagini.
 */
export function useSignProfile() {
  const [profile, setProfileState] = useState<SignProfile>(() => (typeof window === "undefined" ? EMPTY : readLocal()));
  const [sync, setSync] = useState<SyncState>("loading");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await ensureSession();
        const { data, error } = await getSupabase()
          .from("sign_profiles")
          .select("samples")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        const remote = parseProfile(data?.samples);
        if (remote && (Object.keys(remote.samples).length > 0 || remote.dictionary.length > 0 || Object.keys(remote.moving).length > 0)) {
          setProfileState(remote);
          writeLocal(remote);
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

  const persist = useCallback((next: SignProfile) => {
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

  const setProfile = useCallback(
    (updater: SignProfile | ((prev: SignProfile) => SignProfile)) => {
      setProfileState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setSamples = useCallback(
    (updater: (prev: Samples) => Samples) => setProfile((p) => ({ ...p, samples: updater(p.samples) })),
    [setProfile],
  );

  const addMoving = useCallback(
    (id: string, example: MovingExample) =>
      setProfile((p) => ({ ...p, moving: { ...p.moving, [id]: [...(p.moving[id] ?? []), example].slice(-12) } })),
    [setProfile],
  );

  const resetMoving = useCallback(
    (id: string) =>
      setProfile((p) => {
        const moving = { ...p.moving };
        delete moving[id];
        return { ...p, moving };
      }),
    [setProfile],
  );

  const addWord = useCallback(
    (word: string, phrase?: string) => {
      const clean = word.trim();
      if (!clean) return null;
      const id = slugify(clean);
      setProfile((p) => {
        if (BASE_DICTIONARY.some((s) => s.id === id) || p.dictionary.some((w) => w.id === id)) return p;
        return { ...p, dictionary: [...p.dictionary, { id, word: clean.toUpperCase(), phrase: phrase?.trim() || undefined }] };
      });
      return id;
    },
    [setProfile],
  );

  const removeWord = useCallback(
    (id: string) =>
      setProfile((p) => {
        const samples = { ...p.samples };
        delete samples[id];
        const moving = { ...p.moving };
        delete moving[id];
        return { ...p, dictionary: p.dictionary.filter((w) => w.id !== id), samples, moving };
      }),
    [setProfile],
  );

  const dictionary = useMemo(() => buildDictionary(profile.dictionary), [profile.dictionary]);

  return {
    profile,
    samples: profile.samples,
    moving: profile.moving,
    dictionary,
    setProfile,
    setSamples,
    addMoving,
    resetMoving,
    addWord,
    removeWord,
    sync,
  };
}
