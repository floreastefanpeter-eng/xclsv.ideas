# SIGNals — platforma lecției accesibile

**Elevul semnează. Clasa înțelege.**

Live: **https://signals.akiokun.com**

SIGNals este un „kit al clasei” pentru elevii surzi sau hipoacuzici. Mediază lecția în ambele sensuri:

| Piesă | În demo | Ce face |
| --- | --- | --- |
| **Insigna elevului** | telefonul / laptopul elevului (`/elev/[code]`) | Camera recunoaște semnele elevului; profesorul le aude ca voce și le vede ca text. Elevul vede subtitrările profesorului și primește alerte de vibrație. |
| **Insigna profesorului** | telefonul profesorului (`/profesor/[code]`) | Microfonul transformă vocea în subtitrări live. Insigna se aprinde și vibrează când elevul nu a înțeles sau vrea să intervină. |
| **Masa elevului** | tableta sau telefonul de pe bancă (`/masa/[code]`) | Tot ce spune profesorul, foarte mare și în timp real, tradus în limba aleasă (engleză, franceză, maghiară, ucraineană…), plus termenii lecției explicați simplu. Fără cont, doar cu codul. |
| **Ecranul clasei** | proiectorul (`/clasa/[code]`) | Conversația în ambele sensuri, semaforul elevului și, la final, memoria lecției generată de AI. |

SIGNals începe cu **contul**: profesorul și elevul se înregistrează (email + parolă, Supabase Auth). Profesorul scrie doar materia și titlul lecției — **termenii-cheie se extrag automat** din ce spune în timpul lecției.

## Tehnologii

### Frontend

| Tehnologie | Versiune | La ce folosește | Licență |
| --- | --- | --- | --- |
| [Next.js](https://nextjs.org) (App Router, Turbopack) | 16.3 | aplicația, rutele, rutele API de pe server | MIT |
| [React](https://react.dev) + React Compiler | 19.2 | interfața | MIT |
| [TypeScript](https://www.typescriptlang.org) | 5 | tot codul | Apache-2.0 |
| [Tailwind CSS](https://tailwindcss.com) | 4 | stilurile și tokenii de design (`src/app/globals.css`) | MIT |
| [shadcn/ui](https://ui.shadcn.com) (stil *base-nova*) + [Base UI](https://base-ui.com) | 4 / 1.8 | butoane, câmpuri, meniuri, dialoguri, sheet | MIT |
| [motion](https://motion.dev) + `tw-animate-css` | 14 | animații, „reduce motion” respectat | MIT |
| [sonner](https://sonner.emilkowal.ski) | 2 | notificări | MIT |
| [lucide-react](https://lucide.dev) | 1.52 | iconițe | ISC |
| [qrcode.react](https://github.com/zpao/qrcode.react) | 4 | codul QR al lecției | ISC |
| [zod](https://zod.dev) | 4 | validarea datelor în rutele API | MIT |
| [Geist / Geist Mono](https://vercel.com/font) (prin `next/font`) | — | fonturile (cu diacritice și chirilice) | SIL OFL 1.1 |

### Inteligență artificială și recunoaștere (în browser)

| Tehnologie | La ce folosește | Licență |
| --- | --- | --- |
| [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe) `0.10.14` | HolisticLandmarker (corp + mâini), HandLandmarker, FaceDetector (BlazeFace) | Apache-2.0 |
| [LiteRT.js](https://ai.google.dev/edge/litert) (`@litertjs/core`) | rulează modelul ASL în WebAssembly | Apache-2.0 |
| [ASL Realtime Transformer](https://www.kaggle.com/models/ceydaakin2004/asl-realtime-transformer) (Ceyda Akın) | recunoaște 250 de semne ASL | CC BY 4.0 (atribuire afișată) |
| [face-api](https://github.com/vladmandic/face-api) (@vladmandic) | identitatea elevului înregistrat (estomparea colegilor) | MIT |
| k-NN + DTW proprii (`src/lib/knn.ts`, `moving-signs.ts`), după LSR Translator | dicționarul personal: semne statice și cu mișcare | — |
| Filtrul One Euro (`src/lib/one-euro.ts`) | netezirea punctelor mâinilor | — |
| Web Speech API (`SpeechRecognition`, `speechSynthesis`) | vocea profesorului → text; fraza elevului → voce | API-ul browserului |

### AI pe server

| Serviciu | La ce folosește | Fără cheie |
| --- | --- | --- |
| [Claude API](https://www.anthropic.com/api) (Anthropic, `@anthropic-ai/sdk`, model `ANTHROPIC_MODEL`, implicit `claude-sonnet-5-5`) | memoria lecției, termenii-cheie cu explicații, traducerea | rezumat local, extractor local, MyMemory |
| [MyMemory](https://mymemory.translated.net/doc/spec.php) | traducere gratuită, rezervă | — |

### Backend și găzduire

| Serviciu | La ce folosește |
| --- | --- |
| [Supabase](https://supabase.com) | Postgres + Row Level Security, Auth (email + parolă, anonim), Realtime (Postgres Changes, Broadcast, Presence) |
| [Vercel](https://vercel.com) | găzduire, rutele API (Node.js), domeniul `signals.akiokun.com` |

### Cum a fost construit

- Aplicația a fost dezvoltată cu ajutorul **Claude** (Anthropic), prin **Claude Code**: cercetarea bibliotecilor open source, arhitectura, codul, migrațiile Supabase, designul interfeței și verificările (TypeScript, ESLint, build, teste în browser). Echipa a stabilit cerințele, a luat deciziile și a testat aplicația.
- În aplicație, **Claude API** scrie memoria lecției, extrage termenii-cheie și traduce subtitrările (doar pe server; cheia nu ajunge în browser).
- Designul (roșu, alb, negru) e documentat în `DESIGN.md`, iar contextul produsului în `PRODUCT.md`.
- Tot ce s-a făcut cu Claude, pas cu pas: [`LUCRUL-CU-CLAUDE.md`](LUCRUL-CU-CLAUDE.md).

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
NEXT_PUBLIC_SITE_URL=https://signals.akiokun.com            # unde duc linkurile din emailuri
```

Cheile `SUPABASE_SERVICE_ROLE_KEY` și `ANTHROPIC_API_KEY` sunt citite doar în `src/app/api/...` și `src/lib/supabase/server.ts` (marcat `server-only`); nu ajung niciodată în browser. Fără `ANTHROPIC_API_KEY`, memoria lecției se generează local, fără AI, cu un mesaj clar. Fără `SUPABASE_SERVICE_ROLE_KEY`, memoria se generează local pe dispozitivul profesorului și se trimite tuturor ecranelor.

### 3. Pornire

```bash
npm run dev
```

Deschide <http://localhost:3000>. Pe `localhost` camera și microfonul funcționează fără HTTPS.

Pentru testul complet pe un singur calculator, deschide trei ferestre Chrome: profesor, elev, clasă. Toate pot folosi același browser.

## Deploy pe Vercel și testarea pe telefoane

Pe telefon, camera și microfonul cer **HTTPS**. Producția rulează pe Vercel, la **https://signals.akiokun.com** (proiectul Vercel `xclsv.ideas`).

**Din terminal (Vercel CLI):**

```bash
npx vercel login
npx vercel link --project xclsv.ideas
npx vercel deploy --prod
```

**Sau din GitHub:** în Vercel → proiectul → *Settings → Git*, conectează repo-ul; fiecare push pe `main` face deploy automat.

Variabilele din *Settings → Environment Variables* (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `ANTHROPIC_MODEL` și, opțional, `ANTHROPIC_API_KEY` și `SUPABASE_SERVICE_ROLE_KEY`. Variabilele `NEXT_PUBLIC_*` intră în build: după ce le schimbi, fă un redeploy.

**Domeniul propriu:** în Vercel → *Settings → Domains* adaugă domeniul; în DNS (aici Cloudflare) un `CNAME` spre Vercel.

Test local pe telefon: `npx next dev --experimental-https`, apoi `https://<IP-ul-laptopului>:3000` (acceptă certificatul local).

**iPhone:** recunoașterea vocală merge doar în **Safari** (Chrome pe iPhone nu o are). Permite microfonul din *aA → Setări site web → Microfon* și pornește *Setări → General → Tastatură → Dictare*. iOS nu poate vibra din browser: alertele rămân vizuale.

## Conturi, termeni-cheie extrași automat și traducere

- **Testimoniale** (`/testimoniale`, cu link din meniu și secțiune pe prima pagină): la finalul lecției, profesorul și elevul pot scrie câteva cuvinte și pot bifa acordul de publicare. Pagina arată doar testimonialele cu acord (prenume, rol, școală), prin funcția publică `public_testimonials()`. Nu se inventează testimoniale.
- **Administrare** (`/admin`): situația platformei, toți utilizatorii (cu schimbarea rolului), toate lecțiile (încheiere, ștergere, ecranul clasei) și feedback-ul. Primul administrator se numește din SQL (vezi `CLAUDE.md`); apoi un administrator îi poate numi pe alții.
- **Linkurile din emailuri**: duc la `NEXT_PUBLIC_SITE_URL` (de ex. `https://signals.akiokun.com`). În Supabase → *Authentication → URL Configuration*, pune aceeași adresă la *Site URL* și adaugă `https://signals.akiokun.com/**` la *Redirect URLs*.
- **Confirmarea prin cod**: după „Cont nou”, SIGNals cere codul de 6 cifre din email (cu „Retrimite codul”). În Supabase → *Authentication → Email Templates → Confirm signup*, adaugă în șablon `{{ .Token }}` (codul); linkul `{{ .ConfirmationURL }}` poate rămâne.
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

**Semn necunoscut:** dacă cel mai probabil semn are sub **50%**, SIGNals nu ghicește. Elevul vede „Semn necunoscut” cu cele mai apropiate 3 variante, iar în conversație apare „Andrei: semn necunoscut” (fără voce). Profesorul vede „Andrei a făcut un semn necunoscut”, iar semnul intră în statistici. În modul „Dicționarul meu”, un semn ținut nemișcat care nu seamănă cu niciun cuvânt (scor de potrivire sub 0,45) e raportat la fel.

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

1. **Numele și consimțământul**: elevul își dă acordul pe dispozitiv. Aplicația e gândită pentru elevi între 3 și 21 de ani; pentru minori, acordul părinților se obține de școală înainte de folosire. Pagina explică pe scurt ce se întâmplă cu datele.
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

**De ce așa:** recunoașterea feței înseamnă date biometrice (art. 9 GDPR). Le procesăm doar cu consimțământ explicit, într-un singur scop, local, cu drept de ștergere. Camera SIGNals oricum nu înregistrează și nu transmite video.

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

**Cu o zi înainte**
- Creează conturile (un profesor, un elev) pe https://signals.akiokun.com și intră o dată cu fiecare, pe dispozitivele de la demo.
- Pe telefonul elevului: `/elev/antrenare` → **Prezentare în 2 semne**. Se adaugă **SALUT** („Bună!”, salutul ASL *hello*: palma la tâmplă, apoi spre în afară — antrenat cu *Mișcare*) și **ELEV VIANU** („Sunt elev la Colegiul Național de Informatică Tudor Vianu.”, mâna „Y”: degetul mare și cel mic întinse, ținută nemișcat — antrenat cu *Înregistrează 2 s*). 2–3 înregistrări fiecare, în lumina din sală. Rezervă: **Prezentare într-un semn** (o singură frază).
- Telefonul profesorului: volumul sus; Chrome sau Edge (recunoașterea vocală).

**Pe scenă**
1. **Profesorul** intră în cont → *Panoul meu* → șablonul *Biologie · Fotosinteza* → **Pornește lecția**. Pe ecran apare codul și QR-ul.
2. **Elevul** intră cu codul. **Tableta de pe masă** (sau proiectorul) scanează QR-ul → *Masa elevului* / *Ecranul clasei*. Pe linia de sus se aprind stațiile: Profesor, Elev, Masa.
3. Elevul alege **Dicționarul meu** și face semnele **SALUT**, apoi **ELEV VIANU**. După confirmarea de 1,5 s a fiecăruia, telefonul profesorului spune cu voce: *„Bună!”*, apoi *„Sunt elev la Colegiul Național de Informatică Tudor Vianu.”*
4. Profesorul pornește microfonul: *„Bun venit! Astăzi vorbim despre fotosinteză. Clorofila este pigmentul verde din frunze.”* Pe masa elevului apare textul mare, tradus în limba aleasă; termenii-cheie apar singuri.
5. Elevul semnează **NU ÎNȚELEG**: semaforul devine roșu, telefonul profesorului rostește „Nu am înțeles.” și insigna pulsează. Profesorul apasă **Am văzut**.
6. Profesorul anunță: *„Tema pentru mâine: exercițiile 1, 2 și 3 de la pagina 42.”* Elevul primește alerta de temă.
7. **Încheie lecția**: memoria lecției apare pe toate ecranele, tradusă pentru elev.

**Plasa de siguranță**: dacă un semn nu e recunoscut în sală, elevul atinge cuvântul din dicționar (sau tastele 1–9) — fraza se rostește la fel. Profesorul are *Replici rapide* și câmpul de text.

## Scurtături de tastatură

| Tasta | Ecran | Acțiune |
| --- | --- | --- |
| `1`–`9` | elev | Trimite manual cuvântul din dicționar |
| `Esc` | elev | Anulează semnul aflat în confirmare |

## Backend și arhitectură

### Cum circulă datele

```
 Telefonul profesorului ──┐                         ┌── Telefonul elevului (cameră, semne)
 (microfon → text)        │   Supabase Realtime     │
                          ├── canal lesson:{code} ──┼── Masa elevului (subtitrări mari, traduse)
 Proiectorul clasei ──────┘   Postgres + RLS        └── Administrare
                                    │
                        Rute API Next.js pe Vercel (Node.js)
                        ├─ /api/lessons/[code]/summary  → Claude → memoria lecției
                        ├─ /api/lessons/[code]/terms    → Claude → termenii-cheie
                        └─ /api/translate               → Claude / MyMemory
```

Video-ul și recunoașterea semnelor rulează **doar în browser** (MediaPipe, LiteRT, face-api). Pe server ajunge doar textul.

### Supabase: tabele

| Tabelă | Ce conține | Cine are acces (RLS) |
| --- | --- | --- |
| `profiles` | rol (`teacher` / `student` / `admin`), nume, școală, limba subtitrărilor | fiecare își vede și editează propriul profil; rolul îl schimbă doar un admin |
| `lessons` | cod, materie, titlu, termeni, glosar (termen + explicație), numele elevului, stare | participanții citesc; doar profesorul lecției modifică |
| `participants` | cine e în ce lecție și cu ce rol | participanții lecției |
| `messages` | conversația: semne, voce, text, mesaje de sistem (cu `meta` JSON) | participanții citesc; profesorul scrie orice, elevul doar ca elev |
| `lesson_summaries` | memoria lecției (notițe, temă, termeni, rezumat) | participanții citesc; scrie doar serverul |
| `lesson_feedback` | nota, cât s-a înțeles, comentariu | fiecare își scrie feedback-ul; profesorul lecției le vede |
| `sign_profiles` | dicționarul de semne antrenat (puncte ale mâinilor, nu imagini) | doar proprietarul |

### Supabase: funcții (RPC) și triggere

- `create_lesson(subject, title, terms?, student_name?)` — creează lecția cu un cod de 6 caractere fără caractere confundabile; ecranele anonime fără profil nu pot crea lecții.
- `join_lesson(code, role, display_name)` — intrarea pe bază de cod (tabela `lessons` nu e publică); numele elevului cu cont ajunge pe lecție.
- `is_participant`, `participant_role`, `is_admin` — ajutătoare `security definer` pentru RLS.
- `admin_overview`, `admin_users`, `admin_set_role`, `admin_lessons`, `admin_end_lesson`, `admin_delete_lesson`, `admin_feedback` — panoul `/admin`; fiecare verifică întâi `is_admin()`.
- Trigger `on_auth_user_created` — creează profilul din datele formularului de înregistrare.
- Trigger `profiles_guard_role` — nimeni nu își poate da singur alt rol (nici admin).

Migrațiile, în ordine, sunt în `supabase/migrations/` (schema, drepturi, feedback, conturi, conturi demo, administrare).

### Supabase: autentificare

- **Email + parolă** pentru profesori, elevi și administratori (confirmare prin cod de 6 cifre sau link).
- **Anonim** pentru ecranele partajate (masa elevului, proiectorul) și pentru **conturile demo** (sesiune anonimă + profil), create automat când emailul de confirmare nu poate pleca.
- Rutele API verifică `Authorization: Bearer <token>`; termenii și traducerea folosesc un client Supabase cu tokenul utilizatorului, deci RLS se aplică și pe server.

### Timp real (un canal per lecție, `lesson:{code}`)

- **Postgres Changes:** mesajele noi, memoria lecției, schimbările lecției (termeni, stare).
- **Broadcast** (nu se salvează): `semafor`, `caption_interim` (subtitrarea în timp ce profesorul vorbește), `buzz`, `teacher_alert`, `teacher_alert_ack`, `pending_sign`, `pending_cancel`, `summary_ready`.
- **Presence:** cine e conectat (profesor, elev, masă, clasă), afișat ca „harta liniei”.

### Rute API (`src/app/api`)

| Rută | Cine o poate apela | Ce face |
| --- | --- | --- |
| `POST /api/lessons/[code]/summary` | profesorul lecției | memoria lecției cu Claude (sau local), o salvează și o trimite tuturor ecranelor |
| `POST /api/lessons/[code]/terms` | profesorul lecției | termenii-cheie + explicații, scrise în `lessons.glossary` |
| `POST /api/translate` | orice sesiune validă | traduce până la 20 de fraze (Claude, apoi MyMemory), cu cache |

### Structura codului

```
src/
  app/            rutele: /, /panou, /admin, /j/[code], /profesor/[code], /elev/[code], /masa/[code],
                  /clasa/[code], /elev/antrenare, /elev/inregistrare, /semne, /despre, api/
  components/
    screens/      ecranele (încărcate doar în browser)
    punte/        logo, bara de navigație, demo-ul fluxului, conversația, semaforul, QR, memoria lecției…
    ui/           shadcn/ui
  hooks/          use-auth, use-lesson (Realtime), use-hand-tracker, use-face-privacy, use-translations,
                  use-speech-recognition, use-sign-profile
  lib/            asl/ (model ASL), face/ (fețe), knn, moving-signs, one-euro, camera, languages, supabase/
supabase/migrations/
public/brand/     logo-ul SIGNals    public/models/asl/   modelul ASL (1,5 MB)
```

## Limitări cunoscute

- **ASL, nu LSR:** modelul open source recunoaște 250 de semne ASL izolate. Pentru limbajul mimico-gestual românesc nu există încă un model public; dicționarul personal permite oricărui elev să-și antreneze semnele.
- **Semne izolate:** un semn odată, nu propoziții în limbajul semnelor. Un semn personal poate rosti însă o frază întreagă.
- **Antrenare personală:** dicționarul merge cel mai bine pentru persoana, camera și lumina din momentul antrenării.
- **Vocea profesorului** e transformată în text de serviciul browserului (Google în Chrome/Edge, Apple în Safari), deci are nevoie de internet. Firefox nu are recunoaștere vocală; pe iPhone merge doar Safari.
- **Vocile românești** pentru `speechSynthesis` depind de sistemul de operare.
- **Vibrația** nu funcționează pe iOS; alertele rămân vizuale.
- **Traducerea gratuită** (MyMemory) are o limită zilnică; pentru o clasă reală e nevoie de `ANTHROPIC_API_KEY`.
- **Emailurile** Supabase au o limită pe oră; pentru o școală e nevoie de un server SMTP propriu.

## Licențe și atribuire

**Tot ce folosește aplicația are licențe open source permisive.** Verificat cu `license-checker` pe dependențele de producție: 316 MIT, 22 ISC, 11 Apache-2.0, 12 BSD, plus câteva licențe la fel de permisive (BlueOak, 0BSD, Unlicense, CC0, Python-2.0). Excepții, toate compatibile:

- `sharp` (folosit de Next.js pentru imagini) include `libvips` sub **LGPL-3.0**, încărcat ca bibliotecă separată, ceea ce licența permite.
- `caniuse-lite` (date despre browsere, la build) e **CC BY 4.0**.

Obligații de atribuire, îndeplinite în aplicație și aici:

- **Modelul ASL:** *ASL Realtime Transformer* © Ceyda Akın, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — <https://www.kaggle.com/models/ceydaakin2004/asl-realtime-transformer>. Creditul e afișat pe pagina principală, în ghidul semnelor și la `/despre`.
- **Datele de antrenare ale modelului:** *Google – Isolated Sign Language Recognition* (Deaf Professional Arts Network, Georgia Institute of Technology), CC BY 4.0.
- **Preprocesarea** (`src/lib/asl/preprocess.ts`): portată din [ceydaakin/asl-realtime](https://github.com/ceydaakin/asl-realtime), MIT.
- **MediaPipe** și **LiteRT.js:** Apache-2.0. **face-api:** MIT (modelele se încarcă de pe jsDelivr).
- **Fonturile Geist:** SIL Open Font License 1.1.
- **Dicționarul personal:** algoritmul de normalizare și k-NN urmează proiectul LSR Translator.

Servicii externe (au termeni proprii, nu licențe open source): Supabase, Vercel, Claude API (Anthropic), MyMemory, serviciile de recunoaștere vocală ale browserelor (Google, Apple), jsDelivr (CDN pentru modele) și SignASL.org / DLMG (linkuri din ghidul semnelor).

**Logo-ul SIGNals** aparține echipei. **Codul acestui repo** nu are încă un fișier `LICENSE`: până se adaugă unul, drepturile rămân ale autorilor. Pentru a-l face open source, adaugă de exemplu un fișier `LICENSE` cu licența MIT.

