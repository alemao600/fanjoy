# Fanjoy (HTML + JS + Supabase)

Projeto limpo para deploy gratuito no Vercel com banco/auth no Supabase.

## Estrutura
- index.html
- cart.html
- customer-login.html
- customer-profile.html
- login.html
- admin.html
- js/api.js
- js/supabase-config.js
- supabase-schema.sql
- vercel.json

## 1) Configurar Supabase
1. Crie um projeto no Supabase.
2. Rode o SQL de `supabase-schema.sql` no SQL Editor.
3. Em Authentication > Providers, deixe Email habilitado.
4. Copie Project URL e anon key.
5. Edite `js/supabase-config.js`.

## 2) Deploy no Vercel
1. Suba este repositório no GitHub.
2. Importe no Vercel.
3. Framework Preset: Other.
4. Root: `/`.
5. Deploy.

## 3) Domínio
1. No Vercel: Settings > Domains.
2. Adicione seu domínio pago.
3. Ajuste DNS no registrador conforme instruções do Vercel.

## Observações
- Login admin continua local (`admin` / `admin123`) em `login.html`.
- Mercado Pago backend foi removido nesta versão frontend-only.
- Para pagamento real seguro, será necessário adicionar Edge Function/Backend.
