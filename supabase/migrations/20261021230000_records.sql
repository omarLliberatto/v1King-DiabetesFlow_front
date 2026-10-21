create table public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('settings', 'food', 'meal', 'glucose', 'insulin', 'activity')),
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index records_user_updated_at on public.records (user_id, updated_at);

alter table public.records enable row level security;

create policy "records_own_rows" on public.records
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.records_touch_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger records_touch_updated_at
  before insert or update on public.records
  for each row execute function public.records_touch_updated_at();
