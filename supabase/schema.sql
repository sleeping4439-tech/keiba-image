-- Supabase SQL Editorで実行する。実行前に自分のGoogleログインのUIDを設定すること。
-- 認証ユーザーのうち、指定した1人だけが履歴を読み書きできる。
create table if not exists public.track_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  race_date date not null,
  track text not null check (track in ('東京','京都')),
  jra_data jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id,race_date,track)
);
alter table public.track_records enable row level security;
revoke all on public.track_records from anon;
grant select,insert,update,delete on public.track_records to authenticated;
-- 'YOUR_USER_UUID'をSupabase Authentication > Usersで確認したUIDに置き換える。
create policy "owner can read" on public.track_records for select to authenticated using (auth.uid() = user_id and auth.uid() = 'YOUR_USER_UUID'::uuid);
create policy "owner can insert" on public.track_records for insert to authenticated with check (auth.uid() = user_id and auth.uid() = 'YOUR_USER_UUID'::uuid);
create policy "owner can update" on public.track_records for update to authenticated using (auth.uid() = user_id and auth.uid() = 'YOUR_USER_UUID'::uuid) with check (auth.uid() = user_id and auth.uid() = 'YOUR_USER_UUID'::uuid);
create policy "owner can delete" on public.track_records for delete to authenticated using (auth.uid() = user_id and auth.uid() = 'YOUR_USER_UUID'::uuid);
