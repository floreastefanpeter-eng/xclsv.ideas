# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

SIGNals is a hackathon app (theme: "middleman") that mediates a classroom lesson between a deaf/hard-of-hearing student and a hearing teacher. **All UI text is Romanian** — keep new strings in Romanian, with Romanian diacritics (ș, ț, ă, â, î). README.md (also Romanian) is the user-facing documentation.

## Commands

```bash
npm run dev            # dev server on http://localhost:3000 (camera/mic work on localhost without HTTPS)
npm run build          # production build (Next 16, Turbopack) — must pass
npm run lint           # ESLint 9 flat config, includes React Compiler rules (react-hooks/*)
npx tsc --noEmit       # type-check
npx next typegen       # regenerate global route types (PageProps<"/route">, RouteContext<...>) after adding routes
```

There is no test runner. Pure TS modules in `src/lib` can be exercised ad hoc with `node --experimental-transform-types <file>.mts` (they use parameter properties, so plain type stripping is not enough).

Lint is strict about React Compiler rules: no synchronous `setState` in effect bodies (use lazy `useState` initializers or subscribe-and-set in callbacks), no reading refs during render, no self-referencing callbacks (route through a ref).

## Architecture

**Routes** (`src/app`): `/` (login/register + "connect a screen" by code; signed-in users are sent to `next` or `/panou`), `/panou` (dashboard: teacher creates lessons, student joins/sets translation language; both see their lessons), `/j/[code]` (role picker after QR scan: student, desk, class), `/profesor/[code]`, `/elev/[code]`, `/masa/[code]` (student desk tablet: huge live captions, translated, no account), `/clasa/[code]` (projector, dark), `/elev/antrenare` (sign training), `/elev/inregistrare` (student face registration), `/semne` (sign guide), `/despre` (pitch/about), `/admin` (admin panel: overview, users + role changes, lessons end/delete, feedback — every action is a `security definer` RPC `admin_*` that checks `is_admin()`), `POST /api/lessons/[code]/summary`, `POST /api/lessons/[code]/terms`, `POST /api/translate`. Page files are thin server components that `await params` and render a screen from `src/components/screens/client-screens.tsx`, which loads every interactive screen with `next/dynamic({ ssr: false })` — MediaPipe, LiteRT, face-api and Web Speech must never run on the server. Exception: `/` renders `home-screen.tsx` directly (Supabase is only touched in effects).

**Supabase** (`supabase/migrations/`, applied to project `zybgnpvnvnjrzpdljkum`): teachers and students have email/password accounts; a trigger on `auth.users` creates `profiles` (`role`, `display_name`, `school`, `language`) from the sign-up metadata (`use-auth.ts` re-creates a missing profile from metadata). Teacher and student screens are wrapped in `RequireAccount` (redirects to `/?next=…`). Shared screens (desk, class) use anonymous auth without a profile and cannot create lessons. **Admin**: `profiles.role` can be `admin`; users cannot give themselves a role (insert policy allows only teacher/student, trigger `profiles_guard_role` blocks role changes unless the caller is admin or there is no JWT, i.e. SQL/service role). Promote the first admin with SQL: `update profiles set role = 'admin' where id = (select id from auth.users where email = '…')`. Email links use `siteUrl()` (`NEXT_PUBLIC_SITE_URL`, falls back to the page origin). **Demo accounts**: when Supabase cannot send the confirmation email (rate limit), `signUp` falls back to `createDemoAccount` — an anonymous session plus a `profiles` row — which counts as signed in on that device (`create_lesson` allows anonymous JWTs only with a teacher profile). Email confirmation uses a 6-digit code (`verifySignupCode`, needs `{{ .Token }}` in the Supabase "Confirm signup" template) with resend; the link still works. Terms are optional at creation (0–12); `lessons.glossary` (`[{term, explanation}]`) is filled during the lesson. `join_lesson` with role `student` writes the student account name into `lessons.student_name` while it is still the default `Elevul`. RLS on all tables; membership is via `participants`, checked through `security definer` helpers `is_participant` / `participant_role`. Lessons are created with RPC `create_lesson` and joined with RPC `join_lesson(code, role, display_name)` — `lessons` is never directly queryable by non-participants. The teacher may insert messages with any `sender_role` (students only as `student`). `lesson_summaries` is written only server-side with the service-role key (`src/lib/supabase/server.ts`, `server-only`). Route handlers authenticate by `Authorization: Bearer <access_token>`: the summary route via `admin.auth.getUser(token)`, the terms/translate routes via `authenticate()` in `src/lib/supabase/auth-server.ts`, which returns a user-scoped client (anon key + token, RLS applies — no service-role key needed). There is no cookie/SSR auth and no proxy/middleware.

**Realtime** (`src/hooks/use-lesson.ts`): one channel `lesson:{code}` per lesson with `broadcast.self = true` (senders also receive their own events — handlers must be idempotent). Postgres Changes on `messages`, `lesson_summaries`, `lessons`; Broadcast for ephemeral events typed in `BroadcastEvents` (`src/lib/types.ts`); Presence keyed per window (not per user, because one browser can open several screens with the same anonymous user). The desk screen uses channel role `desk` but joins the DB as `class` (`participants.role` has no `desk`). The teacher re-broadcasts the current `semafor` state when a participant joins. Screens subscribe with `on(event)`, `onMessage` (live inserts only, not history) and `onPresenceJoin`.

**Message flow**: student sign → 1.5 s confirm/cancel (`pending_sign`/`pending_cancel`) → `commitSign` (`src/lib/lesson-actions.ts`) inserts a `kind: "sign"` message + `semafor` + optional `teacher_alert` → the teacher device speaks it with `speechSynthesis`. Teacher speech/typing → `teacherSay` → `detectBuzz` (`src/lib/alerts.ts`) → `buzz` vibration on the student. `kind: "system"` messages carry unknown-sign reports (`meta.unknown`) and alert acknowledgements with `meta.latencyMs`; they are rendered differently, never spoken, and excluded from the AI summary. `src/lib/stats.ts` computes lesson statistics and the H1–H3 hypotheses purely from messages.

**Key terms**: the teacher screen calls `POST /api/lessons/[code]/terms` after every 3 new teacher lines (at most every 25 s) or on the refresh button; Claude extracts terms + one-sentence explanations, falling back to `extractTermsLocally` (`src/lib/term-extract.ts`). The route writes `terms` + `glossary` through RLS; screens get it via the `lessons` UPDATE subscription and render `GlossaryPanel`.

**Translation**: `useTranslations(items, lang)` (`src/hooks/use-translations.ts`) batches teacher lines (≤20) to `POST /api/translate` (Claude, then the free MyMemory API) with a per-page cache; pass memoized `items` or the debounce never fires. The original Romanian always shows first. Student language lives in `profiles.language`; the desk keeps its own in `localStorage` (`punte-desk-lang`). Languages are listed in `src/lib/languages.ts`.

**Sign recognition** (student screen, two engines chosen by the student):
- *Model ASL* — `src/lib/asl/`: MediaPipe Holistic frames (543 points) → `SignSegmenter` (sign = hand appears then leaves) → `toWindow` (64 frames × 66 points) → 8-bit TFLite model in `public/models/asl/` run with `@litertjs/core` (WASM from jsDelivr). Below 50% top-1 probability the sign is reported as unknown. `preprocess.ts` is a port of upstream `asl-realtime` and must stay numerically identical to it. Glosses map to Romanian in `glossary.ts`; some carry classroom semantics (semafor state, alert).
- *Dicționarul meu* — static hand shapes via k-NN (`src/lib/knn.ts`, LSR Translator normalization: wrist-relative, scaled by wrist→middle-MCP, RMS distance, match score ≥ 0.45) plus moving signs via DTW over shoulder-normalized trajectories (`src/lib/moving-signs.ts`). Dictionary = `BASE_DICTIONARY` (`src/lib/signs.ts`) + user words. Training data (`SignProfile` v2: `dictionary`, `samples`, `moving`) is stored as JSON in `sign_profiles.samples` with a `localStorage` fallback (`use-sign-profile.ts`).

`src/hooks/use-hand-tracker.ts` owns the camera loop for both `hands` and `holistic` modes, keeps a module-level monotonic MediaPipe timestamp, and computes the framing hints. Hand landmarks are smoothed with a One Euro filter (`src/lib/one-euro.ts`) for drawing and the dictionary k-NN; the Holistic frame given to the ASL model stays raw. MediaPipe is pinned to `@mediapipe/tasks-vision@0.10.14` (WASM fileset shared via `src/lib/vision.ts`, models loaded from CDN at runtime).

**Face privacy** (fail-closed): `use-face-privacy.ts` runs MediaPipe BlazeFace (`loadFastFaceDetector` in `src/lib/face/face-id.ts`) every frame into `FaceTracker` (`src/lib/face/face-tracker.ts`: IoU/centre matching, velocity prediction, 900 ms TTL, growing pad while a face is lost). face-api runs every 600 ms for identity (and as a backup detector) and marks at most one track as the student, with hysteresis; a track that vanished for >300 ms is re-verified. Every non-student track is blurred (downscale + canvas `filter: blur`) on an overlay canvas; until a detector is ready, or if BlazeFace stalls >1.2 s, the whole frame is blurred. The face template lives only in `localStorage` (`punte-face-v1`) — by design it must never be sent to Supabase.

**AI lesson memory**: the summary route calls Claude (`ANTHROPIC_MODEL`, default `claude-sonnet-5-5`) with `messages.parse` + `zodOutputFormat`, falls back to `fallbackSummary` (`src/lib/summary-fallback.ts`) on any failure, upserts `lesson_summaries`, marks the lesson ended and `httpSend`s `summary_ready`. If the route itself fails, the teacher screen builds the fallback summary locally and broadcasts it.

## Conventions

- Visual world: **metro wayfinding** (`PRODUCT.md`, `.impeccable/surfaces/src-app.md`). Red line = teacher (`prof`), blue line = student (`elev`), navy `ink` station band (`StationBand`), condensed Archivo caps via `.plate`, conversations as `RouteStop`s, devices as `LineMap` stations. No eyebrow kickers above headings, no side-border accents.
- shadcn/ui uses the **base-nova** style (Base UI primitives, not Radix) and imports `cn` from the `cn` package; button/input sizes were enlarged to ≥44 px. Native `<select>` is used instead of the shadcn Select.
- Design tokens (`elev`, `prof`, `ink`, `night`, `amber`, status `warn-*`/`danger-*`/`ok-*`, semafor colours `sem-*`) are defined in `src/app/globals.css` — no raw hex in components; every semafor colour is always paired with a text label. Icons come from `lucide-react`, no emoji in the UI.
- Development-only debug hooks: `globalThis.__punteAsl` (ASL classifier) and `window.__punteFace` (face-api loader).
- LiteRT logs INFO lines to stderr; the Next.js dev overlay counts them as "issues" — they are not errors.
- Third-party model credit (ASL Realtime Transformer, CC BY 4.0) must stay visible in the UI (`ASL_CREDIT` in `glossary.ts`) and README.

## Environment

`.env.local` (template in `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` (server-only), `ANTHROPIC_MODEL`. Phones need HTTPS for camera/mic (Vercel deploy or `npx next dev --experimental-https`).
