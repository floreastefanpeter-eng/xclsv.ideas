"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker, HolisticLandmarker } from "@mediapipe/tasks-vision";
import type { HandFrame, Landmark } from "@/lib/knn";
import { holisticFrame } from "@/lib/asl/preprocess";
import { openCamera } from "@/lib/camera";
import { HandSmoother } from "@/lib/one-euro";
import { getVision, withDelegateFallback as withFallback } from "@/lib/vision";

const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const HOLISTIC_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task";

export type TrackerStatus = "idle" | "loading" | "ready" | "denied" | "error";
export type TrackerMode = "hands" | "holistic";

export interface VisionFrame {
  hands: HandFrame;
  /** Cadrul Holistic (543 × 2) pentru modelul ASL; doar în modul „holistic”. */
  holistic: Float32Array | null;
}

type Connection = { start: number; end: number };

interface Tools {
  detect: (video: HTMLVideoElement, ts: number) => { hands: HandFrame; holistic: Float32Array | null; shoulders: number | null; posePresent: boolean };
  connections: Connection[];
}

const toolCache = new Map<TrackerMode, Promise<Tools>>();

async function getTools(mode: TrackerMode): Promise<Tools> {
  const cached = toolCache.get(mode);
  if (cached) return cached;
  const promise = (async (): Promise<Tools> => {
    const { mp, vision } = await getVision();
    const connections = mp.HandLandmarker.HAND_CONNECTIONS;

    if (mode === "hands") {
      const landmarker: HandLandmarker = await withFallback((delegate) =>
        mp.HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        }),
      );
      return {
        connections,
        detect: (video, ts) => {
          const r = landmarker.detectForVideo(video, ts);
          return {
            hands: {
              landmarks: r.landmarks ?? [],
              handedness: (r.handedness ?? r.handednesses ?? []).map((h) => h[0]?.categoryName ?? ""),
            },
            holistic: null,
            shoulders: null,
            posePresent: false,
          };
        },
      };
    }

    const landmarker: HolisticLandmarker = await withFallback((delegate) =>
      mp.HolisticLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: HOLISTIC_MODEL_URL, delegate },
        runningMode: "VIDEO",
      }),
    );
    return {
      connections,
      detect: (video, ts) => {
        const r = landmarker.detectForVideo(video, ts);
        const left = r.leftHandLandmarks?.[0];
        const right = r.rightHandLandmarks?.[0];
        const landmarks: Landmark[][] = [];
        const handedness: string[] = [];
        if (left?.length) {
          landmarks.push(left);
          handedness.push("Left");
        }
        if (right?.length) {
          landmarks.push(right);
          handedness.push("Right");
        }
        const pose = r.poseLandmarks?.[0];
        const shoulders = pose?.[11] && pose?.[12] ? Math.hypot(pose[11].x - pose[12].x, pose[11].y - pose[12].y) : null;
        return {
          hands: { landmarks, handedness },
          holistic: holisticFrame(r),
          shoulders,
          posePresent: !!pose?.length,
        };
      },
    };
  })();
  toolCache.set(mode, promise);
  promise.catch(() => toolCache.delete(mode));
  return promise;
}

/** Monotonic între toate camerele și modurile (MediaPipe cere timestamp-uri crescătoare). */
let clock = 0;

/**
 * Camera + MediaPipe (HandLandmarker sau HolisticLandmarker), rulat doar în browser.
 * Desenează scheletul mâinilor peste video, oferă un ghid de încadrare și trimite fiecare cadru la onFrame.
 * Video-ul nu se înregistrează și nu se trimite nicăieri.
 */
export function useHandTracker(onFrame: (frame: VisionFrame) => void, color = "#6C93FF", mode: TrackerMode = "hands") {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [handsVisible, setHandsVisible] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const onFrameRef = useRef(onFrame);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  /** Cutiile mâinilor din ultimul cadru (0–1): o „față” găsită în mână nu e o față. */
  const handBoxesRef = useRef<{ x: number; y: number; width: number; height: number }[]>([]);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setHandsVisible(0);
    setHint(null);
  }, []);

  const start = useCallback(async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setError(null);
    setStatus("loading");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Browserul nu permite accesul la cameră. Pe telefon, pagina trebuie deschisă prin HTTPS (vezi README).");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await openCamera();
    } catch (e) {
      const name = (e as DOMException)?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      setError(
        name === "NotAllowedError"
          ? "Accesul la cameră a fost refuzat. Permite camera din bara de adrese a browserului și încearcă din nou."
          : name === "NotFoundError"
            ? "Nu am găsit nicio cameră pe acest dispozitiv."
            : "Nu am putut porni camera. Închide alte aplicații care o folosesc și încearcă din nou.",
      );
      return;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    await video.play().catch(() => undefined);

    let tools: Tools;
    try {
      tools = await getTools(mode);
    } catch {
      setStatus("error");
      setError("Nu am putut încărca modelul de recunoaștere. Verifică conexiunea la internet.");
      return;
    }
    setStatus("ready");

    const smoother = new HandSmoother();
    let lastTime = -1;
    let frameNo = 0;
    let noPersonFrames = 0;
    let brightness = 128;
    const probe = document.createElement("canvas");
    probe.width = 32;
    probe.height = 24;
    const probeCtx = probe.getContext("2d", { willReadFrequently: true });

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const v = videoRef.current;
      const canvas = canvasRef.current;
      if (!v || v.readyState < 2 || v.currentTime === lastTime) return;
      lastTime = v.currentTime;
      clock = Math.max(clock + 1, performance.now());
      const raw = tools.detect(v, clock);
      // Mâinile netezite (One Euro) pentru desen și dicționar; cadrul Holistic rămâne brut pentru modelul ASL.
      const r = { ...raw, hands: { ...raw.hands, landmarks: smoother.apply(raw.hands.landmarks, raw.hands.handedness, clock) } };
      if (canvas) drawHands(canvas, v, r.hands.landmarks, tools.connections, color);
      setHandsVisible((n) => (n === r.hands.landmarks.length ? n : r.hands.landmarks.length));

      // Ghidul de încadrare: lumină, distanță, mâini ieșite din cadru.
      frameNo++;
      if (probeCtx && frameNo % 30 === 0) {
        probeCtx.drawImage(v, 0, 0, 32, 24);
        const px = probeCtx.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        brightness = sum / (px.length / 4);
      }
      const person = r.posePresent || r.hands.landmarks.length > 0;
      noPersonFrames = person ? 0 : noPersonFrames + 1;
      // Pragurile au fost calibrate pe 4:3; pe 16:9 umerii par mai înguști în coordonate normalizate.
      const shoulders = r.shoulders === null ? null : r.shoulders * (v.videoWidth / v.videoHeight / (4 / 3));
      const edge = r.hands.landmarks.some((h) => h.some((p) => p.x < 0.02 || p.x > 0.98 || p.y < 0.02 || p.y > 0.98));
      const next =
        brightness < 55
          ? "Lumină slabă — aprinde o lumină în fața ta"
          : noPersonFrames > 45
            ? "Nu te văd — așază-te în fața camerei"
            : shoulders !== null && shoulders > 0.62
              ? "Prea aproape — dă-te puțin înapoi"
              : shoulders !== null && shoulders < 0.16
                ? "Prea departe — vino mai aproape"
                : edge
                  ? "Mâna iese din cadru"
                  : null;
      setHint((h) => (h === next ? h : next));

      handBoxesRef.current = raw.hands.landmarks.map((hand) => {
        let x0 = 1,
          y0 = 1,
          x1 = 0,
          y1 = 0;
        for (const p of hand) {
          x0 = Math.min(x0, p.x);
          y0 = Math.min(y0, p.y);
          x1 = Math.max(x1, p.x);
          y1 = Math.max(y1, p.y);
        }
        // Puțină margine: degetele ies din punctele detectate.
        const mx = (x1 - x0) * 0.15;
        const my = (y1 - y0) * 0.15;
        return { x: x0 - mx, y: y0 - my, width: x1 - x0 + 2 * mx, height: y1 - y0 + 2 * my };
      });

      onFrameRef.current({ hands: r.hands, holistic: r.holistic });
    };
    loop();
  }, [color, mode]);

  useEffect(() => stop, [stop]);

  return { videoRef, canvasRef, status, error, handsVisible, hint, start, stop, handBoxesRef };
}

function drawHands(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: { x: number; y: number }[][],
  connections: Connection[],
  color: string,
) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  for (const hand of hands) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, w / 160);
    ctx.lineCap = "round";
    for (const c of connections) {
      const a = hand[c.start];
      const b = hand[c.end];
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
    ctx.fillStyle = "#FFFFFF";
    for (const p of hand) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, Math.max(3, w / 140), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
