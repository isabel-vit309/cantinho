-- Execute no SQL Editor do Supabase. Cartas e respostas não devem usar URLs públicas.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (display_name in ('Isabel', 'Bia')),
  first_access_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  content text not null check (char_length(content) between 1 and 50000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  scheduled_open_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (author_id <> recipient_id),
  check ((status = 'draft' and published_at is null) or (status = 'published' and published_at is not null))
);
create index letters_recipient_published on public.letters(recipient_id, published_at desc) where status = 'published';
create index letters_author on public.letters(author_id, updated_at desc);

-- Contains only enough metadata to show a locked envelope to its recipient.
create table public.future_letter_envelopes (
  letter_id uuid primary key references public.letters(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_open_at timestamptz not null
);
create index future_envelopes_recipient on public.future_letter_envelopes(recipient_id, scheduled_open_at);

create table public.letter_reads (
  letter_id uuid not null references public.letters(id) on delete cascade,
  reader_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (letter_id, reader_id)
);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);
create index replies_letter on public.replies(letter_id, created_at);

-- Access is limited to the two pre-provisioned profile rows. Never expose a public signup flow.
create or replace function public.is_pair_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()))
$$;
revoke all on function public.is_pair_member() from public;
grant execute on function public.is_pair_member() to authenticated;
grant select on public.profiles, public.letters, public.letter_reads, public.replies to authenticated;
grant select on public.future_letter_envelopes to authenticated;
grant update (first_access_completed_at) on public.profiles to authenticated;
grant insert, update, delete on public.letters to authenticated;
grant insert on public.letter_reads, public.replies to authenticated;

alter table public.profiles enable row level security;
alter table public.letters enable row level security;
alter table public.future_letter_envelopes enable row level security;
alter table public.letter_reads enable row level security;
alter table public.replies enable row level security;

create policy "pair can read profile names" on public.profiles for select to authenticated
  using (public.is_pair_member());
revoke update on public.profiles from authenticated;
grant update (first_access_completed_at) on public.profiles to authenticated;
create policy "profile owner updates own intro state" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Authors may read drafts and published letters; recipients may read published letters only.
create policy "author or recipient reads eligible letters" on public.letters for select to authenticated
  using (public.is_pair_member() and (
    author_id = (select auth.uid()) or
    (recipient_id = (select auth.uid()) and status = 'published' and (scheduled_open_at is null or scheduled_open_at <= now()))
  ));
create policy "author creates own drafts" on public.letters for insert to authenticated
  with check (public.is_pair_member() and author_id = (select auth.uid()) and recipient_id <> (select auth.uid()) and ((status = 'draft' and published_at is null) or (status = 'published' and published_at is not null)));
create policy "author edits own letters" on public.letters for update to authenticated
  using (public.is_pair_member() and author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and recipient_id <> (select auth.uid()));
create policy "author deletes own drafts only" on public.letters for delete to authenticated
  using (author_id = (select auth.uid()) and status = 'draft');

create policy "recipient sees future envelope metadata" on public.future_letter_envelopes for select to authenticated
  using (recipient_id = (select auth.uid()) and public.is_pair_member());

create or replace function public.sync_future_letter_envelope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and new.scheduled_open_at is not null and new.scheduled_open_at > now() then
    insert into public.future_letter_envelopes (letter_id, recipient_id, author_id, scheduled_open_at)
    values (new.id, new.recipient_id, new.author_id, new.scheduled_open_at)
    on conflict (letter_id) do update set
      recipient_id = excluded.recipient_id,
      author_id = excluded.author_id,
      scheduled_open_at = excluded.scheduled_open_at;
  else
    delete from public.future_letter_envelopes where letter_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_future_letter_envelope() from public;
create trigger sync_future_letter_envelope_after_change
  after insert or update of status, recipient_id, scheduled_open_at on public.letters
  for each row execute function public.sync_future_letter_envelope();

-- Only the recipient can mark a published, currently open letter as read.
create policy "recipient reads own read markers" on public.letter_reads for select to authenticated
  using (reader_id = (select auth.uid()));
create policy "recipient marks received letter read" on public.letter_reads for insert to authenticated
  with check (reader_id = (select auth.uid()) and exists (
    select 1 from public.letters l where l.id = letter_id and l.recipient_id = (select auth.uid()) and l.status = 'published' and (l.scheduled_open_at is null or l.scheduled_open_at <= now())
  ));

-- Replies belong to published, unlocked letters and are visible only to the pair on that letter.
create policy "letter participants read replies" on public.replies for select to authenticated
  using (exists (select 1 from public.letters l where l.id = letter_id and l.status = 'published' and (l.scheduled_open_at is null or l.scheduled_open_at <= now()) and (l.author_id = (select auth.uid()) or l.recipient_id = (select auth.uid()))));
create policy "recipient replies to received letter" on public.replies for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_pair_member() and exists (
    select 1 from public.letters l where l.id = letter_id and l.status = 'published' and l.recipient_id = (select auth.uid()) and (l.scheduled_open_at is null or l.scheduled_open_at <= now())
  ));

-- Keep the open site in sync when the other person publishes, replies, or reads.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'letters') then
      execute 'alter publication supabase_realtime add table public.letters';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'replies') then
      execute 'alter publication supabase_realtime add table public.replies';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'letter_reads') then
      execute 'alter publication supabase_realtime add table public.letter_reads';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'future_letter_envelopes') then
      execute 'alter publication supabase_realtime add table public.future_letter_envelopes';
    end if;
  end if;
end $$;

-- Provision the two auth.users records privately in the Supabase dashboard or server-side admin API,
-- then insert matching public.profiles rows. Never put a service-role key in the browser.
