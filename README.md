# Punte — platforma lecției accesibile

**Elevul semnează. Clasa înțelege.**

Punte este un „kit al clasei” pentru elevii surzi sau hipoacuzici. Mediază lecția în ambele sensuri:

| Piesă | În demo | Ce face |
| --- | --- | --- |
| **Insigna elevului** | telefonul / laptopul elevului (`/elev/[code]`) | Camera recunoaște semnele elevului; profesorul le aude ca voce și le vede ca text. Elevul vede subtitrările profesorului și primește alerte de vibrație. |
| **Insigna profesorului** | telefonul profesorului (`/profesor/[code]`) | Microfonul transformă vocea în subtitrări live. Insigna se aprinde și vibrează când elevul nu a înțeles sau vrea să intervină. |
| **Masa elevului** | tableta sau telefonul de pe bancă (`/masa/[code]`) | Tot ce spune profesorul, foarte mare și în timp real, tradus în limba aleasă (engleză, franceză, maghiară, ucraineană…), plus termenii lecției explicați simplu. Fără cont, doar cu codul. |
| **Ecranul clasei** | proiectorul (`/clasa/[code]`) | Conversația în ambele sensuri, semaforul elevului și, la final, memoria lecției generată de AI. |

Punte începe cu **contul**: profesorul și elevul se înregistrează (email + parolă, Supabase Auth). Profesorul scrie doar materia și titlul lecției — **termenii-cheie se extrag automat** din ce spune în timpul lecției.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4, shadcn/ui (Base UI: tabs, dropdown, dialog, sheet, sonner), `motion`, lucide-react
- Fonturi: Archivo (condensat, pentru plăcuțe) și Atkinson Hyperlegible (text, foarte lizibil)
- Supabase: Postgres + RLS, Realtime (Postgres Changes, Broadcast, Presence), conturi cu email + parolă (profesor / elev) și autentificare anonimă pentru ecranele partajate
- MediaPipe Tasks Vision `0.10.14` (HolisticLandmarker pe ecranul elevului, HandLandmarker la antrenare, FaceDetector BlazeFace pentru estomparea fețelor) — doar în browser
- **Model ASL open source**: ASL Realtime Transformer (CC BY 4.0), rulat cu LiteRT.js (`@litertjs/core`, WebAssembly)
- Web Speech API: `SpeechRecognition` (ro-RO) și `speechSynthesis` — Chrome / Edge
- Claude API (`@anthropic-ai/sdk`) pentru memoria lecției, termenii-cheie și traducere — doar pe server; MyMemory ca rezervă gratuită pentru traducere
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
3. **Authentication → Sign In / Providers → „Allow anonymous sign-ins” → pornit.** Ecranele partajate (masa elevului, proiectorul) intră anonim, doar cu codul.
4. **Authentication → Sign In / Providers → Email → pornit.** Conturile de profesor și elev folosesc email + parolă. Dacă „Confirm email” e pornit, utilizatorul primește un link înainte de prima intrare; pentru un demo rapid îl poți opri. Recomandat: **Password security → Leaked password protection** pornit.
5. La **Authentication → URL Configuration**, adaugă adresa aplicației (de ex. `https://localhost:3000` și domeniul Vercel) la *Redirect URLs*, pentru linkurile de confirmare și de resetare a parolei.
6. Migrațiile adaugă deja tabelele `messages`, `lesson_summaries` și `lessons` în publicația `supabase_realtime`.

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

Cheile `SUPABASE_SERVICE_ROLE_KEY` și `ANTHROPIC_API_KEY` sunt citite doar în `src/app/api/...` și `src/lib/supabase/server.ts` (marcat `server-only`); nu ajung niciodată în browser. Fără `ANTHROPIC_API_KEY`, memoria lecției se generează local, fără AI, cu un mesaj clar. Fără `SUPABASE_SERVICE_ROLE_KEY`, memoria se generează local pe dispozitivul profesorului și se trimite tuturor ecranelor.

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

## Conturi, termeni-cheie extrași automat și traducere

- **Confirmarea prin cod**: după „Cont nou”, Punte cere codul de 6 cifre din email (cu „Retrimite codul”). În Supabase → *Authentication → Email Templates → Confirm signup*, adaugă în șablon `{{ .Token }}` (codul); linkul `{{ .ConfirmationURL }}` poate rămâne.
- **Cont demo, fără limite**: serverul de email inclus în Supabase trimite doar câteva emailuri pe oră. Dacă emailul nu poate pleca, contul se creează oricum, ca **cont demo** pe acel dispozitiv (sesiune anonimă + profil) și funcționează complet. Pentru o clasă reală: *Authentication → SMTP Settings* cu un server propriu (de ex. Resend) și limite mai mari la *Rate Limits*, sau oprește „Confirm email” pentru demo.
- **Conturi** (`/`): *Intră în cont* sau *Cont nou* (profesor sau elev). Un trigger Supabase creează profilul (`profiles`: rol, nume, școală, limbă). Ecranele profesorului și elevului cer cont; masa elevului și proiectorul intră doar cu codul.
- **Panoul** (`/panou`): profesorul pornește o lecție (materia + titlul; termenii sunt opționali) și își vede lecțiile; elevul intră cu codul, își alege limba subtitrărilor și își vede istoricul. Numele elevului ajunge singur pe lecție când intră.
- **Termenii-cheie**: după fiecare 3 replici noi ale profesorului (cel mult o dată la 25 s) sau la butonul de reîmprospătare, `POST /api/lessons/[code]/terms` alege termenii și scrie câte o explicație simplă. Cu `ANTHROPIC_API_KEY` folosește Claude; fără cheie, un extractor local (cuvinte lungi, repetate, din titlu). Ruta scrie prin RLS, cu sesiunea profesorului — nu are nevoie de cheia service role.
- **Traducerea**: `POST /api/translate` traduce replicile profesorului, termenii și memoria lecției. Întâi Claude (dacă există cheie), apoi API-ul gratuit [MyMemory](https://mymemory.translated.net/doc/spec.php). Textul românesc apare imediat; traducerea vine după și rămâne în cache. Limbi: română, engleză, franceză, germană, spaniolă, italiană, maghiară, ucraineană, rusă, arabă (de la dreapta la stânga), turcă. Limita gratuită MyMemory e de câteva mii de caractere pe zi: pentru o clasă reală, pune `ANTHROPIC_API_KEY`.

## Masa elevului (`/masa/[code]`)

Tableta de pe bancă: scanează QR-ul profesorului → *Masa elevului*, sau pe pagina principală *Conectează un ecran* → codul. Arată fraza curentă a profesorului foarte mare (4 mărimi de text), frazele anterioare estompate, fraza care se spune *acum* (subtitrarea interimară), termenii lecției, alertele (numele strigat, tema, întrebare) și confirmarea „Profesorul a văzut”. Ecranul nu se stinge (Wake Lock) și poate trece pe ecran complet.

## Recunoașterea semnelor: modelul ASL open source

Pe ecranul elevului se alege modul de recunoaștere:

| Mod | Ce recunoaște | Cum se semnează |
| --- | --- | --- |
| **Model ASL** (implicit) | 250 de semne ASL (limbajul american), fără antrenare | Ridică mâna, fă semnul, coboară mâna |
| **Dicționarul meu** | cuvintele antrenate de elev (k-NN, din LSR Translator) | Ține semnul nemișcat o clipă |

**Modelul:** [ASL Realtime Transformer](https://www.kaggle.com/models/ceydaakin2004/asl-realtime-transformer) de Ceyda Akın, licență **CC BY 4.0**. A fost antrenat pe [Google – Isolated Sign Language Recognition](https://www.kaggle.com/competitions/asl-signs): 250 de semne, 21 de semnatari surzi, date CC BY 4.0. Autorul raportează 74,7% acuratețe top-1 pe semnatari nevăzuți la antrenare. Varianta pe 8 biți (1,5 MB) e în `public/models/asl/`, alături de `signs.json`. Preprocesarea e portată în TypeScript din [asl-realtime](https://github.com/ceydaakin/asl-realtime) (MIT) și trece testele originale ale proiectului.

**Fluxul:** cameră → MediaPipe Holistic (543 de puncte: față, corp, mâini) → segmentare (un semn = mâna în cadru, apoi coborâtă) → fereastră de 64 de cadre × 66 de puncte (buze, mâna dominantă, braț) → transformer temporal → top 3 semne cu probabilități → confirmare de 1,5 s → mesaj.

**Semn necunoscut:** dacă cel mai probabil semn are sub **50%**, Punte nu ghicește. Elevul vede „Semn necunoscut” cu cele mai apropiate 3 variante, iar în conversație apare „Andrei: semn necunoscut” (fără voce). Profesorul vede „Andrei a făcut un semn necunoscut”, iar semnul intră în statistici. În modul „Dicționarul meu”, un semn ținut nemișcat care nu seamănă cu niciun cuvânt (scor de potrivire sub 0,45) e raportat la fel.

**Traducerea:** fiecare semn ASL are cuvântul românesc (`src/lib/asl/glossary.ts`). Câteva au sens în clasă: *why / who / where* → „De ce? / Cine? / Unde?” (alertă), *wait* → „Așteptați, vă rog!” (alertă), *potty* → „Pot să merg la toaletă?” (alertă), *stuck* → „M-am blocat.” (roșu), *sick* → „Mă simt rău.” (roșu), *yes / finish / thankyou* → verde.

**Important:** semnele sunt **ASL**, nu LSR. Nu există încă un model public pentru limbajul mimico-gestual românesc (vezi `/despre`). Ghidul de semne trimite la DLMG pentru semnul românesc al fiecărui cuvânt.

## Cercetare: biblioteci open source evaluate

| Domeniu | Ce am evaluat | Decizia |
| --- | --- | --- |
| Hand tracking | MediaPipe Tasks Vision (HandLandmarker / HolisticLandmarker), [Human](https://github.com/vladmandic/human), [handtrack.js](https://github.com/victordibia/handtrack.js), YoHa, TF.js Hand Pose | Rămânem pe MediaPipe (cel mai precis în browser, WebGPU/WebGL, 21 de puncte 3D). Am adăugat **filtrul One Euro** (Casiez et al., CHI 2012) pe landmark-uri: semnele ținute nemișcat nu mai „tremură”, deci dicționarul le recunoaște mai stabil. |
| Recunoașterea limbajului semnelor | ASL Realtime Transformer (Kaggle, CC BY 4.0), [sign.mt](https://github.com/sign-language-processing/spoken-to-signed-translation) (CC BY-NC-SA), [SignGemma](https://x.com/googleaccess/status/1927425916847685947) (Google, anunțat), proiecte MediaPipe + CNN/MLP pe GitHub | Modelul ASL rămâne cel mai bun model *izolat* care rulează integral în browser. sign.mt e excelent pentru text → semne (avatar), dar licența e necomercială. SignGemma e de urmărit pentru traducere continuă ASL → text când devine disponibil. Pentru LSR nu există încă un model public (vezi RoCoISLR la `/despre`). |
| Estomparea fețelor | face-api (vechea soluție, la 450 ms), MediaPipe Face Detector (BlazeFace), proiectele „face blurrer” cu MediaPipe + OpenCV | **BlazeFace la fiecare cadru** + urmărire cu predicție de mișcare + identitate face-api la 0,6 s. Vezi mai jos. |

## Înregistrarea elevului și protecția fețelor (GDPR)

Primul pas pentru elev este `/elev/inregistrare`, deschis și din ecranul elevului sau de pe pagina principală:

1. **Numele și consimțământul**: elevul își dă acordul și confirmă că are peste 16 ani sau că părintele / tutorele a fost informat și și-a dat acordul. Pagina explică pe scurt ce se întâmplă cu datele.
2. **Scanarea feței**: camera calculează 5 descriptori ai feței (câte 128 de numere) cu [face-api](https://github.com/vladmandic/face-api) (MIT), rulat în browser. Nu se salvează nicio imagine.
3. **Stocarea**: descriptorii rămân **doar în browserul elevului** (`localStorage`). Nu ajung în Supabase și nu sunt trimiși nicăieri. Butonul „Șterge înregistrarea” îi elimină complet.

Pe camera elevului (ecranul elevului și pagina de antrenare) se detectează fețele **la fiecare cadru** cu MediaPipe BlazeFace (~1–3 ms pe GPU), iar identitatea se verifică cu face-api la ~0,6 s. Între detecții, fiecare față e urmărită (poziție netezită + viteză), așa că estomparea o urmează și când colegul se mișcă repede. Regula e *fail-closed*:

- fața care se potrivește cu elevul înregistrat (distanță sub 0,5) rămâne vizibilă;
- **toate celelalte fețe sunt pixelate**, cu o margine generoasă;
- fără înregistrare, toate fețele sunt pixelate;
- o față care nu mai e detectată rămâne estompată încă ~0,9 s, cu o zonă care crește (poate s-a mișcat);
- dacă o față lipsește peste 0,3 s, identitatea se verifică din nou (altcineva poate fi în locul ei);
- până pornește detecția, sau dacă detecția se blochează peste 1,2 s, se estompează **tot cadrul**;
- până pornește protecția, imaginea camerei e ascunsă complet, iar semnele sunt recunoscute în continuare.

**De ce așa:** recunoașterea feței înseamnă date biometrice (art. 9 GDPR). Le procesăm doar cu consimțământ explicit, într-un singur scop, local, cu drept de ștergere. Camera Punte oricum nu înregistrează și nu transmite video.

## Dicționarul de semne (`/elev/antrenare`)

Elevul comunică cu profesorul prin cuvinte dintr-un **dicționar de semne**. Nu există un AI care „vorbește” în locul lui: fiecare mesaj al elevului este exact cuvântul pe care l-a semnat, iar telefonul profesorului îl rostește cu sinteza vocală a browserului.

| Tasta | Cuvânt | Fraza rostită | Semafor |
| --- | --- | --- | --- |
| 1 | NU ÎNȚELEG | „Nu am înțeles.” | roșu + alertă la profesor |
| 2 | REPETAȚI | „Puteți repeta, vă rog?” | roșu + alertă |
| 3 | ÎNTREBARE | „Am o întrebare.” | chihlimbar + alertă |
| 4 | TERMEN | „Ce este fotosinteza?” (termenul principal al lecției) | chihlimbar + alertă |
| 5 | AM TERMINAT | „Am terminat exercițiul.” | verde |
| 6 | MULȚUMESC | „Mulțumesc!” | verde |
| 7 | BUNĂ | „Bună!” | — |
| 8 | DA | „Da.” | verde |
| 9 | NU | „Nu.” | — |
| | AJUTOR | „Am nevoie de ajutor!” | roșu + alertă |
| | APĂ, CASĂ, PRIETEN, FAMILIE, TE IUBESC | cuvântul | — |

Cuvintele 7–9 și cele de sub ele vin din **LSR Translator**. Elevul poate **adăuga cuvinte proprii** (de exemplu „PAUZĂ”) și le antrenează la fel; ele apar la „Cuvintele mele”.

### Semne cu mișcare (de exemplu semne LSR)

Pe lângă formele statice ale mâinii, fiecare cuvânt din dicționar poate avea **semne cu mișcare**. Așa se adaugă semne românești reale, care depind de traiectorie.

- **Înregistrarea:** butonul „Mișcare”, apoi o numărătoare inversă: ridici mâna, faci semnul, cobori mâna. Cel mult 5 secunde, cu umerii în cadru. Fă 3–5 înregistrări pe semn.
- **Reprezentarea:** pozițiile ambelor mâini, raportate la umeri (centrate între umeri, scalate cu lățimea umerilor), re-eșantionate la 24 de cadre.
- **Recunoașterea:** DTW (Dynamic Time Warping) față de toate exemplele, cu media celor mai apropiate 2. Pragul se calculează din cât de diferite sunt propriile exemple ale semnului, plafonat la 0,32. Semnul câștigător trebuie să fie cu cel puțin 8% mai aproape decât al doilea; altfel e „semn necunoscut”.
- **Pe ecranul elevului**, în modul „Dicționarul meu”: semnele statice se recunosc când mâna stă nemișcată, iar cele cu mișcare când mâna coboară.
- Exemplele se salvează în `sign_profiles`, alături de antrenarea statică, și se pot exporta / importa ca JSON.

### Modelul de recunoaștere (din LSR Translator)

- MediaPipe HandLandmarker, până la 2 mâini, rulat doar în browser.
- Cele 21 de puncte ale fiecărei mâini se normalizează față de încheietură și se scalează după distanța încheietură → baza degetului mijlociu.
- Comparația folosește distanța euclidiană RMS. Scorul de potrivire e 1 / (1 + distanță). Sub 0,45 semnul e „necunoscut”.
- Peste el: k-NN (k = 5) cu vot ponderat, încredere ≥ 0,71 în 10 cadre consecutive, apoi o pauză. Fiecare semn recunoscut apare 1,5 s cu bară de progres și poate fi anulat (buton mare sau Esc).

### Antrenarea

1. Pornește camera pe `/elev/antrenare`.
2. La fiecare cuvânt: **„Înregistrează 2 s”** (numărătoare inversă, apoi ~60 de cadre) sau **„Un cadru”** (ca „Salvează exemplul” din LSR Translator).
3. Fă 2–3 înregistrări sau 20–50 de cadre pe cuvânt, cu mici variații de poziție.
4. Înregistrează și **„FĂRĂ SEMN”** (mâini în repaus), ca să nu fie confundate cu semne.
5. Verifică cu **„Testează”**: vezi live ce cuvânt e recunoscut, fără să trimiți nimic.

Sfaturi: aceeași persoană și aceeași lumină ca la prezentare; semne cu forme de mână clar diferite. Antrenarea se salvează automat în `sign_profiles`, cu rezervă în `localStorage`. **Export / import JSON** mută dicționarul pe alt dispozitiv. Importul acceptă și baza din LSR Translator (lista `lsr_samples_v1` din `localStorage`): cuvintele cunoscute se potrivesc automat, iar cele noi se adaugă în dicționar.

## Funcții pentru validare și demo

1. **Ghidul semnelor** (`/semne` și pe ecranul elevului): cele 250 de semne ASL cu traducerea în română, căutare, link la video-ul ASL (SignASL.org) și la căutarea semnului românesc în DLMG. De pe ecranul elevului, orice cuvânt poate fi trimis direct, ca plasă de siguranță.
2. **Ghid de încadrare** pe cameră: avertizează când lumina e slabă, când elevul e prea aproape sau prea departe, ori când mâna iese din cadru. Semnele sunt recunoscute mai bine, iar demo-ul live e mai sigur.
3. **Statistici și ipoteze** la finalul lecției, pe toate ecranele: semne trimise, prin cameră sau manual, semne necunoscute, alerte, timpul de reacție al profesorului (din „Am văzut”), încrederea medie. Pe baza lor se evaluează trei ipoteze: H1 reacție sub 10 s, H2 cel puțin 70% semne recunoscute, H3 cel puțin 50% semne prin cameră. Profesorul descarcă totul ca **CSV**.
4. **Feedback** la final (elev și profesor): nota generală, cât de bine s-au înțeles, comentariu. Se salvează în tabela `lesson_feedback` (RLS: fiecare își scrie propriul feedback; profesorul le vede pe toate).
5. **Pagina „Despre”** (`/despre`): problema, utilizatorii, tema „middleman”, arhitectura, modelul open source, ipotezele, impactul, limitările și sursele (OMS, Google ISLR, RoCoISLR, DLMG). E gândită pentru pitch și pentru întrebările juriului.

## Demo live (60–90 de secunde)

Totul e real: semnele elevului și vocea profesorului. Nu există un scenariu automat.

1. **Profesorul**: pe `/`, alege șablonul *Biologie · Fotosinteza* și apasă „Creează lecția”.
2. **Elevul** scanează QR-ul și alege „Sunt elevul”. **Proiectorul** deschide același cod și alege „Ecranul clasei”. Apare „Profesor conectat / Elev conectat / Ecranul clasei conectat”.
3. Profesorul pornește microfonul: *„Andrei, te rog să fii atent la tablă. Astăzi vorbim despre fotosinteză.”* Elevul vede subtitrarea live și primește alerta de nume.
4. Elevul semnează în ASL (de exemplu **why** → „De ce?”) sau, în modul „Dicționarul meu”, **NU ÎNȚELEG**. După confirmarea de 1,5 s, semaforul devine roșu, telefonul profesorului spune „Nu am înțeles.” și insigna pulsează. Profesorul apasă „Am văzut” și repetă mai simplu.
5. Elevul semnează **TERMEN** („Ce este fotosinteza?”), apoi **DA** sau **AM TERMINAT** după explicație.
6. Profesorul anunță: *„Tema pentru mâine: exercițiile 1, 2 și 3 de la pagina 42.”* Elevul primește alerta de temă.
7. Profesorul apasă **„Încheie lecția”**: memoria lecției apare pe toate cele trei ecrane, cu butonul „Copiază”.

Plasa de siguranță: dacă un semn nu e recunoscut în sală, elevul atinge cuvântul din dicționar (sau tastele 1–9). Profesorul are „Replici rapide” și câmpul de text.

## Scurtături de tastatură

| Tasta | Ecran | Acțiune |
| --- | --- | --- |
| `1`–`9` | elev | Trimite manual cuvântul din dicționar |
| `Esc` | elev | Anulează semnul aflat în confirmare |

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
- **ASL, nu LSR**: modelul open source recunoaște semne ASL, cu vocabular orientat spre copii (proiectul PopSign). Pentru LSR nu există încă un model public.
- **Semne izolate**: un semn odată, nu propoziții în limbajul semnelor.
- **Vocabular mic**: 250 de semne ASL + dicționarul personal (15 cuvinte de bază + cuvintele elevului).
- **Consola în dezvoltare**: LiteRT.js scrie mesaje informative pe stderr, iar overlay-ul Next.js le numără ca „issues”. Nu sunt erori și nu apar în producție.
- **Antrenare personală**: modelul funcționează cel mai bine pentru persoana, camera și lumina din momentul antrenării.
- **Profilul pe alt dispozitiv**: autentificarea e anonimă, deci fiecare dispozitiv are propriul cont. Antrenarea se mută cu export / import JSON.
- **Vocea**: `SpeechRecognition` merge în Chrome și Edge (are nevoie de internet). Firefox și Safari nu sunt suportate pentru microfon; poți folosi câmpul de text. Vocile românești pentru `speechSynthesis` depind de sistemul de operare.
- **Vibrația**: nu funcționează pe iOS; alertele rămân vizuale.

## Licențe și atribuire

- Recunoașterea feței: [@vladmandic/face-api](https://github.com/vladmandic/face-api), licență MIT; modelele se încarcă de pe jsDelivr.

- Modelul ASL: **ASL Realtime Transformer** © Ceyda Akın, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sursa: <https://www.kaggle.com/models/ceydaakin2004/asl-realtime-transformer>.
- Datele de antrenare ale modelului: **Google – Isolated Sign Language Recognition** (Deaf Professional Arts Network, Georgia Institute of Technology), CC BY 4.0.
- Preprocesarea (`src/lib/asl/preprocess.ts`): portată din [ceydaakin/asl-realtime](https://github.com/ceydaakin/asl-realtime), licență MIT.
- LiteRT.js (`@litertjs/core`): Apache-2.0. MediaPipe: Apache-2.0.
