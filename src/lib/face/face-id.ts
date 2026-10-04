"use client";

/**
 * Face ID pentru înregistrarea elevului, rulat doar în browser (face-api, MIT).
 * Șablonul feței (descriptori de 128 de numere) se păstrează DOAR pe acest dispozitiv,
 * în localStorage. Nu se trimite la server și nu se salvează nicio imagine.
 */

const FACE_API_VERSION = "1.7.15";
const MODEL_URL = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${FACE_API_VERSION}/model`;
const STORAGE_KEY = "punte-face-v1";

/** Distanța euclidiană maximă între descriptori pentru „aceeași persoană” (face-api recomandă 0,6; noi suntem mai stricți). */
export const MATCH_THRESHOLD = 0.5;

export interface FaceRegistration {
  name: string;
  descriptors: number[][];
  consent: { guardian: boolean; at: string };
  createdAt: string;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** true = fața elevului înregistrat (nu se estompează). */
  isStudent: boolean;
  distance: number | null;
}

type FaceApi = typeof import("@vladmandic/face-api/dist/face-api.esm.js");

let faceApiPromise: Promise<FaceApi> | null = null;

export function loadFaceApi(): Promise<FaceApi> {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = (async () => {
    const faceapi = await import("@vladmandic/face-api/dist/face-api.esm.js");
    await (faceapi.tf as unknown as { ready?: () => Promise<void> }).ready?.();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    return faceapi;
  })();
  faceApiPromise.catch(() => {
    faceApiPromise = null;
  });
  return faceApiPromise;
}

/** Toate fețele din cadru, cu descriptorii lor. */
export async function detectFaces(input: HTMLVideoElement) {
  const faceapi = await loadFaceApi();
  return faceapi
    .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
    .withFaceLandmarks(true)
    .withFaceDescriptors();
}

function euclidean(a: ArrayLike<number>, b: ArrayLike<number>) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Cea mai mică distanță față de descriptorii înregistrați. */
export function distanceTo(registration: FaceRegistration, descriptor: ArrayLike<number>) {
  return Math.min(...registration.descriptors.map((d) => euclidean(d, descriptor)));
}

/** Fețele din cadru, marcate: elevul înregistrat sau altcineva (de estompat). */
export async function classifyFaces(video: HTMLVideoElement, registration: FaceRegistration | null): Promise<FaceBox[]> {
  const results = await detectFaces(video);
  const boxes = results.map((r) => {
    const box = r.detection.box;
    const distance = registration ? distanceTo(registration, r.descriptor) : null;
    return { x: box.x, y: box.y, width: box.width, height: box.height, distance, isStudent: false };
  });
  // Doar cea mai apropiată potrivire sub prag este elevul; restul se estompează.
  let best = -1;
  boxes.forEach((b, i) => {
    if (b.distance !== null && b.distance < MATCH_THRESHOLD && (best < 0 || b.distance < boxes[best].distance!)) best = i;
  });
  if (best >= 0) boxes[best].isStudent = true;
  return boxes;
}

export function readRegistration(): FaceRegistration | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!raw || typeof raw.name !== "string" || !Array.isArray(raw.descriptors) || !raw.descriptors.length) return null;
    if (!raw.descriptors.every((d: unknown) => Array.isArray(d) && d.length === 128)) return null;
    return raw as FaceRegistration;
  } catch {
    return null;
  }
}

export function saveRegistration(reg: FaceRegistration) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reg));
  window.dispatchEvent(new Event("punte-face-changed"));
}

/** Dreptul la ștergere: elimină complet șablonul feței de pe dispozitiv. */
export function deleteRegistration() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // stocarea locală indisponibilă
  }
  window.dispatchEvent(new Event("punte-face-changed"));
}

// ---------------------------------------------------------------
// Detecția rapidă (fiecare cadru): MediaPipe BlazeFace, ~1–3 ms pe GPU.
// ---------------------------------------------------------------
const BLAZE_FACE_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

type FastDetector = (video: HTMLVideoElement, ts: number) => { x: number; y: number; width: number; height: number }[];
let fastPromise: Promise<FastDetector> | null = null;

export function loadFastFaceDetector(): Promise<FastDetector> {
  if (fastPromise) return fastPromise;
  fastPromise = (async () => {
    const { getVision, withDelegateFallback } = await import("@/lib/vision");
    const { mp, vision } = await getVision();
    const detector = await withDelegateFallback((delegate) =>
      mp.FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: BLAZE_FACE_URL, delegate },
        runningMode: "VIDEO",
        // Prag mic: preferăm să estompăm și o „față” falsă decât să scăpăm una reală.
        minDetectionConfidence: 0.35,
        minSuppressionThreshold: 0.3,
      }),
    );
    let last = 0;
    return (video, ts) => {
      last = Math.max(last + 1, ts);
      const r = detector.detectForVideo(video, last);
      return (r.detections ?? [])
        .map((d) => d.boundingBox)
        .filter((b): b is NonNullable<typeof b> => !!b)
        .map((b) => ({ x: b.originX, y: b.originY, width: b.width, height: b.height }));
    };
  })();
  fastPromise.catch(() => {
    fastPromise = null;
  });
  return fastPromise;
}

// Doar în dezvoltare: permite verificarea încărcării modelelor din consola browserului.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as { __punteFace?: typeof loadFaceApi }).__punteFace = loadFaceApi;
}
