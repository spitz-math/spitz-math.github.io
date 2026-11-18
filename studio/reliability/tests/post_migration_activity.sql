do $$ declare tid uuid; r jsonb; begin
  perform t.as_app('claude');
  r := public.studio_create_task('claude-pm-1', 'arcade', 'pm', 'b', 'claude_thread', '[]', 'claude_thread'); tid := (r -> 'task' ->> 'id')::uuid;
  r := public.studio_post_message(tid, 'claude-pm-2', 'note', 'to chat', '[]', null, 'chatgpt_chat', t.ver(tid), 'claude_thread');
end $$;
