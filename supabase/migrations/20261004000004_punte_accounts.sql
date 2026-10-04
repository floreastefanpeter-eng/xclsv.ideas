-- Conturi (profesor / elev), termeni-cheie opționali (extrași de AI) și glosarul lecției.

-- ---------------------------------------------------------------
-- Profiluri
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  display_name text not null check (char_length(display_name) between 1 and 80),
  school text check (char_length(school) <= 120),
  -- Limba în care elevul vrea subtitrările traduse ('ro' = fără traducere).
  language text not null default 'ro' check (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profilul se creează automat la înregistrare, din metadatele trimise de formular.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := meta ->> 'role';
begin
  if new.is_anonymous or r not in ('teacher', 'student') then
    return new;
  end if;
  insert into public.profiles (id, role, display_name, school)
  values (
    new.id,
    r,
    coalesce(nullif(trim(meta ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(meta ->> 'school'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Glosarul lecției: termeni + explicații simple (completat de AI în timpul lecției)
-- ---------------------------------------------------------------
alter table public.lessons add column if not exists glossary jsonb not null default '[]'::jsonb;

-- create_lesson: termenii devin opționali (0–12); doar conturile reale pot crea lecții.
drop function if exists public.create_lesson(text, text, text[], text);
create or replace function public.create_lesson(
  p_subject text,
  p_title text,
  p_terms text[] default '{}',
  p_student_name text default null
)
returns public.lessons
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  new_lesson public.lessons;
  terms text[] := coalesce(p_terms, '{}');
begin
  if auth.uid() is null then
    raise exception 'Autentificare necesară';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Intră în contul de profesor ca să creezi o lecție';
  end if;
  if coalesce(array_length(terms, 1), 0) > 12 then
    raise exception 'O lecție poate avea cel mult 12 termeni';
  end if;
  if char_length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'Lecția are nevoie de un titlu';
  end if;

  insert into public.lessons (code, subject, title, terms, student_name, teacher_id)
  values (
    public.generate_lesson_code(),
    trim(p_subject),
    trim(p_title),
    terms,
    coalesce(nullif(trim(p_student_name), ''), 'Elevul'),
    auth.uid()
  )
  returning * into new_lesson;

  insert into public.participants (lesson_id, user_id, role, display_name)
  values (
    new_lesson.id,
    auth.uid(),
    'teacher',
    coalesce((select display_name from public.profiles where id = auth.uid()), 'Profesor')
  );

  return new_lesson;
end;
$$;

-- join_lesson: elevul cu cont își pune numele pe lecție (profesorul nu mai trebuie să-l scrie).
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
  student_label text;
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

  if existing_role = 'teacher' then
    return found;
  end if;

  insert into public.participants (lesson_id, user_id, role, display_name)
  values (found.id, auth.uid(), p_role, nullif(trim(coalesce(p_display_name, '')), ''))
  on conflict (lesson_id, user_id)
  do update set role = excluded.role,
                display_name = coalesce(excluded.display_name, public.participants.display_name);

  if p_role = 'student' and found.status = 'active' then
    student_label := coalesce(
      (select display_name from public.profiles where id = auth.uid() and role = 'student'),
      nullif(trim(coalesce(p_display_name, '')), '')
    );
    if student_label is not null and found.student_name = 'Elevul' then
      update public.lessons set student_name = student_label where id = found.id
      returning * into found;
    end if;
  end if;

  return found;
end;
$$;

revoke all on function public.create_lesson(text, text, text[], text) from public, anon;
revoke all on function public.join_lesson(text, text, text) from public, anon;
grant execute on function public.create_lesson(text, text, text[], text) to authenticated;
grant execute on function public.join_lesson(text, text, text) to authenticated;
