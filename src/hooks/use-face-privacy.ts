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
  /** Cutiile mâinilor (0–1) de la useHandTracker: nu estompăm o mână confundată cu o față. */
  handBoxesRef?: React.RefObject<{ x: number; y: number; width: number; height: number }[]>,
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
    // Cadrul estompat, la rezoluție mică (ieftin): se calculează o singură dată pe cadru.
    const soft = document.createElement("canvas");
    const sctx = soft.getContext("2d");
    const tiny = document.createElement("canvas");
    const tctx = tiny.getContext("2d");
    // Stratul cu ovalele fețelor: măștile cu margini moi, apoi imaginea estompată doar în ele.
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d");
    /** Ovalul afișat pentru fiecare față, netezit între cadre (fără „pulsații”). */
    const shown = new Map<number, { cx: number; cy: number; rx: number; ry: number }>();
    queueMicrotask(() => setStatus("loading"));

    const handsPx = (video: HTMLVideoElement) =>
      (handBoxesRef?.current ?? []).map((b) => ({
        x: b.x * video.videoWidth,
        y: b.y * video.videoHeight,
        width: b.width * video.videoWidth,
        height: b.height * video.videoHeight,
      }));

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
          tracker.applyIdentity(found, MATCH_THRESHOLD, performance.now(), handsPx(video));
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

    /** Tot cadrul, estompat puternic: la ~1/8 din rezoluție + blur, apoi mărit cu netezire. */
    const blurFrame = (video: HTMLVideoElement, w: number, h: number) => {
      if (!sctx) return false;
      const sw = Math.max(16, Math.round(w / 8));
      const sh = Math.max(12, Math.round(h / 8));
      if (soft.width !== sw) soft.width = sw;
      if (soft.height !== sh) soft.height = sh;
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = "high";
      if (canvasFilter) {
        sctx.filter = "blur(2.5px)";
        // Desenăm puțin mai mare, ca marginile blur-ului să nu se întunece.
        sctx.drawImage(video, -4, -4, sw + 8, sh + 8);
        sctx.filter = "none";
      } else if (tctx) {
        // Safari vechi: două micșorări succesive dau un blur moale, fără canvas.filter.
        tiny.width = Math.max(4, Math.round(sw / 3));
        tiny.height = Math.max(3, Math.round(sh / 3));
        tctx.imageSmoothingEnabled = true;
        tctx.drawImage(video, 0, 0, tiny.width, tiny.height);
        sctx.drawImage(tiny, 0, 0, sw, sh);
      }
      return true;
    };

    /** Ovalele fețelor: miez opac (fața e acoperită complet), margine moale spre exterior. */
    const drawFaces = (ctx: CanvasRenderingContext2D, w: number, h: number, faces: { cx: number; cy: number; rx: number; ry: number }[]) => {
      if (!lctx || !faces.length) return;
      if (layer.width !== w) layer.width = w;
      if (layer.height !== h) layer.height = h;
      lctx.globalCompositeOperation = "source-over";
      lctx.clearRect(0, 0, w, h);
      for (const f of faces) {
        lctx.save();
        lctx.translate(f.cx, f.cy);
        lctx.scale(f.rx, f.ry);
        const g = lctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(0.8, "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.arc(0, 0, 1, 0, Math.PI * 2);
        lctx.fill();
        lctx.restore();
      }
      lctx.globalCompositeOperation = "source-in";
      lctx.imageSmoothingEnabled = true;
      lctx.drawImage(soft, 0, 0, w, h);
      ctx.drawImage(layer, 0, 0);
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
          tracker.update(fast(video, now), now, handsPx(video));
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
      if (!blurFrame(video, w, h)) return;
      if (!ready || stalled) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(soft, 0, 0, w, h);
        return;
      }
      const faces: { cx: number; cy: number; rx: number; ry: number }[] = [];
      const alive = new Set<number>();
      for (const t of tracker.tracks) {
        if (t.isStudent) continue;
        alive.add(t.id);
        const p = tracker.predict(t, now);
        // Cu cât fața lipsește mai mult, cu atât ovalul crește puțin (poate s-a mișcat).
        const grow = 1 + Math.min(0.35, (now - t.lastSeen) / 1500);
        const target = {
          cx: p.x + p.width / 2,
          // Ovalul urcă puțin peste frunte și păr.
          cy: p.y + p.height / 2 - (p.height * (PAD_TOP - PAD_BOTTOM)) / 2,
          rx: p.width * (0.5 + PAD_X) * grow,
          ry: p.height * (0.5 + (PAD_TOP + PAD_BOTTOM) / 2) * grow,
        };
        const prev = shown.get(t.id);
        // Poziția urmează repede; mărimea se schimbă lin. Ovalul nu se micșorează brusc.
        const next = prev
          ? {
              cx: prev.cx + (target.cx - prev.cx) * 0.6,
              cy: prev.cy + (target.cy - prev.cy) * 0.6,
              rx: Math.max(target.rx, prev.rx + (target.rx - prev.rx) * 0.2),
              ry: Math.max(target.ry, prev.ry + (target.ry - prev.ry) * 0.2),
            }
          : target;
        shown.set(t.id, next);
        faces.push(next);
      }
      for (const id of shown.keys()) if (!alive.has(id)) shown.delete(id);
      drawFaces(ctx, w, h, faces);
            report(tracker.tracks);
    };
    draw();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(identityTimer);
      tracker.reset();
    };
  }, [active, videoRef, handBoxesRef]);

  return { privacyCanvasRef, status, ...summary };
}
