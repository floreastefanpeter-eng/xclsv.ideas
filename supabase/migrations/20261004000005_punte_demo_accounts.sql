-- Demo: un cont poate funcționa și fără email confirmat (sesiune anonimă + profil).
-- Folosit când serverul de email Supabase atinge limita sau nu poate trimite.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

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
  -- Ecranele partajate (anonime, fără profil) nu pot crea lecții; contul demo de profesor poate.
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
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

revoke all on function public.create_lesson(text, text, text[], text) from public, anon;
grant execute on function public.create_lesson(text, text, text[], text) to authenticated;
