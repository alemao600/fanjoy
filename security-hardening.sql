-- Fanjoy security hardening
-- Run this once in Supabase SQL Editor to block direct catalog writes from customer sessions.

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.product_categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create table if not exists public.admin_credentials (
  key text primary key,
  username text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_credentials enable row level security;
drop policy if exists "admin_credentials_service_write" on public.admin_credentials;
create policy "admin_credentials_service_write" on public.admin_credentials
for all to service_role using (true) with check (true);

delete from public.products
where name = '__fanjoy_admin_credentials__';

drop policy if exists "products_auth_write" on public.products;
drop policy if exists "products_service_write" on public.products;
create policy "products_service_write" on public.products
for all to service_role using (true) with check (true);

drop policy if exists "categories_auth_write" on public.categories;
drop policy if exists "categories_service_write" on public.categories;
create policy "categories_service_write" on public.categories
for all to service_role using (true) with check (true);

drop policy if exists "product_categories_auth_write" on public.product_categories;
drop policy if exists "product_categories_service_write" on public.product_categories;
create policy "product_categories_service_write" on public.product_categories
for all to service_role using (true) with check (true);

-- Customers may read their own orders, but order creation/status updates must go through server APIs.
-- This prevents a logged-in customer from marking an order as paid/cancelled directly with the public key.
drop policy if exists "orders_owner_all" on public.orders;
drop policy if exists "orders_owner_select" on public.orders;
drop policy if exists "orders_service_write" on public.orders;
create policy "orders_owner_select" on public.orders
for select to authenticated
using (customer_id in (select id from public.customers where user_id = auth.uid()));
create policy "orders_service_write" on public.orders
for all to service_role using (true) with check (true);

drop policy if exists "order_items_owner_all" on public.order_items;
drop policy if exists "order_items_owner_select" on public.order_items;
drop policy if exists "order_items_service_write" on public.order_items;
create policy "order_items_owner_select" on public.order_items
for select to authenticated
using (order_id in (
  select o.id from public.orders o
  join public.customers c on c.id = o.customer_id
  where c.user_id = auth.uid()
));
create policy "order_items_service_write" on public.order_items
for all to service_role using (true) with check (true);
