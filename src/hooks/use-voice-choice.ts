"use client";

import { useEffect, useState } from "react";
import { getRomanianVoices, loadVoices, speechSynthesisSupported } from "@/lib/speech";
import type { VoiceStyle } from "@/lib/types";

const KEY = "punte-voice";

function readSaved(): { name?: string | null; style?: VoiceStyle } | null {
  try {
    if (typeof window === "undefined") return null;
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null; // preferințe corupte sau stocare indisponibilă
  }
}

/** Vocea elevului: o voce ro-RO disponibilă + un stil (Adolescent, Calm, Energic). */
export function useVoiceChoice() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [voiceName, setVoiceName] = useState<string | null>(() => readSaved()?.name ?? null);
  const [style, setStyle] = useState<VoiceStyle>(() => readSaved()?.style ?? "adolescent");

  useEffect(() => {
    if (!speechSynthesisSupported()) {
      queueMicrotask(() => setLoaded(true));
      return;
    }
    loadVoices().then(() => {
      setVoices(getRomanianVoices());
      setLoaded(true);
    });
    const onChange = () => setVoices(getRomanianVoices());
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ name: voiceName, style }));
    } catch {
      // stocarea locală indisponibilă
    }
  }, [voiceName, style]);

  return { voices, loaded, voiceName, setVoiceName, style, setStyle };
}
