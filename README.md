# Punte — platforma lecției accesibile

**Elevul semnează. Clasa înțelege.**

Punte este un „kit al clasei” pentru elevii surzi sau hipoacuzici. Mediază lecția în ambele sensuri:

| Piesă | În demo | Ce face |
| --- | --- | --- |
| **Insigna elevului** | telefonul / laptopul elevului (`/elev/[code]`) | Camera recunoaște semnele elevului; profesorul le aude ca voce și le vede ca text. Elevul vede subtitrările profesorului și primește alerte de vibrație. |
| **Insigna profesorului** | telefonul profesorului (`/profesor/[code]`) | Microfonul transformă vocea în subtitrări live. Insigna se aprinde și vibrează când elevul nu a înțeles sau vrea să intervină. |
| **Ecranul clasei** | proiectorul (`/clasa/[code]`) | Conversația în ambele sensuri, semaforul elevului și, la final, memoria lecției generată de AI. |

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4, shadcn/ui, lucide-react
- Supabase: Postgres + RLS, Realtime (Postgres Changes, Broadcast, Presence), autentificare anonimă
- MediaPipe Tasks Vision `0.10.14` (HandLandmarker, 2 mâini) — doar în browser
- Web Speech API: `SpeechRecognition` (ro-RO) și `speechSynthesis` — Chrome / Edge
- Claude API (`@anthropic-ai/sdk`) pentru memoria lecției — doar pe server
- `qrcode.react`, `zod`

## Instalare

```bash
npm install
```

### 1. Supabase

1. Creează un proiect pe [supabase.com](https://supabase.com) (sau folosește-l pe cel existent).
2. Rulează migrațiile din `supabase/migrations/`, în ordine:
   - **SQL Editor** → lipește conținutul fiecărui fișier → *Run*; sau
   - cu Supabase CLI: `supabase link --project-ref <ref>` apoi `supabase db push`.
3. **Authentication → Sign In / Providers → „Allow anonymous sign-ins” → pornit.** Fără asta, aplicația nu poate da un `user_id` fiecărui dispozitiv.
4. Migrațiile adaugă deja tabelele `messages`, `lesson_summaries` și `lessons` în publicația `supabase_realtime`.

> Proiectul `zybgnpvnvnjrzpdljkum` are deja migrațiile aplicate.

### 2. Variabile de mediu

Copiază `.env.example` în `.env.local` și completează:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<cheia anon / publishable>
SUPABASE_SERVICE_ROLE_KEY=<cheia service_role / secret>   # doar pe server
ANTHROPIC_API_KEY=<cheia Anthropic>                       # doar pe server
ANTHROPIC_MODEL=claude-sonnet-5-5
```

Cheile `SUPABASE_SERVICE_ROLE_KEY` și `ANTHROPIC_API_KEY` sunt citite doar în `src/app/api/...` și `src/lib/supabase/server.ts` (marcat `server-only`); nu ajung niciodată în browser. Fără `ANTHROPIC_API_KEY`, memoria lecției se generează local, fără AI, cu un mesaj clar.

### 3. Pornire

```bash
npm run dev
```

Deschide <http://localhost:3000>. Pe `localhost` camera și microfonul funcționează fără HTTPS.

Pentru testul complet pe un singur calculator, deschide trei ferestre Chrome: profesor, elev, clasă. Toate pot folosi același browser.

## Deploy pe Vercel și testarea pe telefoane

Pe telefon, camera și microfonul cer **HTTPS**. Cea mai simplă cale este Vercel:

1. Urcă proiectul pe GitHub.
2. Pe [vercel.com](https://vercel.com) → *Add New Project* → importă repo-ul.
3. În *Settings → Environment Variables* adaugă cele 5 variabile de mai sus.
4. *Deploy*. Primești un URL `https://…vercel.app`. Codul QR de pe ecranul profesorului folosește automat acest domeniu.

Alternativă pentru test local pe telefon: `npx next dev --experimental-https`, apoi deschide `https://<IP-ul-laptopului>:3000` pe telefon (acceptă certificatul local). Sau folosește un tunel HTTPS (de exemplu `cloudflared tunnel --url http://localhost:3000`).

Pe iOS, browserul nu poate vibra: alertele rămân doar vizuale. Recunoașterea vocală e cea mai stabilă în Chrome pe Android și în Chrome / Edge pe desktop.

## Antrenarea semnelor (`/elev/antrenare`)

Cele 6 semne din „Modul Classroom” + „Fără semn”:

| Tasta | Semn | Fraza rostită | Semafor |
| --- | --- | --- | --- |
| 1 | Nu am înțeles | „Nu am înțeles.” | roșu + alertă la profesor |
| 2 | Repetați | „Puteți repeta, vă rog?” | roșu + alertă |
| 3 | Am o întrebare | „Am o întrebare.” | chihlimbar + alertă |
| 4 | Termen | „Ce este clorofila?” (termenul principal al lecției, „din dicționarul clasei”) | chihlimbar + alertă |
| 5 | Am terminat | „Am terminat exercițiul.” | verde |
| 6 | Mulțumesc | „Mulțumesc!” | verde |

Sfaturi pentru o recunoaștere bună:

- **Aceeași persoană și aceeași lumină** ca la prezentare. Antrenează pe dispozitivul și în sala unde faci demo-ul.
- **2–3 înregistrări pe semn** (fiecare durează 2 secunde, după o numărătoare inversă de 3 secunde).
- Alege **semne cu forme de mână clar diferite**: pumn, palmă deschisă, degetul mare ridicat, litera „C” și altele.
- Înregistrează și **„Fără semn”**: mâinile în repaus sau gesturi obișnuite, ca să nu fie confundate cu semne.
- Folosește **„Testează”** ca să vezi live ce semn e recunoscut, fără să trimiți nimic.
- Antrenarea se salvează automat în `sign_profiles`, cu rezervă în `localStorage` dacă nu există conexiune. Poți face **export / import JSON** ca s-o muți pe alt dispozitiv.

Recunoașterea folosește landmark-uri normalizate față de încheietură și scalate, un clasificator k-NN (k = 5), un prag de stabilitate de 10 cadre cu încredere ≥ 0,71 și o pauză (cooldown) după fiecare semn. Fiecare semn recunoscut apare 1,5 s cu bară de progres și poate fi anulat (buton mare sau Esc). Viteza gesturilor schimbă intonația vocii.

## Scenariul demo-ului (60–90 de secunde)

1. **Profesorul** (laptop sau telefon): pe `/`, alege șablonul *Biologie · Fotosinteza* și apasă „Creează lecția”.
2. **Elevul** scanează QR-ul și alege „Sunt elevul”. **Proiectorul** deschide același cod și alege „Ecranul clasei”. Pe ambele apare „Profesor conectat / Elev conectat”.
3. Profesorul pornește microfonul: *„Andrei, te rog să fii atent la tablă. Astăzi vorbim despre fotosinteză.”* Elevul vede subtitrarea live, iar telefonul lui vibrează (alerta de nume).
4. Elevul semnează **„Nu am înțeles”**. Apare confirmarea de 1,5 s, apoi semaforul devine roșu. Telefonul profesorului spune „Nu am înțeles.”, iar insigna pulsează roșu. Profesorul apasă „Am văzut” și repetă mai simplu.
5. Elevul semnează **„Termen”**: „Ce este fotosinteza?”, marcat „din dicționarul clasei”. Profesorul explică.
6. Elevul semnează **„Am terminat”**: semaforul devine verde.
7. Profesorul anunță: *„Tema pentru mâine: exercițiile 1, 2 și 3 de la pagina 42.”* Elevul primește alerta de temă.
8. Profesorul apasă **„Încheie lecția”**: memoria lecției apare pe toate cele trei ecrane, cu butonul „Copiază”.

**Mod demo automat:** pe ecranul profesorului apasă tasta **D** (sau butonul „Mod demo”). Scenariul de mai sus rulează singur, inclusiv semnele elevului și încheierea lecției. Apasă **D** sau **Esc** ca să-l oprești.

## Scurtături de tastatură

| Tasta | Ecran | Acțiune |
| --- | --- | --- |
| `1`–`6` | elev | Declanșează manual semnul (plasa de siguranță) |
| `Esc` | elev | Anulează semnul aflat în confirmare |
| `D` | profesor | Pornește / oprește modul demo |
| `Esc` | profesor | Oprește modul demo |

## Arhitectura

```
src/
  app/
    page.tsx                         prezentare + creează / intră
    j/[code]/                        alegerea rolului după QR
    profesor/[code]/  elev/[code]/  clasa/[code]/  elev/antrenare/
    api/lessons/[code]/summary/      memoria lecției (Claude, server)
  components/
    screens/                         ecranele (încărcate fără SSR)
    punte/                           insigna, semafor, conversație, QR, memoria lecției…
    ui/                              shadcn/ui
  hooks/
    use-lesson.ts                    RPC join_lesson + Realtime (Postgres Changes, Broadcast, Presence)
    use-hand-tracker.ts              cameră + MediaPipe HandLandmarker
    use-sign-profile.ts              antrenarea (sign_profiles + localStorage)
    use-speech-recognition.ts        ro-RO, interimar, repornire automată
  lib/
    knn.ts                           caracteristici, k-NN, prag de stabilitate, intonație
    signs.ts  alerts.ts  speech.ts  templates.ts  summary-fallback.ts  lesson-actions.ts
supabase/migrations/                 schema, RLS, create_lesson / join_lesson
```

**Timp real** — un canal per lecție, `lesson:{code}`:

- *Postgres Changes* pe `messages`: conversația persistentă.
- *Broadcast* (nu se salvează): `semafor`, `caption_interim`, `buzz`, `teacher_alert`, `teacher_alert_ack`, `pending_sign`, `pending_cancel`, `summary_ready`.
- *Presence*: cine e conectat și cu ce rol. Când apare un participant nou, profesorul retrimite starea semaforului.

**Securitate** — RLS pe toate tabelele. Intrarea se face prin `join_lesson(code, role, display_name)` (`security definer`), ca tabela `lessons` să nu fie publică. Doar profesorul (`teacher_id`) poate modifica sau încheia lecția. `lesson_summaries` se scrie doar din server, cu cheia service role. Fiecare utilizator își vede doar propriul rând din `sign_profiles`.

**Confidențialitate** — nu se înregistrează și nu se salvează video sau audio. Se salvează doar textul conversației și landmark-urile de antrenare.

## Limitări cunoscute

- **Semne statice**: recunoașterea compară forma mâinii dintr-un cadru. Semnele cu mișcare (traiectorie) nu se disting între ele.
- **Vocabular mic**: 6 semne fixe pentru clasă + „Fără semn”. Nu este o traducere completă a limbajului mimico-gestual românesc.
- **Antrenare personală**: modelul funcționează cel mai bine pentru persoana, camera și lumina din momentul antrenării.
- **Profilul pe alt dispozitiv**: autentificarea e anonimă, deci fiecare dispozitiv are propriul cont. Antrenarea se mută cu export / import JSON.
- **Vocea**: `SpeechRecognition` merge în Chrome și Edge (are nevoie de internet). Firefox și Safari nu sunt suportate pentru microfon; poți folosi câmpul de text. Vocile românești pentru `speechSynthesis` depind de sistemul de operare.
- **Vibrația**: nu funcționează pe iOS; alertele rămân vizuale.
