"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandFrame } from "@/lib/knn";

const MP_VERSION = "0.10.14";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type TrackerStatus = "idle" | "loading" | "ready" | "denied" | "error";

/** O singură instanță HandLandmarker per pagină (încărcarea modelului durează). */
let landmarkerPromise: Promise<{ landmarker: HandLandmarker; connections: { start: number; end: number }[] }> | null =
  null;

async function getLandmarker() {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const create = (delegate: "GPU" | "CPU") =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    let landmarker: HandLandmarker;
    try {
      landmarker = await create("GPU");
    } catch {
      landmarker = await create("CPU");
    }
    return { landmarker, connections: HandLandmarker.HAND_CONNECTIONS };
  })();
  landmarkerPromise.catch(() => {
    landmarkerPromise = null;
  });
  return landmarkerPromise;
}

/**
 * Camera + MediaPipe HandLandmarker (2 mâini), rulat doar în browser.
 * Desenează scheletul mâinilor peste video și trimite fiecare cadru către onFrame.
 * Video-ul nu se înregistrează și nu se trimite nicăieri.
 */
export function useHandTracker(onFrame: (frame: HandFrame) => void, color = "#60A5FA") {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [handsVisible, setHandsVisible] = useState(0);
  const onFrameRef = useRef(onFrame);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

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
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("loading");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError(
        "Browserul nu permite accesul la cameră. Pe telefon, pagina trebuie deschisă prin HTTPS (vezi README).",
      );
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
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
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    await video.play().catch(() => undefined);

    let tools: Awaited<ReturnType<typeof getLandmarker>>;
    try {
      tools = await getLandmarker();
    } catch {
      setStatus("error");
      setError("Nu am putut încărca modelul de recunoaștere a mâinilor. Verifică conexiunea la internet.");
      return;
    }
    setStatus("ready");

    let lastTime = -1;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const v = videoRef.current;
      const canvas = canvasRef.current;
      if (!v || v.readyState < 2 || v.currentTime === lastTime) return;
      lastTime = v.currentTime;
      const result = tools.landmarker.detectForVideo(v, performance.now());
      const landmarks = result.landmarks ?? [];
      const handedness = (result.handedness ?? result.handednesses ?? []).map((h) => h[0]?.categoryName ?? "");
      if (canvas) drawHands(canvas, v, landmarks, tools.connections, color);
      setHandsVisible((n) => (n === landmarks.length ? n : landmarks.length));
      onFrameRef.current({ landmarks, handedness });
    };
    loop();
  }, [color]);

  useEffect(() => stop, [stop]);

  return { videoRef, canvasRef, status, error, handsVisible, start, stop };
}

function drawHands(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: { x: number; y: number }[][],
  connections: { start: number; end: number }[],
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
