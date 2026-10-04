"use client";

/** MediaPipe Tasks Vision: un singur set de fișiere WASM pentru mâini, corp și fețe. */
export const MP_VERSION = "0.10.14";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;

type Mp = typeof import("@mediapipe/tasks-vision");
type Fileset = Awaited<ReturnType<Mp["FilesetResolver"]["forVisionTasks"]>>;

let filesetPromise: Promise<{ mp: Mp; vision: Fileset }> | null = null;

export function getVision() {
  if (filesetPromise) return filesetPromise;
  filesetPromise = (async () => {
    const mp = await import("@mediapipe/tasks-vision");
    const vision = await mp.FilesetResolver.forVisionTasks(WASM_URL);
    return { mp, vision };
  })();
  filesetPromise.catch(() => {
    filesetPromise = null;
  });
  return filesetPromise;
}

/** Încearcă GPU, apoi CPU (unele telefoane nu au WebGL2). */
export async function withDelegateFallback<T>(create: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await create("GPU");
  } catch {
    return await create("CPU");
  }
}
