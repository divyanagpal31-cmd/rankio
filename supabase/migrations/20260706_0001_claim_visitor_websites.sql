create or replace function public.claim_visitor_websites(visitor_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer := 0;
begin
  update public.websites
  set user_id = auth.uid(),
      visitor_id = null
  where public.websites.visitor_id = claim_visitor_websites.visitor_id
    and public.websites.user_id is null;

  get diagnostics claimed_count = row_count;
  return coalesce(claimed_count, 0);
end;
$$;

grant execute on function public.claim_visitor_websites(uuid) to authenticated;
