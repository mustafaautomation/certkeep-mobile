-- Certkeep shared schema for the web app and this mobile client.
-- The mobile app uses the anon key and the signed-in JWT only.
-- Do not put a service-role key in the app. Row Level Security is the boundary.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'trial' check (plan in ('trial', 'pro')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'compliance_manager', 'employee', 'vendor')),
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  title text not null,
  trade text,
  created_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_user_id uuid references auth.users (id) on delete set null,
  name text not null,
  trade text not null,
  contact_name text not null,
  contact_email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  document_type text not null check (document_type in (
    'certificate_of_insurance',
    'general_liability',
    'workers_compensation',
    'auto_liability',
    'professional_license',
    'drivers_license',
    'osha_card',
    'certification'
  )),
  person_id uuid references public.people (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  constraint requirement_subject check (
    (person_id is not null and vendor_id is null)
    or (person_id is null and vendor_id is not null)
  )
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  requirement_id uuid not null references public.requirements (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id),
  file_name text not null,
  mime_type text not null,
  storage_path text,
  document_type text not null,
  document_number text not null,
  issuer text not null,
  holder_name text not null,
  issued_on date,
  expires_on date,
  confidence numeric not null default 1,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  review_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  requirement_id uuid not null references public.requirements (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  window_days integer not null check (window_days in (30, 14, 7)),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (requirement_id, recipient_user_id, window_days)
);

create index if not exists requirements_org_idx on public.requirements (organization_id);
create index if not exists documents_requirement_idx on public.documents (requirement_id, created_at desc);
create index if not exists alerts_recipient_idx on public.alerts (recipient_user_id, organization_id);

alter table public.organizations enable row level security;
alter table public.members enable row level security;
alter table public.people enable row level security;
alter table public.vendors enable row level security;
alter table public.requirements enable row level security;
alter table public.documents enable row level security;
alter table public.alerts enable row level security;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_manager(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where organization_id = org
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'compliance_manager')
  );
$$;

create or replace function public.can_read_requirement(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requirements r
    join public.members m on m.organization_id = r.organization_id
    where r.id = target
      and m.user_id = auth.uid()
      and (
        m.role in ('owner', 'admin', 'compliance_manager')
        or exists (
          select 1 from public.people p
          where p.id = r.person_id and p.member_user_id = auth.uid()
        )
        or exists (
          select 1 from public.vendors v
          where v.id = r.vendor_id and v.member_user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_upload_requirement(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_read_requirement(target);
$$;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (public.is_org_member(id));

drop policy if exists members_select on public.members;
create policy members_select on public.members
for select to authenticated
using (user_id = auth.uid() or public.is_org_manager(organization_id));

drop policy if exists people_select on public.people;
create policy people_select on public.people
for select to authenticated
using (
  public.is_org_manager(organization_id)
  or member_user_id = auth.uid()
);

drop policy if exists vendors_select on public.vendors;
create policy vendors_select on public.vendors
for select to authenticated
using (
  public.is_org_manager(organization_id)
  or member_user_id = auth.uid()
);

drop policy if exists requirements_select on public.requirements;
create policy requirements_select on public.requirements
for select to authenticated
using (public.can_read_requirement(id));

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
for select to authenticated
using (public.can_read_requirement(requirement_id));

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and status = 'submitted'
  and public.can_upload_requirement(requirement_id)
);

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
for update to authenticated
using (public.is_org_manager(organization_id))
with check (public.is_org_manager(organization_id));

drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
for select to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists alerts_update on public.alerts;
create policy alerts_update on public.alerts
for update to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

create or replace function public.refresh_requirement_alerts(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.requirements%rowtype;
  doc public.documents%rowtype;
  days integer;
  win integer;
  recipient uuid;
  subject_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_read_requirement(target) then
    raise exception 'not allowed';
  end if;

  select * into req from public.requirements where id = target;
  if req.id is null then
    return;
  end if;

  delete from public.alerts where requirement_id = target;

  select * into doc
  from public.documents
  where requirement_id = target and status <> 'rejected'
  order by created_at desc
  limit 1;

  if doc.id is null or doc.expires_on is null then
    return;
  end if;

  days := doc.expires_on - (timezone('utc', now()))::date;
  if days < 0 then
    return;
  end if;

  subject_name := coalesce(
    (select full_name from public.people where id = req.person_id),
    (select name from public.vendors where id = req.vendor_id),
    'Subject'
  );

  foreach win in array array[30, 14, 7]
  loop
    if days <= win then
      for recipient in
        select user_id from public.members
        where organization_id = req.organization_id
          and role in ('owner', 'admin', 'compliance_manager')
        union
        select member_user_id from public.people
        where id = req.person_id and member_user_id is not null
        union
        select member_user_id from public.vendors
        where id = req.vendor_id and member_user_id is not null
      loop
        insert into public.alerts (
          organization_id, requirement_id, recipient_user_id, window_days, title, body
        ) values (
          req.organization_id,
          req.id,
          recipient,
          win,
          req.name || ' expires in ' || days || ' days',
          subject_name || ' · ' || win || '-day reminder.'
        );
      end loop;
    end if;
  end loop;
end;
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_manager(uuid) from public;
revoke all on function public.can_read_requirement(uuid) from public;
revoke all on function public.can_upload_requirement(uuid) from public;
revoke all on function public.refresh_requirement_alerts(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
grant execute on function public.can_read_requirement(uuid) to authenticated;
grant execute on function public.can_upload_requirement(uuid) to authenticated;
grant execute on function public.refresh_requirement_alerts(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_storage_read on storage.objects;
create policy documents_storage_read on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists documents_storage_insert on storage.objects;
create policy documents_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and public.can_upload_requirement(((storage.foldername(name))[2])::uuid)
);
