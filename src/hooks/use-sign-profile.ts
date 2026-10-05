"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureSession, getSupabase } from "@/lib/supabase/client";
import { FEATURE_SIZE, FEATURES_PER_HAND, isSamples, type Samples } from "@/lib/knn";
import { isMovingSamples, type MovingExample, type MovingSamples } from "@/lib/moving-signs";
import { BASE_DICTIONARY, buildDictionary, slugify, type CustomWord } from "@/lib/signs";

const LOCAL_KEY = "punte-sign-profile-v2";
/** Al cui e dicționarul din acest browser (id-ul contului), ca să nu-l urcăm în contul altcuiva. */
const OWNER_KEY = "punte-sign-profile-owner";
const PROFILE_VERSION = 2;

export type SyncState = "loading" | "saved" | "saving" | "local" | "error";

/** Unde se salvează dicționarul: contul cu care e conectat elevul (sau o sesiune anonimă). */
export interface SyncAccount {
  id: string;
  /** Emailul contului; null pentru sesiunile anonime (inclusiv contul demo). */
  email: string | null;
  anonymous: boolean;
}

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

function writeLocal(profile: SignProfile, owner?: { id: string; anonymous: boolean }) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
    if (owner) localStorage.setItem(OWNER_KEY, JSON.stringify(owner));
  } catch {
    // stocarea locală poate fi indisponibilă (mod privat)
  }
}

/** Proprietarul dicționarului din browser; null = necunoscut (antrenat înainte de această versiune). */
function readOwner(): { id: string; anonymous: boolean } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(OWNER_KEY) ?? "null");
    return raw && typeof raw.id === "string" ? { id: raw.id, anonymous: !!raw.anonymous } : null;
  } catch {
    return null;
  }
}

function hasContent(p: SignProfile | null): p is SignProfile {
  return !!p && (Object.keys(p.samples).length > 0 || p.dictionary.length > 0 || Object.keys(p.moving).length > 0);
}

/**
 * Dicționarul personal și antrenarea semnelor: salvate în sign_profiles (Supabase),
 * cu rezervă în localStorage când nu există conexiune. Doar landmark-uri, niciodată imagini.
 */
export function useSignProfile() {
  const [profile, setProfileState] = useState<SignProfile>(() => (typeof window === "undefined" ? EMPTY : readLocal()));
  const [sync, setSync] = useState<SyncState>("loading");
  const [account, setAccount] = useState<SyncAccount | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  /**
   * Sincronizarea cu contul: la pornire și la fiecare intrare / ieșire din cont.
   * Contul are deja un dicționar → îl folosim. Contul e gol → urcăm dicționarul din acest
   * browser, dar doar dacă nu e al altui cont (de ex. al altui elev pe același telefon).
   */
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    const load = async () => {
      try {
        setSync("loading");
        const session = await ensureSession();
        if (cancelled) return;
        const user = session.user;
        setAccount({ id: user.id, email: user.email ?? null, anonymous: !!user.is_anonymous });
        const { data, error } = await supabase.from("sign_profiles").select("samples").eq("user_id", user.id).maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        const remote = parseProfile(data?.samples);
        if (hasContent(remote)) {
          setProfileState(remote);
          writeLocal(remote, { id: user.id, anonymous: !!user.is_anonymous });
        } else {
          const local = profileRef.current;
          const owner = readOwner();
          // Al meu: necunoscut, antrenat fără cont (sesiune anonimă) sau chiar cu acest cont.
          const mine = !owner || owner.anonymous || owner.id === user.id;
          if (hasContent(local) && mine) {
            const { error: upErr } = await supabase
              .from("sign_profiles")
              .upsert({ user_id: user.id, samples: local, updated_at: new Date().toISOString() });
            if (upErr) throw upErr;
            writeLocal(local, { id: user.id, anonymous: !!user.is_anonymous });
          } else if (!mine) {
            // Dicționarul din browser e al altui cont: pornim gol, fără să-l amestecăm.
            setProfileState(EMPTY);
            writeLocal(EMPTY, { id: user.id, anonymous: !!user.is_anonymous });
          }
        }
        if (!cancelled) setSync("saved");
      } catch {
        if (!cancelled) setSync("local");
      }
    };
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => void load(), 0);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
        writeLocal(next, { id: session.user.id, anonymous: !!session.user.is_anonymous });
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
    (word: string, phrase?: string, hint?: string) => {
      const clean = word.trim();
      if (!clean) return null;
      const id = slugify(clean);
      setProfile((p) => {
        if (BASE_DICTIONARY.some((s) => s.id === id)) return p;
        if (p.dictionary.some((w) => w.id === id)) {
          if (!phrase && !hint) return p;
          return {
            ...p,
            dictionary: p.dictionary.map((w) =>
              w.id === id ? { ...w, phrase: phrase?.trim() || w.phrase, hint: hint?.trim() || w.hint } : w,
            ),
          };
        }
        return {
          ...p,
          dictionary: [...p.dictionary, { id, word: clean.toUpperCase(), phrase: phrase?.trim() || undefined, hint: hint?.trim() || undefined }],
        };
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
    account,
  };
}
