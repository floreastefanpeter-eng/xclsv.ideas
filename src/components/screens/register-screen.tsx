"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Camera, Check, Loader2, ScanFace, ShieldCheck, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StationBand } from "@/components/punte/station-band";
import { useRegistration } from "@/hooks/use-face-privacy";
import { deleteRegistration, detectFaces, loadFaceApi, saveRegistration } from "@/lib/face/face-id";
import { openCamera, videoAspect } from "@/lib/camera";
import { cn } from "@/lib/utils";

const SAMPLES = 5;
const SAMPLE_EVERY_MS = 450;

type Step = "details" | "scan" | "done";

export default function RegisterScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const registration = useRegistration();

  const [step, setStep] = useState<Step>(registration ? "done" : "details");
  const [name, setName] = useState(registration?.name ?? "");
  const [consentStudent, setConsentStudent] = useState(!!registration);
  const [consentGuardian, setConsentGuardian] = useState(!!registration?.consent.guardian);
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "scanning" | "error">("idle");
  const [hint, setHint] = useState("Privește camera, singur în cadru.");
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const samples = useRef<number[][]>([]);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const finish = useCallback(() => {
    stopCamera();
    saveRegistration({
      name: name.trim(),
      descriptors: samples.current,
      consent: { guardian: consentGuardian, at: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    });
    setStep("done");
    setScanStatus("idle");
  }, [stopCamera, name, consentGuardian]);

  const [aspect, setAspect] = useState(4 / 3);

  const startScan = useCallback(async () => {
    setError(null);
    setScanStatus("loading");
    samples.current = [];
    setCount(0);
    try {
      const [stream] = await Promise.all([
        openCamera(),
        loadFaceApi(),
      ]);
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
    } catch (e) {
      const denied = (e as DOMException)?.name === "NotAllowedError";
      setScanStatus("error");
      setError(
        denied
          ? "Accesul la cameră a fost refuzat. Permite camera din bara de adrese și încearcă din nou."
          : "Nu am putut porni camera sau modelul de recunoaștere a feței. Verifică internetul.",
      );
      return;
    }
    setScanStatus("scanning");
    const loop = async () => {
      const video = videoRef.current;
      if (!video || !streamRef.current) return;
      try {
        const faces = await detectFaces(video);
        if (faces.length === 0) setHint("Nu văd nicio față. Privește camera.");
        else if (faces.length > 1) setHint("Doar elevul trebuie să fie în cadru.");
        else if (faces[0].detection.score < 0.6) setHint("Apropie-te puțin și privește drept.");
        else {
          samples.current.push(Array.from(faces[0].descriptor).map((v) => Math.round(v * 10000) / 10000));
          setCount(samples.current.length);
          setHint("Perfect, nu te mișca…");
          if (samples.current.length >= SAMPLES) return finish();
        }
      } catch {
        setHint("Încerc din nou…");
      }
      timerRef.current = setTimeout(loop, SAMPLE_EVERY_MS);
    };
    void loop();
  }, [finish]);

  const canContinue = name.trim().length > 0 && consentStudent && consentGuardian;

  return (
    <>
    <StationBand
      logoHref="/panou"
      right={
        <span className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-semibold sm:inline-flex">
          <ShieldCheck className="size-4 text-ink" aria-hidden />
          Doar pe acest dispozitiv
        </span>
      }
    />
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pb-16 pt-6">

      <div>
        <h1 className="font-display text-4xl font-semibold">Cine semnează?</h1>
        <p className="mt-2 text-lg text-ink/80">
          SIGNals recunoaște fața elevului ca să o lase vizibilă pe cameră și să le estompeze pe ale colegilor.
        </p>
      </div>

      <ol className="flex gap-2" aria-label="Pași">
        {(["details", "scan", "done"] as Step[]).map((s, i) => (
          <li
            key={s}
            aria-current={step === s ? "step" : undefined}
            className={cn("h-2 flex-1 rounded-full", step === s ? "bg-elev" : i < ["details", "scan", "done"].indexOf(step) ? "bg-ink" : "bg-ink/15")}
          />
        ))}
      </ol>

      {step === "details" ? (
        <form
          className="space-y-4 rounded-xl bg-white p-5 border border-border"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) setStep("scan");
          }}
        >
          <label className="block space-y-1.5">
            <span className="font-bold">Numele elevului</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="de exemplu: Andrei" autoComplete="off" />
          </label>

          <div className="rounded-lg bg-elev-soft p-4 text-ink">
            <h2 className="mb-2 font-display text-xl font-semibold">Ce se întâmplă cu fața ta</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Camera calculează 5 „amprente” ale feței (câte 128 de numere). Nu se salvează nicio poză.</li>
              <li>Amprentele rămân <strong>doar în acest browser</strong>. Nu ajung pe server și nu sunt trimise nimănui.</li>
              <li>Le folosim într-un singur scop: să nu-ți estompăm fața, dar să le estompăm pe ale colegilor.</li>
              <li>Le poți șterge oricând, de pe această pagină.</li>
            </ul>
          </div>

          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" checked={consentStudent} onChange={(e) => setConsentStudent(e.target.checked)} className="mt-1 size-6 shrink-0 accent-elev" />
            <span>Sunt de acord ca fața mea să fie folosită astfel, pe acest dispozitiv.</span>
          </label>
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" checked={consentGuardian} onChange={(e) => setConsentGuardian(e.target.checked)} className="mt-1 size-6 shrink-0 accent-elev" />
            <span>
              Am peste 16 ani <strong>sau</strong> părintele / tutorele meu a fost informat și și-a dat acordul.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={!canContinue}>
              <ScanFace aria-hidden />
              Continuă la scanare
            </Button>
            <Link href={next ?? "/"} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Fără înregistrare
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Fără înregistrare, camera estompează toate fețele, inclusiv pe a ta.</p>
        </form>
      ) : null}

      {step === "scan" ? (
        <section className="space-y-4 rounded-xl bg-white p-5 border border-border" aria-labelledby="scan-title">
          <h2 id="scan-title" className="font-display text-2xl font-semibold">
            Scanarea feței
          </h2>
          <div
            className="relative mx-auto overflow-hidden rounded-lg bg-black"
            style={{ aspectRatio: String(aspect), width: `min(100%, calc(70dvh * ${aspect}))` }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              onLoadedMetadata={(e) => setAspect(videoAspect(e.currentTarget) ?? 4 / 3)}
              onResize={(e) => setAspect(videoAspect(e.currentTarget) ?? 4 / 3)}
              className="mirror absolute inset-0 size-full object-cover"
              aria-hidden
            />
            {scanStatus === "idle" || scanStatus === "error" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                {error ? (
                  <p className="font-bold" role="alert">
                    {error}
                  </p>
                ) : (
                  <p>Așază-te singur în fața camerei, cu lumină pe față.</p>
                )}
                <Button size="lg" onClick={startScan} className="bg-white text-ink hover:bg-white/90">
                  <Camera aria-hidden />
                  Pornește scanarea
                </Button>
              </div>
            ) : null}
            {scanStatus === "loading" ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 font-bold text-white" role="status">
                <Loader2 className="size-6 animate-spin" aria-hidden />
                Se încarcă recunoașterea feței…
              </div>
            ) : null}
            {scanStatus === "scanning" ? (
              <>
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-4 border-white/80" />
                <p className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-center font-bold text-white" role="status" aria-live="polite">
                  {hint} ({count}/{SAMPLES})
                </p>
              </>
            ) : null}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-ink/10" aria-hidden>
            <div className="h-full bg-elev transition-all" style={{ width: `${(count / SAMPLES) * 100}%` }} />
          </div>
        </section>
      ) : null}

      {step === "done" && registration ? (
        <section className="space-y-4 rounded-xl bg-white p-5 border border-border" aria-labelledby="done-title">
          <h2 id="done-title" className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Check className="size-7 text-ink" aria-hidden />
            {registration.name} este înregistrat
          </h2>
          <p className="text-lg">
            Pe camera SIGNals, fața ta rămâne vizibilă, iar fețele colegilor sunt estompate. Amprenta feței e salvată doar în acest
            browser din {new Date(registration.createdAt).toLocaleDateString("ro-RO")}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => router.push(next ?? "/elev/antrenare")}>
              Continuă
              <ArrowRight aria-hidden />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setStep("scan");
                void startScan();
              }}
            >
              <ScanFace aria-hidden />
              Scanează din nou
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={() => {
                deleteRegistration();
                setStep("details");
                setConsentStudent(false);
                setConsentGuardian(false);
              }}
            >
              <Trash2 aria-hidden />
              Șterge înregistrarea
            </Button>
          </div>
        </section>
      ) : null}
    </main>
    </>
  );
}
