-- Testimoniale reale: din feedback-ul de la finalul lecției, doar cu acordul autorului.
alter table public.lesson_feedback add column if not exists quote text check (char_length(quote) <= 400);
alter table public.lesson_feedback add column if not exists public_quote boolean not null default false;

-- Pagina publică /testimoniale: doar textul, prenumele, rolul și școala; nimic despre lecție.
create or replace function public.public_testimonials()
returns table (quote text, author text, role text, school text, rating int, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select f.quote,
         coalesce(split_part(nullif(trim(p.display_name), ''), ' ', 1), 'Anonim'),
         f.role,
         p.school,
         f.rating,
         f.created_at
  from public.lesson_feedback f
  left join public.profiles p on p.id = f.user_id
  where f.public_quote and nullif(trim(f.quote), '') is not null
  order by f.created_at desc
  limit 60;
$$;

revoke all on function public.public_testimonials() from public;
grant execute on function public.public_testimonials() to anon, authenticated;

-- Administratorul vede și testimonialul în panoul de feedback.
drop function if exists public.admin_feedback();
create or replace function public.admin_feedback()
returns table (
  lesson_title text, lesson_code text, role text, display_name text,
  rating int, understood int, comment text, quote text, public_quote boolean, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Doar pentru administratori'; end if;
  return query
    select l.title, l.code, f.role, coalesce(p.display_name, '—'), f.rating, f.understood, f.comment,
           f.quote, f.public_quote, f.created_at
    from public.lesson_feedback f
    join public.lessons l on l.id = f.lesson_id
    left join public.profiles p on p.id = f.user_id
    order by f.created_at desc;
end;
$$;
revoke all on function public.admin_feedback() from public, anon;
grant execute on function public.admin_feedback() to authenticated;
