-- Fanjoy schema (Supabase)
create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null,
  last_name text,
  email text not null,
  phone text,
  cpf text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  images text[] not null default '{}',
  tag text,
  button_text text default 'Comprar',
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_number text not null unique,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  shipping_address jsonb not null default '{}'::jsonb,
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  tracking_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null,
  price numeric(10,2) not null
);

alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.product_categories enable row level security;

create policy if not exists "customers_select_own" on public.customers
for select to authenticated using (auth.uid() = user_id);

create policy if not exists "customers_update_own" on public.customers
for update to authenticated using (auth.uid() = user_id);

create policy if not exists "customers_insert_own" on public.customers
for insert to authenticated with check (auth.uid() = user_id);

create policy if not exists "addresses_owner_all" on public.customer_addresses
for all to authenticated
using (customer_id in (select id from public.customers where user_id = auth.uid()))
with check (customer_id in (select id from public.customers where user_id = auth.uid()));

create policy if not exists "orders_owner_all" on public.orders
for all to authenticated
using (customer_id in (select id from public.customers where user_id = auth.uid()))
with check (customer_id in (select id from public.customers where user_id = auth.uid()));

create policy if not exists "order_items_owner_all" on public.order_items
for all to authenticated
using (order_id in (
  select o.id from public.orders o
  join public.customers c on c.id = o.customer_id
  where c.user_id = auth.uid()
))
with check (order_id in (
  select o.id from public.orders o
  join public.customers c on c.id = o.customer_id
  where c.user_id = auth.uid()
));

create policy if not exists "products_public_read" on public.products
for select to anon, authenticated using (is_active = true);

create policy if not exists "categories_public_read" on public.categories
for select to anon, authenticated using (true);

create policy if not exists "product_categories_public_read" on public.product_categories
for select to anon, authenticated using (true);
