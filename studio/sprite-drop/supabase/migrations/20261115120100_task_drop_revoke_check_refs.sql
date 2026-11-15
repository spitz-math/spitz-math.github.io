-- studio_check_refs is only an internal helper for the two write functions.
revoke execute on function public.studio_check_refs(jsonb) from authenticated;
