"use client";

import { useEffect, useRef, useState } from "react";
import {
  classifyFaces,
  loadFastFaceDetector,
  MATCH_THRESHOLD,
  readRegistration,
  type FaceRegistration,
} from "@/lib/face/face-id";
import { FaceTracker, type Track } from "@/lib/face/face-tracker";

/** Verificarea identității (face-api, cu descriptori) — mai lentă, deci la interval. */
const IDENTITY_EVERY_MS = 600;
/** Dacă detecția rapidă nu mai răspunde atâta timp, estompăm tot cadrul. */
const STALL_MS = 1200;
/** Cât de mult extindem zona estompată în jurul feței (păr, urechi, mișcare). */
const PAD_X = 0.38;
const PAD_TOP = 0.55;
const PAD_BOTTOM = 0.3;

export type PrivacyStatus = "off" | "loading" | "active" | "error";

export function useRegistration() {
  const [registration, setRegistration] = useState<FaceRegistration | null>(() => readRegistration());
  useEffect(() => {
    const update = () => setRegistration(readRegistration());
    window.addEventListener("punte-face-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("punte-face-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return registration;
}

const canvasFilter = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

/**
 * Confidențialitate GDPR: pe imaginea camerei, toate fețele în afară de cea a elevului înregistrat
 * sunt estompate. Detecție BlazeFace la fiecare cadru + urmărire cu predicție de mișcare; identitatea
 * se verifică cu face-api la ~0,6 s. Fail-closed: o față pierdută rămâne estompată, iar dacă detecția
 * se blochează se estompează tot cadrul. Totul rulează local; nimic nu se salvează.
 */
export function useFacePrivacy(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  registration: FaceRegistration | null,
) {
  const privacyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<PrivacyStatus>("off");
  const [summary, setSummary] = useState({ faces: 0, blurred: 0, studentFound: false });
  const regRef = useRef(registration);

  useEffect(() => {
    regRef.current = registration;
  }, [registration]);

  useEffect(() => {
    if (!active) {
      const canvas = privacyCanvasRef.current;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      queueMicrotask(() => setStatus("off"));
      return;
    }
    let cancelled = false;
    let raf = 0;
    let identityTimer: ReturnType<typeof setTimeout> | undefined;
    const tracker = new FaceTracker();
    let lastFastAt = 0;
    let fastReady = false;
    let identityReady = false;
    let identityFailed = false;
    let fastFailed = false;
    let fast: Awaited<ReturnType<typeof loadFastFaceDetector>> | null = null;
    const tiny = document.createElement("canvas");
    const tctx = tiny.getContext("2d");
    queueMicrotask(() => setStatus("loading"));

    const report = (tracks: Track[]) => {
      const blurred = tracks.filter((t) => !t.isStudent).length;
      const studentFound = tracks.some((t) => t.isStudent);
      setSummary((s) =>
        s.faces === tracks.length && s.blurred === blurred && s.studentFound === studentFound
          ? s
          : { faces: tracks.length, blurred, studentFound },
      );
    };

    // Identitatea: face-api la interval. E și detectorul de rezervă (fețe mai îndepărtate).
    const identity = async () => {
      const video = videoRef.current;
      if (cancelled) return;
      if (video && video.readyState >= 2) {
        try {
          const found = await classifyFaces(video, regRef.current);
          if (cancelled) return;
          tracker.applyIdentity(found, MATCH_THRESHOLD, performance.now());
          identityReady = true;
        } catch {
          identityFailed = true;
        }
      }
      identityTimer = setTimeout(identity, IDENTITY_EVERY_MS);
    };
    void identity();

    loadFastFaceDetector()
      .then((d) => {
        fast = d;
      })
      .catch(() => {
        // Fără BlazeFace rămâne doar face-api (mai lent, dar tot fail-closed).
        fastFailed = true;
      });

    const blurRegion = (
      ctx: CanvasRenderingContext2D,
      video: HTMLVideoElement,
      x: number,
      y: number,
      bw: number,
      bh: number,
      shape: "ellipse" | "rect",
    ) => {
      if (!tctx || bw < 2 || bh < 2) return;
      // Micșorăm la ~12 px și mărim cu netezire: o pată fără detalii, imposibil de recunoscut.
      tiny.width = 12;
      tiny.height = Math.max(2, Math.round((12 * bh) / bw));
      tctx.imageSmoothingEnabled = true;
      tctx.drawImage(video, x, y, bw, bh, 0, 0, tiny.width, tiny.height);
      ctx.save();
      if (shape === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(x + bw / 2, y + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.imageSmoothingEnabled = true;
      if (canvasFilter) ctx.filter = `blur(${Math.max(4, Math.round(bw / 18))}px)`;
      // Desenăm puțin peste margini, ca blur-ul să nu lase un contur clar.
      ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, x - 8, y - 8, bw + 16, bh + 16);
      ctx.restore();
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const video = videoRef.current;
      const canvas = privacyCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const now = performance.now();

      if (fast) {
        try {
          tracker.update(fast(video, now), now);
          lastFastAt = now;
          fastReady = true;
        } catch {
          fast = null;
          fastFailed = true;
        }
      }

      // Activ când avem cel puțin o sursă de detecție. Doar face-api, dacă BlazeFace lipsește.
      const ready = fastReady || (fastFailed && identityReady);
      if (ready) setStatus((s) => (s === "active" ? s : "active"));
      else if (identityFailed && fastFailed) setStatus((s) => (s === "error" ? s : "error"));

      ctx.clearRect(0, 0, w, h);
      // Detecția s-a blocat (tab inactiv, GPU pierdut): estompăm tot, nu ghicim.
      const stalled = fastReady && !fast ? false : fastReady && now - lastFastAt > STALL_MS;
      if (!ready || stalled) {
        blurRegion(ctx, video, 0, 0, w, h, "rect");
        return;
      }
      for (const t of tracker.tracks) {
        if (t.isStudent) continue;
        const p = tracker.predict(t, now);
        // Cu cât fața lipsește mai mult, cu atât zona crește (poate s-a mișcat).
        const grow = 1 + Math.min(0.6, (now - t.lastSeen) / 1000);
        const bw = p.width * (1 + 2 * PAD_X) * grow;
        const bh = p.height * (1 + PAD_TOP + PAD_BOTTOM) * grow;
        const cx = p.x + p.width / 2;
        const x = Math.max(0, cx - bw / 2);
        const y = Math.max(0, p.y - p.height * PAD_TOP * grow);
        blurRegion(ctx, video, x, y, Math.min(w - x, bw), Math.min(h - y, bh), "ellipse");
      }
      report(tracker.tracks);
    };
    draw();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(identityTimer);
      tracker.reset();
    };
  }, [active, videoRef]);

  return { privacyCanvasRef, status, ...summary };
}
