-- =====================================================================
-- EletroPoint — esquema da base de dados (Supabase / Postgres)
-- Corra este ficheiro PRIMEIRO no SQL Editor do Supabase, depois seed.sql
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tabelas do catálogo
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  image_url text,
  position int default 0,
  active boolean default true
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_svg text default '',
  position int default 0
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  short_description text default '',
  description text default '',
  base_price numeric(10,2) not null default 0 check (base_price >= 0),
  compare_at_price numeric(10,2),
  stock int not null default 0,
  featured boolean default false,
  active boolean default true,
  specs jsonb not null default '[]'::jsonb,   -- [{group,label,value}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.products add column if not exists model_group text default '';  -- família de modelos (ex.: iphone-17-pro)
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_brand_idx on public.products(brand_id);

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  hex text not null default '#cccccc',
  position int default 0
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,              -- ex.: "256 GB", "16GB / 1TB"
  price numeric(10,2) not null check (price >= 0),
  stock int not null default 0,
  sku text,
  position int default 0
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text default '',
  color_id uuid references public.product_colors(id) on delete set null,
  position int default 0
);

create table if not exists public.slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link text default '',
  price_label text default '',
  bg_color text default '#000000',
  text_color text default '#ffffff',
  position int default 0,
  active boolean default true
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  image_url text not null,
  alt text default '',
  unique (category_id, brand_id)
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------
-- Encomendas e administradores
-- ---------------------------------------------------------------------
-- Compradores: um registo por email, atualizado a cada compra
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default '',
  phone text default '',
  nif text default '',
  address text default '',
  postal_code text default '',
  city text default '',
  country text default 'Portugal',
  user_id uuid references auth.users(id) on delete set null,
  orders_count int not null default 0,
  total_spent numeric(12,2) not null default 0,
  first_order_at timestamptz default now(),
  last_order_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigserial unique,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  customer jsonb not null,          -- nome, telefone, morada...
  items jsonb not null,             -- linhas calculadas no servidor
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text not null,
  status text not null default 'pendente'
    check (status in ('pendente','pago','enviado','entregue','cancelado')),
  notes text default ''
);
alter table public.orders add column if not exists customer_id uuid references public.customers(id) on delete set null;
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- Linhas de cada encomenda (cópia do nome/preço no momento da compra)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid,
  color_id uuid,
  product_name text not null,
  variant_label text,
  color_name text,
  qty int not null check (qty > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.admins (
  email text primary key,
  role text not null default 'editor' check (role in ('owner','editor')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt()->>'email',''))
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt()->>'email','')) and role = 'owner'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

-- Emails dos admins guardados sempre em minúsculas
create or replace function public.lower_admin_email()
returns trigger language plpgsql as $$
begin new.email = lower(trim(new.email)); return new; end; $$;

drop trigger if exists admins_lower on public.admins;
create trigger admins_lower before insert or update on public.admins
  for each row execute function public.lower_admin_email();

-- ---------------------------------------------------------------------
-- Criar encomenda: preços e stock calculados NO SERVIDOR
-- items:    [{ "product_id": uuid, "variant_id": uuid|null, "color_id": uuid|null, "qty": int }]
-- customer: { name, email, phone, address, city, postal_code, country, nif, payment_method, notes }
-- ---------------------------------------------------------------------
create or replace function public.place_order(items jsonb, customer jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  p public.products%rowtype;
  v public.product_variants%rowtype;
  c public.product_colors%rowtype;
  q int;
  unit numeric(10,2);
  lines jsonb := '[]'::jsonb;
  sub numeric(10,2) := 0;
  ship numeric(10,2);
  cfg jsonb;
  pay text := coalesce(customer->>'payment_method','');
  mail text := lower(trim(coalesce(customer->>'email','')));
  new_id uuid;
  new_num bigint;
  cust_id uuid;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'O carrinho está vazio';
  end if;
  if jsonb_array_length(items) > 50 then raise exception 'Demasiados artigos'; end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email inválido'; end if;
  if coalesce(trim(customer->>'name'),'') = '' or coalesce(trim(customer->>'address'),'') = '' then
    raise exception 'Nome e morada são obrigatórios';
  end if;
  if pay not in ('mbway','multibanco','transferencia','entrega') then
    raise exception 'Método de pagamento inválido';
  end if;

  for it in select * from jsonb_array_elements(items) loop
    q := greatest(1, least(20, coalesce((it->>'qty')::int, 1)));
    select * into p from public.products where id = (it->>'product_id')::uuid and active for update;
    if not found then raise exception 'Produto indisponível'; end if;

    unit := p.base_price;
    v := null;
    if nullif(it->>'variant_id','') is not null then
      select * into v from public.product_variants
        where id = (it->>'variant_id')::uuid and product_id = p.id for update;
      if not found then raise exception 'Versão inválida para %', p.name; end if;
      if v.stock < q then raise exception 'Stock insuficiente para % (%)', p.name, v.label; end if;
      unit := v.price;
      update public.product_variants set stock = stock - q where id = v.id;
    else
      if p.stock < q then raise exception 'Stock insuficiente para %', p.name; end if;
      update public.products set stock = stock - q where id = p.id;
    end if;

    c := null;
    if nullif(it->>'color_id','') is not null then
      select * into c from public.product_colors
        where id = (it->>'color_id')::uuid and product_id = p.id;
    end if;

    lines := lines || jsonb_build_object(
      'product_id', p.id, 'slug', p.slug, 'name', p.name,
      'variant_id', v.id, 'variant', v.label,
      'color_id', c.id, 'color', c.name,
      'qty', q, 'unit_price', unit, 'line_total', unit * q);
    sub := sub + unit * q;
  end loop;

  select value into cfg from public.settings where key = 'store';
  ship := coalesce((cfg->>'shipping_cost')::numeric, 4.99);
  if sub >= coalesce((cfg->>'free_shipping_over')::numeric, 50) then ship := 0; end if;

  -- guarda/atualiza os dados do comprador
  insert into public.customers as cu(email, name, phone, nif, address, postal_code, city, country, user_id,
                                     orders_count, total_spent, first_order_at, last_order_at)
  values (mail,
          left(trim(customer->>'name'), 120),
          left(coalesce(customer->>'phone',''), 30),
          left(coalesce(customer->>'nif',''), 20),
          left(trim(customer->>'address'), 250),
          left(coalesce(customer->>'postal_code',''), 12),
          left(coalesce(customer->>'city',''), 80),
          left(coalesce(nullif(customer->>'country',''),'Portugal'), 60),
          auth.uid(), 1, sub + ship, now(), now())
  on conflict (email) do update set
    name = excluded.name, phone = excluded.phone, nif = excluded.nif, address = excluded.address,
    postal_code = excluded.postal_code, city = excluded.city, country = excluded.country,
    user_id = coalesce(excluded.user_id, cu.user_id),
    orders_count = cu.orders_count + 1,
    total_spent = cu.total_spent + excluded.total_spent,
    last_order_at = now(), updated_at = now()
  returning id into cust_id;

  insert into public.orders(user_id, customer_id, email, customer, items, subtotal, shipping, total, payment_method, notes)
  values (auth.uid(), cust_id, mail, customer - 'payment_method' - 'notes' - 'terms', lines, sub, ship, sub + ship, pay,
          left(coalesce(customer->>'notes',''), 1000))
  returning id, number into new_id, new_num;

  insert into public.order_items(order_id, product_id, variant_id, color_id, product_name, variant_label,
                                 color_name, qty, unit_price, line_total)
  select new_id, (l->>'product_id')::uuid, nullif(l->>'variant_id','')::uuid, nullif(l->>'color_id','')::uuid,
         l->>'name', l->>'variant', l->>'color', (l->>'qty')::int,
         (l->>'unit_price')::numeric, (l->>'line_total')::numeric
  from jsonb_array_elements(lines) l;

  return jsonb_build_object('id', new_id, 'number', new_num, 'subtotal', sub, 'shipping', ship, 'total', sub + ship);
end; $$;

revoke all on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['categories','brands','products','product_colors','product_variants',
                           'product_images','slides','banners','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "leitura publica" on public.%I', t);
    execute format('create policy "leitura publica" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin escreve" on public.%I', t);
    execute format('create policy "admin escreve" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

alter table public.orders enable row level security;
drop policy if exists "cliente ve as suas" on public.orders;
create policy "cliente ve as suas" on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin atualiza" on public.orders;
create policy "admin atualiza" on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin apaga" on public.orders;
create policy "admin apaga" on public.orders for delete using (public.is_owner());
-- (inserção só através de place_order)

alter table public.customers enable row level security;
drop policy if exists "cliente ve o seu registo" on public.customers;
create policy "cliente ve o seu registo" on public.customers for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin atualiza clientes" on public.customers;
create policy "admin atualiza clientes" on public.customers for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "dono apaga clientes" on public.customers;
create policy "dono apaga clientes" on public.customers for delete using (public.is_owner());

alter table public.order_items enable row level security;
drop policy if exists "linhas da encomenda" on public.order_items;
create policy "linhas da encomenda" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.user_id = auth.uid() or public.is_admin())));

alter table public.admins enable row level security;
drop policy if exists "admin ve equipa" on public.admins;
create policy "admin ve equipa" on public.admins for select using (public.is_admin());
drop policy if exists "dono gere equipa" on public.admins;
create policy "dono gere equipa" on public.admins for all
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------
-- Storage: fotos dos produtos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos leitura publica" on storage.objects;
create policy "fotos leitura publica" on storage.objects for select
  using (bucket_id = 'product-images');
drop policy if exists "fotos admin envia" on storage.objects;
create policy "fotos admin envia" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "fotos admin altera" on storage.objects;
create policy "fotos admin altera" on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "fotos admin apaga" on storage.objects;
create policy "fotos admin apaga" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------
-- PRIMEIRO DONO DO ADMIN — troque pelo SEU email antes de correr!
-- Depois de entrar no /admin pode adicionar outras pessoas na aba "Acessos".
-- ---------------------------------------------------------------------
insert into public.admins (email, role) values ('SEU-EMAIL@exemplo.com', 'owner')
on conflict (email) do update set role = 'owner';
