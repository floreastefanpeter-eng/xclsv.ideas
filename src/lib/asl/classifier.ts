"use client";

import { INPUT_SIZE, N_COLS, type AslWindow } from "./preprocess";

const LITERT_VERSION = "2.5.3";
const LITERT_WASM = `https://cdn.jsdelivr.net/npm/@litertjs/core@${LITERT_VERSION}/wasm/`;
const MODEL_URL = "/models/asl/asl_int8.tflite";
const SIGNS_URL = "/models/asl/signs.json";

export interface AslPrediction {
  /** Top 3: [glosa ASL, probabilitate]. */
  top: [string, number][];
  ms: number;
}

export type AslClassifier = (window: AslWindow) => Promise<AslPrediction>;

let classifierPromise: Promise<AslClassifier> | null = null;

/**
 * ASL Realtime Transformer (CC BY 4.0, Ceyda Akın), antrenat pe Google Isolated Sign Language
 * Recognition (250 de semne, 21 de semnatari surzi). Rulează în browser cu LiteRT.js (WebAssembly).
 */
export function loadAslClassifier(): Promise<AslClassifier> {
  if (classifierPromise) return classifierPromise;
  classifierPromise = (async () => {
    const { Tensor, loadAndCompile, loadLiteRt } = await import("@litertjs/core");
    await loadLiteRt(LITERT_WASM);
    const [model, signs] = await Promise.all([
      loadAndCompile(MODEL_URL, { accelerator: "wasm" }),
      fetch(SIGNS_URL).then((r) => r.json() as Promise<string[]>),
    ]);
    // Convertorul nu păstrează numele intrărilor: le deosebim după rang.
    const xyFirst = model.getInputDetails()[0].shape.length === 4;

    const classify: AslClassifier = async ({ xy, mask }: AslWindow) => {
      const inputs = [new Tensor(xy, [1, INPUT_SIZE, N_COLS, 2]), new Tensor(mask, [1, INPUT_SIZE])];
      const start = performance.now();
      const outputs = await model.run(xyFirst ? inputs : [...inputs].reverse());
      const probs = Array.from(outputs[0].toTypedArray() as Float32Array);
      const ms = performance.now() - start;
      [...inputs, ...outputs].forEach((t) => t.delete());
      const top = probs
        .map((p, i): [string, number] => [signs[i], p])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      return { top, ms };
    };
    // Doar în dezvoltare: permite testarea modelului din consola browserului.
    if (process.env.NODE_ENV === "development") {
      (globalThis as { __punteAsl?: AslClassifier }).__punteAsl = classify;
    }
    return classify;
  })();
  classifierPromise.catch(() => {
    classifierPromise = null;
  });
  return classifierPromise;
}
