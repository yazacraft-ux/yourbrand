-- ============================================================
-- YOURBRAND — Supabase Setup
-- À coller dans SQL Editor → New query → Run
-- ============================================================

-- ── 1. PROFILES (infos utilisateur, lié à auth.users) ──
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'membre' check (role in ('membre', 'admin')),
  status text default 'active' check (status in ('active', 'blocked')),
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Un utilisateur peut voir/modifier seulement son propre profil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-création du profil à l'inscription
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. PACKS (tes offres, modifiables depuis l'admin) ──
create table public.packs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  badge text,
  description text,
  features jsonb default '[]'::jsonb,
  status text default 'active' check (status in ('active', 'draft')),
  created_at timestamp with time zone default now()
);

alter table public.packs enable row level security;

create policy "Anyone can view active packs"
  on public.packs for select
  using (status = 'active');


-- ── 3. ORDERS (commandes) ──
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  pack_id uuid references public.packs(id),
  email text not null,
  full_name text not null,
  amount numeric not null,
  coupon_code text,
  order_bump boolean default false,
  status text default 'pending' check (status in ('pending', 'paid', 'refunded')),
  stripe_payment_id text,
  created_at timestamp with time zone default now()
);

alter table public.orders enable row level security;

-- Un membre voit seulement ses commandes
create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Un admin voit tout (à affiner avec une fonction is_admin si besoin)
create policy "Admins can view all orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ── 4. MESSAGES (messagerie interne) ──
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null,
  user_id uuid references public.profiles(id),
  sender text not null check (sender in ('membre', 'admin')),
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create policy "Users can view own conversation messages"
  on public.messages for select
  using (auth.uid() = user_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = user_id or sender = 'admin');

create policy "Admins can view all messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ── 5. COUPONS (codes promo) ──
create table public.coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  value numeric not null,
  type text default 'percent' check (type in ('percent', 'fixed')),
  uses integer default 0,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default now()
);

alter table public.coupons enable row level security;

create policy "Anyone can view active coupons"
  on public.coupons for select
  using (status = 'active');


-- ── 6. SITE SETTINGS (tous tes textes admin, en JSON) ──
create table public.site_settings (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

alter table public.site_settings enable row level security;

create policy "Anyone can view settings"
  on public.site_settings for select
  using (true);

-- Insère une ligne par défaut
insert into public.site_settings (id, data) values ('main', '{}'::jsonb);


-- ============================================================
-- FIN — Tes tables sont prêtes !
-- Vérifie dans Table Editor (menu gauche) que tout est créé.
-- ============================================================
