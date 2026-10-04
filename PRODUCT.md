# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Elevul surd sau hipoacuzic** (gimnaziu/liceu) — într-o clasă obișnuită, cu telefonul sau tableta pe bancă. Semnează către profesor și citește subtitrarea vorbirii profesorului, eventual tradusă (engleză sau altă limbă).
- **Profesorul auzitor** — vorbește la clasă cu telefonul în buzunar sau pe catedră. Pornește lecția, primește alertele elevului („nu am înțeles”), încheie lecția.
- **Ecranele partajate** — proiectorul clasei (`/clasa`) și ecranul de pe masa elevului (`/masa`), deschise prin cod/QR, fără cont.

## Product Purpose

SIGNals este intermediarul („middleman”) lecției: semnele elevului devin voce pentru profesor, vocea profesorului devine subtitrare live (și tradusă) pentru elev, iar AI-ul păstrează memoria lecției. Succes = elevul înțelege lecția în timp real și poate interveni fără să întrerupă clasa; profesorul nu are muncă în plus.

## Positioning

Mediere bidirecțională în clasă, nu doar o aplicație de subtitrare: recunoaștere de semne în browser (model ASL open source + dicționar personal antrenat de elev), semafor de înțelegere, alerte de vibrație, termeni-cheie extrași automat de AI și protecția fețelor colegilor (GDPR), totul local pe dispozitiv cu excepția textului conversației.

## Operating Context

- Clasă zgomotoasă, lumină variabilă, telefoane Android/iOS și laptopuri; proiector în clasă; tabletă sau telefon pe masa elevului.
- Conectarea între dispozitive: cod de 6 caractere sau QR.
- Profesorul și elevul au cont (email + parolă, Supabase); ecranele partajate se conectează anonim prin cod.
- Hackathon (tema „middleman”); demonstrat live.

## Capabilities and Constraints

- Next.js 16 App Router, Supabase (Postgres + RLS, Realtime, Auth), MediaPipe, LiteRT, face-api, Web Speech API, Claude API pe server.
- Toată interfața e în română, cu diacritice. Traducerea se aplică conținutului (subtitrări, memoria lecției) pentru elev.
- Video și audio nu părăsesc dispozitivul; șablonul feței rămâne doar în `localStorage`.
- Recunoașterea vocală e cea mai stabilă în Chrome/Edge; iOS nu poate vibra.
- Semnele recunoscute de model sunt ASL, nu LSR (nu există un model public LSR).

## Brand Commitments

- Numele „SIGNals”, sloganul „Elevul semnează. Clasa înțelege.”
- Identitate: **roșu + alb + negru** (cerință a utilizatorului). Roșu = acțiuni și stări importante, negru = text și navigație, alb = fundal. Singura excepție: cele 4 culori ale semaforului elevului (informație funcțională, mereu cu etichetă).
- Logo-ul oficial (mâinile și unda) din `public/brand/`; numele se scrie exact „SIGNals”.
- Fiecare culoare de semafor este însoțită mereu de o etichetă text. Iconițe `lucide-react`, fără emoji.
- Creditul modelului ASL Realtime Transformer (Ceyda Akın, CC BY 4.0) rămâne vizibil.

## Evidence on Hand

Nu există testimoniale, clienți sau cifre de utilizare reale. Singura cifră publică: acuratețea raportată de autorul modelului ASL (74,7% top-1 pe semnatari nevăzuți). Nu se inventează alte dovezi.

## Product Principles

1. Elevul nu așteaptă: textul profesorului apare imediat, traducerea vine după, fără să blocheze.
2. Zero muncă în plus pentru profesor: ce poate face AI-ul sau aplicația, nu cere profesorului.
3. Confidențialitatea e implicită: dacă protecția fețelor nu e sigură, imaginea rămâne ascunsă.
4. Lizibil de la distanță și pe telefon: text mare, contrast mare, ținte de atingere ≥44 px.

## Accessibility & Inclusion

Utilizatori surzi/hipoacuzici: nicio informație transmisă doar prin sunet; alertele sunt vizuale + vibrație. WCAG AA pentru contrast, `prefers-reduced-motion` respectat, focus vizibil, fonturi foarte lizibile (Geist, cu diacritice și chirilice).
