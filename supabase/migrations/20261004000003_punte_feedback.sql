-- Feedback la finalul lecției (elev și profesor): dovezi pentru validare.
create table if not exists public.lesson_feedback (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student', 'class')),
  rating int not null check (rating between 1 and 5),
  understood int check (understood between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  primary key (lesson_id, user_id, role)
);

alter table public.lesson_feedback enable row level security;

-- Fiecare participant își trimite propriul feedback.
create policy lesson_feedback_insert on public.lesson_feedback
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_participant(lesson_id));

create policy lesson_feedback_update on public.lesson_feedback
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Fiecare își vede feedback-ul; profesorul lecției le vede pe toate.
create policy lesson_feedback_select on public.lesson_feedback
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = auth.uid())
  );
