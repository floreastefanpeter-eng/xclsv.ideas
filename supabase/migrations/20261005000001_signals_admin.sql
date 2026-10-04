-- SIGNals: rolul de administrator, panoul de administrare și protecția rolurilor.

-- 1) Rolul „admin” în profiluri.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('teacher', 'student', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2) Nimeni nu își poate da singur rolul de admin (nici la creare, nici la actualizare).
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and role in ('teacher', 'student'));

create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rolul îl schimbă doar un admin (sau serverul, fără utilizator: SQL / service role).
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Doar un administrator poate schimba rolul unui cont';
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_guard_role() from public, anon, authenticated;
drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- 3) Funcțiile panoului de administrare: toate verifică întâi rolul.
create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  return json_build_object(
    'teachers', (select count(*) from public.profiles where role = 'teacher'),
    'students', (select count(*) from public.profiles where role = 'student'),
    'admins', (select count(*) from public.profiles where role = 'admin'),
    'lessons_active', (select count(*) from public.lessons where status = 'active'),
    'lessons_ended', (select count(*) from public.lessons where status = 'ended'),
    'messages', (select count(*) from public.messages),
    'signs', (select count(*) from public.messages where kind = 'sign'),
    'feedback', (select count(*) from public.lesson_feedback),
    'avg_rating', (select round(avg(rating)::numeric, 2) from public.lesson_feedback),
    'avg_understood', (select round(avg(understood)::numeric, 2) from public.lesson_feedback)
  );
end;
$$;

create or replace function public.admin_users()
returns table (
  id uuid, email text, role text, display_name text, school text, language text,
  demo boolean, created_at timestamptz, last_sign_in_at timestamptz, lessons bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  return query
    select p.id, u.email::text, p.role, p.display_name, p.school, p.language,
           coalesce(u.is_anonymous, false), p.created_at, u.last_sign_in_at,
           (select count(*) from public.participants pa where pa.user_id = p.id)
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  if p_role not in ('teacher', 'student', 'admin') then raise exception 'Rol invalid'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'Nu îți poți scoate singur rolul de administrator';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user;
end;
$$;

create or replace function public.admin_lessons()
returns table (
  id uuid, code text, subject text, title text, status text, student_name text,
  teacher_name text, created_at timestamptz, ended_at timestamptz, messages bigint, has_summary boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  return query
    select l.id, l.code, l.subject, l.title, l.status, l.student_name,
           coalesce(p.display_name, 'Profesor'),
           l.created_at, l.ended_at,
           (select count(*) from public.messages m where m.lesson_id = l.id),
           exists (select 1 from public.lesson_summaries s where s.lesson_id = l.id)
    from public.lessons l
    left join public.profiles p on p.id = l.teacher_id
    order by l.created_at desc;
end;
$$;

create or replace function public.admin_end_lesson(p_lesson uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  update public.lessons set status = 'ended', ended_at = coalesce(ended_at, now()) where id = p_lesson;
end;
$$;

create or replace function public.admin_delete_lesson(p_lesson uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  delete from public.lessons where id = p_lesson;
end;
$$;

create or replace function public.admin_feedback()
returns table (
  lesson_title text, lesson_code text, role text, display_name text,
  rating int, understood int, comment text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  return query
    select l.title, l.code, f.role, coalesce(p.display_name, '—'), f.rating, f.understood, f.comment, f.created_at
    from public.lesson_feedback f
    join public.lessons l on l.id = f.lesson_id
    left join public.profiles p on p.id = f.user_id
    order by f.created_at desc;
end;
$$;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_users() from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
revoke all on function public.admin_lessons() from public, anon;
revoke all on function public.admin_end_lesson(uuid) from public, anon;
revoke all on function public.admin_delete_lesson(uuid) from public, anon;
revoke all on function public.admin_feedback() from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_lessons() to authenticated;
grant execute on function public.admin_end_lesson(uuid) to authenticated;
grant execute on function public.admin_delete_lesson(uuid) to authenticated;
grant execute on function public.admin_feedback() to authenticated;
