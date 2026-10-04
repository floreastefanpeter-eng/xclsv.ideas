-- Punte: schema, RLS, funcții RPC și Realtime

-- ---------------------------------------------------------------
-- Tabele
-- ---------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  subject text not null,
  title text not null,
  terms text[] not null default '{}',
  student_name text not null default 'Elevul',
  teacher_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.participants (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student', 'class')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (lesson_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  sender_role text not null check (sender_role in ('teacher', 'student')),
  sender_name text,
  text text not null check (char_length(text) between 1 and 2000),
  kind text not null check (kind in ('sign', 'speech', 'typed', 'system')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_lesson_created_idx on public.messages (lesson_id, created_at);

create table if not exists public.lesson_summaries (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  notes text[] not null default '{}',
  homework text,
  terms text[] not null default '{}',
  simple_summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sign_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  samples jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Funcții ajutătoare (security definer ca să evităm recursia RLS)
-- ---------------------------------------------------------------
create or replace function public.is_participant(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participants
    where lesson_id = p_lesson_id and user_id = auth.uid()
  );
$$;

create or replace function public.participant_role(p_lesson_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.participants
  where lesson_id = p_lesson_id and user_id = auth.uid();
$$;

-- Cod de 6 caractere fără caractere confundabile (fără 0/O, 1/I/L)
create or replace function public.generate_lesson_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.lessons where code = result);
  end loop;
  return result;
end;
$$;

-- Creează lecția și îl înscrie pe profesor ca participant
create or replace function public.create_lesson(
  p_subject text,
  p_title text,
  p_terms text[],
  p_student_name text
)
returns public.lessons
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  new_lesson public.lessons;
begin
  if auth.uid() is null then
    raise exception 'Autentificare necesară';
  end if;
  if coalesce(array_length(p_terms, 1), 0) < 1 or array_length(p_terms, 1) > 8 then
    raise exception 'Lecția trebuie să aibă între 1 și 8 termeni';
  end if;

  insert into public.lessons (code, subject, title, terms, student_name, teacher_id)
  values (
    public.generate_lesson_code(),
    trim(p_subject),
    trim(p_title),
    p_terms,
    coalesce(nullif(trim(p_student_name), ''), 'Elevul'),
    auth.uid()
  )
  returning * into new_lesson;

  insert into public.participants (lesson_id, user_id, role, display_name)
  values (new_lesson.id, auth.uid(), 'teacher', 'Profesor');

  return new_lesson;
end;
$$;

-- Intrarea într-o lecție pe baza codului (fără a expune tabela lessons)
create or replace function public.join_lesson(
  p_code text,
  p_role text,
  p_display_name text default null
)
returns public.lessons
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  found public.lessons;
  existing_role text;
begin
  if auth.uid() is null then
    raise exception 'Autentificare necesară';
  end if;
  if p_role not in ('teacher', 'student', 'class') then
    raise exception 'Rol invalid';
  end if;

  select * into found from public.lessons where code = upper(trim(p_code));
  if found.id is null then
    raise exception 'Nu există nicio lecție cu acest cod';
  end if;

  if p_role = 'teacher' and found.teacher_id <> auth.uid() then
    raise exception 'Doar profesorul care a creat lecția o poate conduce';
  end if;

  select role into existing_role from public.participants
  where lesson_id = found.id and user_id = auth.uid();

  -- Profesorul își păstrează rolul chiar dacă deschide și alte ecrane
  if existing_role = 'teacher' then
    return found;
  end if;

  insert into public.participants (lesson_id, user_id, role, display_name)
  values (found.id, auth.uid(), p_role, nullif(trim(coalesce(p_display_name, '')), ''))
  on conflict (lesson_id, user_id)
  do update set role = excluded.role,
                display_name = coalesce(excluded.display_name, public.participants.display_name);

  return found;
end;
$$;

revoke all on function public.create_lesson(text, text, text[], text) from public, anon;
revoke all on function public.join_lesson(text, text, text) from public, anon;
revoke all on function public.generate_lesson_code() from public, anon, authenticated;
grant execute on function public.create_lesson(text, text, text[], text) to authenticated;
grant execute on function public.join_lesson(text, text, text) to authenticated;
grant execute on function public.is_participant(uuid) to authenticated;
grant execute on function public.participant_role(uuid) to authenticated;

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.lessons enable row level security;
alter table public.participants enable row level security;
alter table public.messages enable row level security;
alter table public.lesson_summaries enable row level security;
alter table public.sign_profiles enable row level security;

-- lessons: citire doar pentru participanți; modificare doar de profesor.
-- Inserarea se face prin create_lesson().
create policy lessons_select on public.lessons
  for select to authenticated
  using (public.is_participant(id));

create policy lessons_update on public.lessons
  for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- participants: fiecare vede lista participanților din lecțiile lui.
-- Inserarea se face prin join_lesson().
create policy participants_select on public.participants
  for select to authenticated
  using (public.is_participant(lesson_id));

-- messages: citire pentru participanți; scriere pentru profesor (orice rol,
-- necesar pentru modul demo) sau elev (doar ca elev). Ecranul clasei doar citește.
create policy messages_select on public.messages
  for select to authenticated
  using (public.is_participant(lesson_id));

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.participant_role(lesson_id) = 'teacher'
    or (public.participant_role(lesson_id) = 'student' and sender_role = 'student')
  );

-- lesson_summaries: citire pentru participanți; scriere doar cu service role.
create policy lesson_summaries_select on public.lesson_summaries
  for select to authenticated
  using (public.is_participant(lesson_id));

-- sign_profiles: fiecare utilizator doar rândul propriu.
create policy sign_profiles_select on public.sign_profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy sign_profiles_insert on public.sign_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy sign_profiles_update on public.sign_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy sign_profiles_delete on public.sign_profiles
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- Realtime (Postgres Changes)
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.lesson_summaries;
alter publication supabase_realtime add table public.lessons;
