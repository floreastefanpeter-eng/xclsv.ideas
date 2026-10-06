# SIGNals — ce s-a făcut cu Claude

Acest document descrie, onest și complet, cum a fost folosit **Claude** (Anthropic) în proiectul SIGNals: ce a construit, ce a decis echipa, ce a verificat și ce a rămas în grija noastră.

- **Asistentul:** Claude Code (aplicația desktop Claude, tab-ul Code), model **Claude Opus 5.5**.
- **Perioada:** 4–5 octombrie 2026, pentru hackathonul cu tema „middleman”.
- **Rolul echipei:** a stabilit problema, cerințele și direcția, a ales între variantele propuse, a testat pe telefoane reale și a făcut demo-ul. Toate deciziile de produs (rolurile, culorile, numele, ce se păstrează sau se șterge) au fost ale echipei.
- **Rolul lui Claude:** cercetare, arhitectură, cod, baza de date, design, verificări și documentație, la cererea echipei și cu întrebări de confirmare la fiecare decizie importantă.
- **Claude în aplicație:** separat de dezvoltare, aplicația folosește **Claude API** pe server pentru memoria lecției, termenii-cheie și traducere (vezi la final).

Fiecare pas e în istoricul git: commit-urile făcute cu Claude au linia `Co-Authored-By: Claude Opus 5.5`.

---

## 1. Prima versiune: „Punte” (commit `3086e55`)

Aplicația de bază, construită cu Claude pe Next.js 16 + Supabase:

- lecții cu cod de 6 caractere și QR; ecranele profesorului, elevului și proiectorului, legate prin Supabase Realtime (mesaje, semafor, alerte, prezență);
- securitate: Row Level Security pe toate tabelele, intrarea în lecție prin funcții `security definer`;
- profesorul: recunoaștere vocală în română → subtitrări live, alerte de vibrație, replici rapide, confirmarea alertelor cu timpul de reacție;
- elevul: recunoașterea semnelor cu modelul open source **ASL Realtime Transformer** (250 de semne, LiteRT.js) sau cu un dicționar personal (k-NN pentru forme statice, DTW pentru semne cu mișcare); semnele nesigure sunt raportate ca „necunoscute”, nu ghicite;
- protecția fețelor: înregistrarea feței elevului pe dispozitiv (face-api), restul fețelor pixelate;
- memoria lecției cu Claude, statistici și ipoteze (H1–H3) cu export CSV, feedback la final, ghidul semnelor, pagina „Despre”, README.

## 2. Versiunea 2: conturi, masa elevului, traducere (commit `7022103`)

Cererea echipei: cercetare pentru biblioteci mai bune, estomparea fețelor „fără cusur”, aplicația să înceapă cu autentificare, termenii-cheie să nu mai fie o corvoadă pentru profesor, traducere, mobil, un ecran pe masa elevului, roșu și albastru.

**Cercetarea** (sintetizată în README, secțiunea „Cercetare”): MediaPipe față de Human, handtrack.js, YoHa; modele de limbaj al semnelor (ASL Realtime Transformer, sign.mt, SignGemma); soluții de estompare a fețelor. Concluzii: MediaPipe rămâne cel mai bun în browser; modelul ASL rămâne cel mai bun model izolat care rulează local; nu există încă un model public pentru limbajul mimico-gestual românesc (LSR).

**Decizii luate de echipă** la întrebările lui Claude: „ecranul de pe masă” = tableta de pe banca elevului; termenii-cheie extrași de AI; conturi pentru profesor și elev; traducere cu Claude și rezervă gratuită (MyMemory); direcția vizuală „semnalistica metroului”.

**Ce s-a construit:**
- conturi cu email și parolă (Supabase Auth), profiluri create automat de un trigger, panoul `/panou` pentru profesor și elev;
- `/masa/[code]`: subtitrările profesorului foarte mari, traduse, termenii lecției, alertele, ecranul nu se stinge;
- traducere în 10 limbi (`/api/translate`), termeni-cheie extrași automat în timpul lecției (`/api/lessons/[code]/terms`);
- estomparea fețelor refăcută: detecție BlazeFace la fiecare cadru, urmărire cu predicție de mișcare, identitate verificată la 0,6 s, „fail-closed” (în caz de dubiu, se estompează);
- filtrul One Euro pentru mâini (semne mai stabile);
- redesign complet, responsive pe telefon;
- verificarea designului cu un sub-agent de review independent și documentarea în `DESIGN.md`.

## 3. Lansarea și conturile

- **Deploy:** Claude a legat proiectul Vercel `xclsv.ideas` și a publicat aplicația pe **https://** prin Vercel CLI, după ce echipa s-a logat. A găsit de ce se vedea versiunea veche (proiectele Vercel erau legate de alt cont GitHub) și de ce pagina cădea (lipseau variabilele Supabase), apoi a reparat ambele.
- **Conturi fără limite pentru demo:** când serverul de email Supabase atinge limita, contul se creează ca „cont demo” pe dispozitiv; confirmarea se poate face și cu un cod de 6 cifre.
- **Administrare:** rolul `admin`, panoul `/admin` (utilizatori, lecții, feedback, statistici) și protecția ca nimeni să nu-și poată da singur rolul de admin; contul echipei a fost numit administrator.
- **Linkurile din emailuri:** duc la adresa publică a site-ului, nu la `localhost`.

## 4. Rebranding: SIGNals

- Numele **SIGNals** peste tot (titluri, texte, documentație).
- **Logo-ul echipei** a fost decupat de Claude din imaginea primită, cu margini transparente: marca, wordmark-ul și iconița aplicației (favicon).
- Redesign **roșu + alb + negru**, la cererea echipei: font Geist, demo interactiv al fluxului „Profesor → Voce → Text → Traducere → Elev” (și invers), conectarea unui ecran ca „terminal de sesiune”, bară de navigație care se micșorează la derulare. Semaforul elevului își păstrează cele 4 culori (decizia echipei: e informație, nu decor).

## 5. Reparații după testele pe telefoane

Echipa a testat pe telefoane și a semnalat problemele; Claude le-a diagnosticat și reparat:

| Problema raportată | Cauza găsită | Ce s-a schimbat |
| --- | --- | --- |
| Estomparea „ciudată” | fața redusă la 12 pixeli (o pată), margine tare, ușor decalată | blur moale pe tot cadrul, afișat doar în ovale cu margini estompate, mărimi netezite |
| Se estompa mâna | detectorul de fețe confunda uneori mâna | o „față” aflată în mână e ignorată; o față nouă cere detecție sigură |
| Clipea estomparea pe propria față | mâna care trecea prin fața elevului îl făcea „necunoscut” | fața care reapare în același loc rămâne a elevului |
| Camera prea „mărită” | camera cerea 640×480 (tăia din margini) | imaginea completă 1280×720, zoom minim, rama după forma reală a imaginii |
| Camera mică, benzi negre pe telefon | rama se micșora, fundalul rămânea lat | rama ocupă toată lățimea |
| Microfonul refuzat pe iPhone | mesajul era scris pentru Chrome pe Android/desktop | instrucțiuni pentru Safari (setările site-ului, dictarea Apple) |
| Mesajele vechi nu se traduceau | o frază netradusă bloca tot lotul | traducere frază cu frază, întâi cele noi, apoi tot istoricul |
| Mâinile dispăreau la mișcări rapide | MediaPipe pierdea mâna la imaginea neclară | praguri mai mici, cameră până la 60 fps, mâna „ținută” până la 0,25 s |
| Semnele nu erau în cloud | antrenarea se salva sub o sesiune anonimă, per telefon | dicționarul se sincronizează cu contul; semnele de pe telefon se mută în cont |

Tot aici, Claude a găsit singur două probleme pe care nu le raportase nimeni:
- textul „video și audio nu părăsesc dispozitivul” nu era adevărat pentru voce (recunoașterea vocală a browserului trimite sunetul la Google sau Apple); textul a fost corectat;
- după logare, aplicația putea folosi în continuare o sesiune veche; a fost reparat.

## 6. Pregătirea demo-ului

- **Prezentarea elevului prin semne:** cuvinte personale care rostesc o frază întreagă. Varianta finală are 2 semne: **SALUT** („Bună!”, salutul ASL) și **ELEV VIANU** („Sunt elev la Colegiul Național de Informatică Tudor Vianu.”, mâna „Y”), cu indicații pe card; plus o variantă într-un singur semn.
- Scenariul demo-ului (README, „Demo live”), analiza punctajului după grila juriului, verificarea licențelor tuturor dependențelor, README complet (tehnologii, backend, licențe).
- **Pornire de la zero:** la cererea echipei, toate conturile și datele de test au fost șterse din Supabase; a rămas doar contul de administrator.

---

## Cum a lucrat Claude

- **Întrebări înainte de decizii:** la fiecare alegere care schimba rezultatul (ce înseamnă „ecranul de pe masă”, paleta de culori, ce conturi se șterg), Claude a întrebat și a lucrat după răspunsul echipei.
- **Verificări după fiecare schimbare:** TypeScript, ESLint, build de producție, teste mici automate pentru logica nouă (urmărirea fețelor, mâinile ținute, extragerea termenilor) și verificări în browser, pe desktop și în format de telefon.
- **Baza de date:** migrațiile Supabase au fost aplicate și testate în tranzacții anulate (de exemplu: un elev nu poate deveni singur admin; un ecran anonim nu poate crea lecții).
- **Sub-agenți de review:** pentru design, un agent separat a evaluat interfața „la rece”, iar observațiile lui au fost reparate.
- **Instrumente folosite:** Supabase (migrații, SQL, loguri), Vercel CLI (deploy), un browser integrat pentru teste, skill-ul de design *impeccable*, npm, git.

## Ce nu a putut face Claude (și a făcut echipa)

- **Logarea în conturi:** Claude nu introduce parole și nu se loghează în locul echipei. Push-ul pe GitHub și logarea în Vercel au fost făcute de echipă.
- **Setările de autentificare Supabase:** „Confirm email”, șablonul emailului, adresele de redirecționare.
- **Testele reale:** pe camere și telefoane reale (semne, estomparea fețelor, microfonul pe iPhone).
- **Conturi reale:** Claude nu a creat conturi în aplicația publică; a testat logica în baza de date, în tranzacții anulate.
- **Validarea cu utilizatori:** testarea cu elevi surzi și profesori rămâne pasul cel mai important.

## Claude în aplicație (Claude API)

Pe server, în rutele `src/app/api`, cu cheia `ANTHROPIC_API_KEY` (care nu ajunge niciodată în browser):

| Funcție | Ce face | Fără cheie |
| --- | --- | --- |
| Memoria lecției | notițe, temă, termeni, rezumat în română simplă, la finalul lecției | rezumat generat local |
| Termenii-cheie | aleg termenii lecției din vorbirea profesorului și îi explică simplu | extractor local |
| Traducerea | subtitrările, termenii și memoria lecției, în limba elevului | API-ul gratuit MyMemory |

Modelul se alege din `ANTHROPIC_MODEL` (implicit `claude-sonnet-5-5`).
