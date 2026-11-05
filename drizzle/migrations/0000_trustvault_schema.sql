create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin','owner','viewer');
create type public.permission_level as enum ('read','edit');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_active from public.profiles where id = _user_id), false)
$$;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null check (char_length(name) between 1 and 255),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default 'General' check (char_length(category) <= 64),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.documents(owner_id);
grant select on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;

create table public.document_permissions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null,
  level public.permission_level not null,
  granted_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, user_id)
);
create index on public.document_permissions(user_id);
grant select on public.document_permissions to authenticated;
grant all on public.document_permissions to service_role;
alter table public.document_permissions enable row level security;

create or replace function public.doc_access_level(_doc uuid, _user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when not public.is_active_user(_user) then null
    when exists (select 1 from public.documents d where d.id = _doc and d.owner_id = _user) then 'owner'
    else (select p.level::text from public.document_permissions p where p.document_id = _doc and p.user_id = _user)
  end
$$;

create table public.audit_logs (
  seq bigserial primary key,
  id uuid not null default gen_random_uuid() unique,
  actor_id uuid,
  actor_email text,
  action text not null,
  outcome text not null default 'success' check (outcome in ('success','denied','failure')),
  document_id uuid,
  target_user_id uuid,
  request_id text,
  ip text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  prev_hash text,
  hash text
);
create index on public.audit_logs(actor_id);
create index on public.audit_logs(document_id);
create index on public.audit_logs(created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create or replace function public.audit_chain()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare _prev text;
begin
  perform pg_advisory_xact_lock(424242);
  select hash into _prev from public.audit_logs order by seq desc limit 1;
  new.created_at := now();
  new.prev_hash := coalesce(_prev, 'GENESIS');
  new.hash := encode(extensions.digest(
    new.prev_hash || '|' || new.id::text || '|' || coalesce(new.actor_id::text,'') || '|' || new.action || '|' ||
    new.outcome || '|' || coalesce(new.document_id::text,'') || '|' || coalesce(new.target_user_id::text,'') || '|' ||
    new.details::text || '|' || to_char(new.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'), 'sha256'), 'hex');
  return new;
end $$;
create trigger audit_chain_bi before insert on public.audit_logs for each row execute function public.audit_chain();

create or replace function public.audit_immutable()
returns trigger language plpgsql as $$
begin raise exception 'audit_logs is append-only'; end $$;
create trigger audit_no_update before update or delete on public.audit_logs for each row execute function public.audit_immutable();
create trigger audit_no_truncate before truncate on public.audit_logs for each statement execute function public.audit_immutable();

create or replace function public.verify_audit_chain()
returns table(total bigint, broken_at bigint) language plpgsql stable security definer set search_path = public, extensions as $$
declare r record; _prev text := 'GENESIS'; _n bigint := 0; _h text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  for r in select * from public.audit_logs order by seq loop
    _n := _n + 1;
    _h := encode(extensions.digest(
      _prev || '|' || r.id::text || '|' || coalesce(r.actor_id::text,'') || '|' || r.action || '|' ||
      r.outcome || '|' || coalesce(r.document_id::text,'') || '|' || coalesce(r.target_user_id::text,'') || '|' ||
      r.details::text || '|' || to_char(r.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US'), 'sha256'), 'hex');
    if r.prev_hash is distinct from _prev or r.hash is distinct from _h then
      total := _n; broken_at := r.seq; return next; return;
    end if;
    _prev := r.hash;
  end loop;
  total := _n; broken_at := null; return next;
end $$;

-- Policies
create policy "profiles readable by active users" on public.profiles for select to authenticated
  using (public.is_active_user(auth.uid()));
create policy "update own name" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "docs visible to grantees or admin metadata" on public.documents for select to authenticated
  using (public.doc_access_level(id, auth.uid()) is not null
         or (public.has_role(auth.uid(),'admin') and public.is_active_user(auth.uid())));

create policy "perms visible to doc owner, grantee, admin" on public.document_permissions for select to authenticated
  using (user_id = auth.uid()
         or public.doc_access_level(document_id, auth.uid()) = 'owner'
         or public.has_role(auth.uid(),'admin'));

create policy "audit: admins all, users own" on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'admin') or actor_id = auth.uid());

-- profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- storage: uploads only into own folder by owners; no client reads
create policy "owners upload into own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
              and public.has_role(auth.uid(),'owner') and public.is_active_user(auth.uid()));