-- Supabase SQL Editor で実行（自分専用の1アカウントを利用）
create table if not exists public.yubaroku_store (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision >= 1),
  data jsonb not null default '{"version":1,"horses":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.yubaroku_store enable row level security;
revoke all on public.yubaroku_store from anon;
grant select, insert, update on public.yubaroku_store to authenticated;
create policy "read own horse data" on public.yubaroku_store for select to authenticated using ((select auth.uid()) = owner_id);
create policy "insert own horse data" on public.yubaroku_store for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "update own horse data" on public.yubaroku_store for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create or replace function public.yubaroku_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now();return new;end $$;
create trigger yubaroku_set_updated_at before update on public.yubaroku_store for each row execute function public.yubaroku_touch_updated_at();