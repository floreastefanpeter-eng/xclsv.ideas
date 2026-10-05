"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { micHelp } from "@/lib/platform";
import { getRecognitionCtor, type RecognitionLike } from "@/lib/speech";

export type MicStatus = "unsupported" | "off" | "starting" | "listening" | "denied" | "error";

/**
 * Recunoaștere vocală ro-RO, continuă, cu rezultate interimare.
 * Repornește automat când browserul o oprește (Chrome o oprește după pauze lungi).
 * Audio-ul nu se salvează: doar textul ajunge în aplicație.
 */
export function useSpeechRecognition(handlers: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
}) {
  const [status, setStatus] = useState<MicStatus>(() => (getRecognitionCtor() ? "off" : "unsupported"));
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const wantOn = useRef(false);
  const handlersRef = useRef(handlers);
  const restarts = useRef(0);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const restartRef = useRef<() => void>(() => undefined);

  const startRecognition = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    const rec = new Ctor();
    rec.lang = "ro-RO";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      setStatus("listening");
      setError(null);
    };
    rec.onresult = (e) => {
      restarts.current = 0;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          if (text.trim()) handlersRef.current.onFinal(text.trim());
        } else interim += text;
      }
      handlersRef.current.onInterim(interim.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantOn.current = false;
        setStatus("denied");
        // Pe iPhone, „service-not-allowed” înseamnă de obicei că dictarea Apple e oprită.
        setError(micHelp(e.error === "service-not-allowed" ? "dictation" : "denied"));
      } else if (e.error === "audio-capture") {
        wantOn.current = false;
        setStatus("error");
        setError("Nu am găsit niciun microfon.");
      } else if (e.error === "network") {
        setError("Recunoașterea vocală are nevoie de internet. Reîncerc…");
      }
      // „no-speech” și „aborted” sunt normale: repornim din onend.
    };
    rec.onend = () => {
      handlersRef.current.onInterim("");
      if (wantOn.current && restarts.current < 50) {
        restarts.current++;
        setTimeout(() => {
          if (wantOn.current) restartRef.current();
        }, 250);
      } else if (!wantOn.current) {
        setStatus((s) => (s === "denied" || s === "error" ? s : "off"));
      }
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      // deja pornit
    }
  }, []);

  useEffect(() => {
    restartRef.current = startRecognition;
  }, [startRecognition]);

  const start = useCallback(() => {
    wantOn.current = true;
    restarts.current = 0;
    setStatus("starting");
    startRecognition();
  }, [startRecognition]);

  const stop = useCallback(() => {
    wantOn.current = false;
    recRef.current?.stop();
    setStatus("off");
  }, []);

  useEffect(
    () => () => {
      wantOn.current = false;
      recRef.current?.abort();
    },
    [],
  );

  return { status, error, start, stop };
}
