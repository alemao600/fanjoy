-- Fanjoy security hardening
-- Run this once in Supabase SQL Editor to block direct catalog writes from customer sessions.

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.product_categories enable row level security;

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
