create extension if not exists pgcrypto;

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  sidekick_names text[] not null default '{}' check (cardinality(sidekick_names) <= 12),
  avatar_key text not null check (avatar_key in ('fox', 'owl', 'dragon', 'cat', 'rabbit', 'bear')),
  saga_id text not null check (saga_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.level_progress (
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  saga_id text not null,
  level_id text not null,
  level_number integer not null check (level_number > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_quest_id text,
  current_part_id text,
  current_task_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, saga_id, level_id),
  unique (child_id, saga_id, level_number),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.part_progress (
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  saga_id text not null,
  level_id text not null,
  quest_id text not null,
  part_id text not null,
  task_id text not null,
  response jsonb,
  correct boolean not null default false,
  attempts integer not null default 0 check (attempts >= 0),
  variable_key text,
  variable_value text,
  points integer not null default 0 check (points >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, saga_id, level_id, quest_id, part_id, task_id),
  check ((correct and completed_at is not null) or (not correct and completed_at is null)),
  check ((variable_key is null) = (variable_value is null))
);

create table public.achievements (
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  saga_id text not null,
  achievement_key text not null,
  earned_at timestamptz not null default now(),
  primary key (child_id, saga_id, achievement_key)
);

create table public.guardian_login_state (
  attempt_key text primary key,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create index part_progress_completed_idx
  on public.part_progress(child_id, saga_id, completed_at) where correct;
create index achievements_child_saga_idx on public.achievements(child_id, saga_id);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger child_profiles_updated before update on public.child_profiles
  for each row execute function public.set_updated_at();
create trigger level_progress_updated before update on public.level_progress
  for each row execute function public.set_updated_at();
create trigger part_progress_updated before update on public.part_progress
  for each row execute function public.set_updated_at();

create function public.record_guardian_login(p_attempt_key text, p_success boolean)
returns table(allowed boolean, locked_until timestamptz)
language plpgsql security definer set search_path = public as $$
declare s public.guardian_login_state%rowtype; now_at timestamptz := clock_timestamp();
begin
  delete from public.guardian_login_state
    where updated_at < now_at - interval '1 day';
  insert into public.guardian_login_state(attempt_key)
    values (p_attempt_key) on conflict do nothing;
  select * into s from public.guardian_login_state
    where attempt_key = p_attempt_key for update;
  if s.locked_until is not null and s.locked_until > now_at then
    return query select false, s.locked_until;
    return;
  end if;
  if p_success then
    update public.guardian_login_state set
      failed_attempts = 0, window_started_at = now_at,
      locked_until = null
      where attempt_key = p_attempt_key;
    return query select true, null::timestamptz;
    return;
  end if;
  if s.window_started_at < now_at - interval '15 minutes' then
    s.failed_attempts := 1;
    s.window_started_at := now_at;
  else
    s.failed_attempts := s.failed_attempts + 1;
  end if;
  update public.guardian_login_state set
    failed_attempts = s.failed_attempts,
    window_started_at = s.window_started_at,
    locked_until = case
      when s.failed_attempts >= 5 then now_at + interval '15 minutes'
      else null
    end
    where attempt_key = p_attempt_key;
  return query select false, case
    when s.failed_attempts >= 5 then now_at + interval '15 minutes'
    else null
  end;
end $$;

create function public.record_task_attempt(
  p_child_id uuid, p_saga_id text, p_level_id text, p_quest_id text,
  p_part_id text, p_task_id text, p_response jsonb, p_correct boolean,
  p_variable_key text, p_variable_value text, p_points integer)
returns table(correct boolean, points integer, newly_completed boolean)
language plpgsql security definer set search_path = public as $$
declare result public.part_progress; was_correct boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(
    chr(31), p_child_id::text, p_saga_id, p_level_id, p_quest_id, p_part_id, p_task_id
  ), 0));
  select progress.correct into was_correct
    from public.part_progress progress
    where progress.child_id = p_child_id
      and progress.saga_id = p_saga_id
      and progress.level_id = p_level_id
      and progress.quest_id = p_quest_id
      and progress.part_id = p_part_id
      and progress.task_id = p_task_id;
  insert into public.part_progress
    (child_id,saga_id,level_id,quest_id,part_id,task_id,response,correct,attempts,
     variable_key,variable_value,points,completed_at)
  values
    (p_child_id,p_saga_id,p_level_id,p_quest_id,p_part_id,p_task_id,p_response,
     p_correct,1,p_variable_key,p_variable_value,case when p_correct then p_points else 0 end,
     case when p_correct then now() else null end)
  on conflict (child_id,saga_id,level_id,quest_id,part_id,task_id) do update set
    response=case when part_progress.correct then part_progress.response else excluded.response end,
    correct=part_progress.correct or excluded.correct,
    attempts=case when part_progress.correct then part_progress.attempts else part_progress.attempts + 1 end,
    variable_key=coalesce(part_progress.variable_key,excluded.variable_key),
    variable_value=coalesce(part_progress.variable_value,excluded.variable_value),
    points=greatest(part_progress.points,excluded.points),
    completed_at=coalesce(part_progress.completed_at,excluded.completed_at)
  returning * into result;
  return query select
    result.correct,
    result.points,
    result.correct and not coalesce(was_correct, false);
end $$;

alter table public.child_profiles enable row level security;
alter table public.level_progress enable row level security;
alter table public.part_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.guardian_login_state enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.record_guardian_login(text,boolean) from public, anon, authenticated;
revoke all on function public.record_task_attempt(uuid,text,text,text,text,text,jsonb,boolean,text,text,integer)
  from public, anon, authenticated;
grant all on public.child_profiles, public.level_progress, public.part_progress,
  public.achievements, public.guardian_login_state to service_role;
grant execute on function public.record_guardian_login(text,boolean) to service_role;
grant execute on function public.record_task_attempt(uuid,text,text,text,text,text,jsonb,boolean,text,text,integer) to service_role;
