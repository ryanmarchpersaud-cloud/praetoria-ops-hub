create or replace function public.comms_verify_scheduler_secret(_candidate text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret text;
begin
  if _candidate is null or length(_candidate) = 0 then
    return false;
  end if;
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'comms_scheduler_secret'
  limit 1;
  if v_secret is null then
    return false;
  end if;
  return encode(extensions.digest(_candidate, 'sha256'), 'hex')
       = encode(extensions.digest(v_secret, 'sha256'), 'hex');
end;
$$;

revoke all on function public.comms_verify_scheduler_secret(text) from public, anon, authenticated;
grant execute on function public.comms_verify_scheduler_secret(text) to service_role;