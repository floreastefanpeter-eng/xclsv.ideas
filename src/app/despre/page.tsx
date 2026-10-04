import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StationBand } from "@/components/punte/station-band";
import { ASL_CREDIT } from "@/lib/asl/glossary";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Despre Punte" };

const SOURCES = [
  {
    label: "OMS — Deafness and hearing loss (fișă informativă, 2026)",
    url: "https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss",
  },
  { label: "Google — Isolated Sign Language Recognition (setul de date, CC BY 4.0)", url: ASL_CREDIT.datasetUrl },
  { label: "ASL Realtime Transformer — modelul (CC BY 4.0)", url: ASL_CREDIT.modelUrl },
  { label: "asl-realtime — codul de preprocesare (MIT)", url: ASL_CREDIT.codeUrl },
  { label: "RoCoISLR — primul corpus pentru recunoașterea LSR (arXiv, 2025)", url: "https://arxiv.org/abs/2511.12767" },
  { label: "DLMG — dicționarul limbajului mimico-gestual românesc", url: "https://dlmg.ro/" },
  { label: "MediaPipe Holistic Landmarker", url: "https://ai.google.dev/edge/mediapipe/solutions/vision/holistic_landmarker" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl bg-white p-5 border border-border sm:p-7">
      <h2 id={id} className="mb-3 font-display text-2xl font-extrabold sm:text-3xl">
        {title}
      </h2>
      <div className="space-y-3 text-lg leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
    <StationBand right={<Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "text-white hover:bg-white/10 hover:text-white")}>
          Încearcă Punte
          <ArrowRight aria-hidden />
        </Link>} />
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pb-16 pt-6">

      <div className="py-6">
        <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          Un mediator între elevul surd și clasa care vorbește.
        </h1>
      </div>

      <Section id="problema" title="Problema">
        <p>
          Un elev surd sau hipoacuzic într-o clasă obișnuită pierde explicațiile spuse cu voce tare și nu are o cale rapidă
          să spună „nu am înțeles” fără să întrerupă lecția. Profesorul, de obicei, nu cunoaște limbajul semnelor.
        </p>
        <p>
          Potrivit OMS, peste 430 de milioane de oameni au nevoie de reabilitare pentru o pierdere de auz invalidantă, iar
          aproximativ 95,1 milioane de copii și tineri între 5 și 19 ani trăiesc cu pierdere de auz.
        </p>
      </Section>

      <Section id="utilizatori" title="Pentru cine">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Elevul surd</strong>: semnează în fața camerei; vede subtitrările profesorului; primește alerte vizuale și
            prin vibrație când e strigat, când se pune o întrebare sau se anunță tema.
          </li>
          <li>
            <strong>Profesorul</strong>: vorbește normal; aude frazele elevului; insigna lui se aprinde când elevul nu a înțeles.
          </li>
          <li>
            <strong>Clasa</strong>: vede conversația pe tablă, în ambele sensuri, și memoria lecției la final.
          </li>
        </ul>
      </Section>

      <Section id="tema" title="Tema „middleman”">
        <p>
          Punte nu înlocuiește interpretul și nu „vorbește” în locul elevului. Este un mediator: transmite exact ce a semnat
          elevul și exact ce a spus profesorul, iar când nu este sigur spune „semn necunoscut” în loc să ghicească.
        </p>
      </Section>

      <Section id="arhitectura" title="Cum funcționează">
        <ol className="list-decimal space-y-1 pl-6">
          <li>Camera elevului → MediaPipe Holistic (mâini, corp, față), totul în browser. Video-ul nu pleacă de pe dispozitiv.</li>
          <li>
            Recunoaștere: <strong>modelul ASL open source</strong> (transformer temporal, 250 de semne, 1,5 MB, LiteRT.js) sau{" "}
            <strong>dicționarul personal</strong> antrenat de elev (k-NN pe landmark-uri, preluat din LSR Translator).
          </li>
          <li>Confirmare de 1,5 s cu anulare → mesaj în Supabase Realtime → profesorul aude fraza (sinteză vocală).</li>
          <li>Microfonul profesorului → recunoaștere vocală ro-RO → subtitrări live pentru elev.</li>
          <li>La final: memoria lecției (Claude pe server, cu rezervă locală) și statisticile pentru validare.</li>
        </ol>
        <p>
          Stack: Next.js, Supabase (Postgres cu RLS, Realtime, autentificare anonimă), MediaPipe, LiteRT.js, Web Speech API,
          Claude API.
        </p>
      </Section>

      <Section id="open-source" title="Modelul open source și limba semnelor">
        <p>
          Nu există încă un model public pentru limbajul mimico-gestual românesc (LSR). Primul corpus LSR, RoCoISLR (2025),
          are în medie sub două clipuri pe semn și o acuratețe maximă raportată de 34,1%, prea puțin pentru o lecție live.
        </p>
        <p>
          De aceea Punte folosește acum <strong>{ASL_CREDIT.model}</strong> de {ASL_CREDIT.author} ({ASL_CREDIT.modelLicense}),
          antrenat pe setul Google Isolated Sign Language Recognition (250 de semne ASL, 21 de semnatari surzi). Autorul
          raportează 74,7% acuratețe top-1 pe semnatari nevăzuți la antrenare. Semnele sunt <strong>ASL</strong>, nu LSR:
          aplicația arată glosa ASL și traducerea în română, iar ghidul de semne trimite la DLMG pentru semnul românesc.
        </p>
        <p>
          Arhitectura e independentă de limbă: același flux (landmark-uri → model temporal → mesaj) poate primi un model LSR
          antrenat pe înregistrări făcute cu semnatari nativi.
        </p>
      </Section>

      <Section id="ipoteze" title="Ipoteze și validare">
        <p>Fiecare lecție măsoară, din conversația reală, trei ipoteze:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>H1</strong>: profesorul observă că elevul nu a înțeles în mai puțin de 10 secunde (timpul până la „Am văzut”).
          </li>
          <li>
            <strong>H2</strong>: camera recunoaște cel puțin 70% din semnele încercate (semne recunoscute față de „semn necunoscut”).
          </li>
          <li>
            <strong>H3</strong>: elevul comunică mai ales prin semne, nu prin butoane (cel puțin 50% din semne prin cameră).
          </li>
        </ul>
        <p>
          Profesorul descarcă statisticile ca CSV, iar elevul și profesorul lasă feedback la finalul lecției (note de la 1 la 5 și
          un comentariu), salvat în baza de date.
        </p>
      </Section>

      <Section id="gdpr" title="Confidențialitate și GDPR">
        <ul className="list-disc space-y-1 pl-6">
          <li>Camera nu înregistrează și nu transmite video. Pleacă de pe dispozitiv doar textul conversației și, la antrenare, coordonatele punctelor mâinii.</li>
          <li>
            Pe imaginea camerei, <strong>fețele colegilor sunt pixelate</strong>. Rămâne vizibilă doar fața elevului înregistrat; fără
            înregistrare, toate fețele sunt pixelate. Până pornește protecția, imaginea e ascunsă complet.
          </li>
          <li>
            Recunoașterea feței folosește date biometrice (art. 9 GDPR). De aceea: consimțământ explicit al elevului și confirmarea
            acordului părintelui pentru elevii sub 16 ani, un singur scop declarat, iar șablonul feței (5 × 128 de numere, fără nicio
            imagine) rămâne <strong>doar în browserul elevului</strong>. Nu ajunge pe server.
          </li>
          <li>Dreptul la ștergere: un buton pe pagina de înregistrare elimină complet șablonul feței.</li>
        </ul>
      </Section>

      <Section id="impact" title="Impact, extindere, sustenabilitate">
        <ul className="list-disc space-y-1 pl-6">
          <li>Merge pe orice telefon sau laptop cu Chrome sau Edge: fără hardware special, fără instalare.</li>
          <li>Recunoașterea rulează pe dispozitiv: costuri de server mici și confidențialitate (nu se trimite video).</li>
          <li>Modelul de semne se poate înlocui: ASL azi, LSR când există date. Între timp, elevul sau profesorul pot înregistra semne LSR cu mișcare direct în aplicație.</li>
          <li>Cod și modele cu licențe deschise (MIT, CC BY 4.0), deci școlile și ONG-urile îl pot prelua.</li>
        </ul>
      </Section>

      <Section id="limitari" title="Limitări">
        <ul className="list-disc space-y-1 pl-6">
          <li>Semnele recunoscute de model sunt ASL, cu vocabular orientat spre copii (proiectul PopSign).</li>
          <li>Un semn izolat odată: nu traduce propoziții în limbajul semnelor.</li>
          <li>Recunoașterea vocală are nevoie de Chrome / Edge și de internet.</li>
        </ul>
      </Section>

      <Section id="surse" title="Surse și licențe">
        <ul className="space-y-2">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 font-bold text-elev underline-offset-2 hover:underline">
                {s.label}
                <ExternalLink className="mt-1.5 size-4 shrink-0" aria-hidden />
                <span className="sr-only">(se deschide într-o filă nouă)</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-base">
          Model: {ASL_CREDIT.model}, © {ASL_CREDIT.author}, {ASL_CREDIT.modelLicense}. Date: {ASL_CREDIT.dataset}. Preprocesare
          portată din asl-realtime ({ASL_CREDIT.codeLicense}).
        </p>
      </Section>
    </main>
    </>
  );
}
