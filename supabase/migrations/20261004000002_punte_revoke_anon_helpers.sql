-- Funcțiile ajutătoare RLS nu trebuie apelate de rolul anon
revoke all on function public.is_participant(uuid) from public, anon;
revoke all on function public.participant_role(uuid) from public, anon;
grant execute on function public.is_participant(uuid) to authenticated;
grant execute on function public.participant_role(uuid) to authenticated;
