-- Fanjoy schema (Supabase)
-- Idempotent setup for storefront, customers, products and orders.
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
  extra jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists images text[] not null default '{}';
alter table public.products add column if not exists is_active boolean not null default true;

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

drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own" on public.customers
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own" on public.customers
for update to authenticated using (auth.uid() = user_id);

drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own" on public.customers
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "addresses_owner_all" on public.customer_addresses;
create policy "addresses_owner_all" on public.customer_addresses
for all to authenticated
using (customer_id in (select id from public.customers where user_id = auth.uid()))
with check (customer_id in (select id from public.customers where user_id = auth.uid()));

drop policy if exists "orders_owner_all" on public.orders;
create policy "orders_owner_all" on public.orders
for all to authenticated
using (customer_id in (select id from public.customers where user_id = auth.uid()))
with check (customer_id in (select id from public.customers where user_id = auth.uid()));

drop policy if exists "order_items_owner_all" on public.order_items;
create policy "order_items_owner_all" on public.order_items
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

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
for select to anon, authenticated using (is_active = true);

drop policy if exists "products_auth_write" on public.products;
create policy "products_auth_write" on public.products
for all to authenticated using (true) with check (true);

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
for select to anon, authenticated using (true);

drop policy if exists "categories_auth_write" on public.categories;
create policy "categories_auth_write" on public.categories
for all to authenticated using (true) with check (true);

drop policy if exists "product_categories_public_read" on public.product_categories;
create policy "product_categories_public_read" on public.product_categories
for select to anon, authenticated using (true);

drop policy if exists "product_categories_auth_write" on public.product_categories;
create policy "product_categories_auth_write" on public.product_categories
for all to authenticated using (true) with check (true);

insert into public.categories (name, slug)
values ('Camiseta', 'camiseta')
on conflict (slug) do update set name = excluded.name;

with wanted as (
  select
    'Camiseta BTS'::text as name,
    'Camiseta fanmade com estampa BTS. Modelagem confortável e tecido premium.'::text as description,
    69.90::numeric(10,2) as price,
    '/assets/products/camiseta-bts/camiseta.png'::text as image_url,
    array[
      '/assets/products/camiseta-bts/camiseta.png',
      '/assets/products/camiseta-bts/camisetamodelofrente.png',
      '/assets/products/camiseta-bts/camisetamodelocostas.png',
      '/assets/products/camiseta-bts/tamanhos.png'
    ]::text[] as images,
    'Destaque'::text as tag,
    'Comprar'::text as button_text,
    20::integer as stock,
    '{"variant":{"enabled":true,"attributeName":"Tamanho","options":[{"value":"P","stock":5,"image":""},{"value":"M","stock":5,"image":""},{"value":"G","stock":5,"image":""},{"value":"GG","stock":5,"image":""}]},"observations":{"observationsEnabled":true,"observationsText":"Observações Importantes: devido a costura ser realizada com maquinário numa linha de produção, há um processo manual em que os tamanhos podem oscilar entre 1cm (um centímetro) e 2cm (dois centímetros) para mais ou para menos, por isso, recomendamos que solicite sempre um tamanho maior."}}'::jsonb as extra
), updated as (
  update public.products p
  set description = w.description,
      price = w.price,
      image_url = w.image_url,
      images = w.images,
      tag = w.tag,
      button_text = w.button_text,
      stock = w.stock,
      extra = w.extra,
      is_active = true,
      updated_at = now()
  from wanted w
  where lower(p.name) = lower(w.name)
  returning p.id
), inserted as (
  insert into public.products (name, description, price, image_url, images, tag, button_text, stock, extra, is_active)
  select name, description, price, image_url, images, tag, button_text, stock, extra, true
  from wanted
  where not exists (select 1 from updated)
  returning id
), product_id as (
  select id from updated
  union all
  select id from inserted
), category_id as (
  select id from public.categories where slug = 'camiseta'
)
insert into public.product_categories (product_id, category_id)
select product_id.id, category_id.id from product_id, category_id
on conflict do nothing;
