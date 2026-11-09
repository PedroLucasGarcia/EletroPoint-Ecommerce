# EletroPoint

Loja online de eletrónica: site estático (HTML, CSS, JS em módulos ES), sem passo de build. O backend é o Supabase (base de dados, autenticação e imagens). Publica-se no Vercel.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html` | Página inicial (carrossel, categorias, mais procurados) |
| `categoria.html?c=<slug>&marca=<slug>&q=<pesquisa>` | Listagem com filtros e ordenação |
| `produto.html?slug=<slug>` | Página de produto (galeria, cores, variantes, especificações) |
| `carrinho.html`, `checkout.html` | Carrinho (guardado no browser) e finalização da encomenda |
| `login.html`, `registo.html`, `reset-password.html`, `conta.html` | Conta de cliente |
| `admin/` | Painel de administração (protegido) |
| `assets/` | CSS, JS partilhado (`layout.js`, `store.js`, `reveal.js`) e scripts de cada página |
| `data/catalog.json` | Catálogo usado no modo de demonstração |
| `supabase/schema.sql`, `supabase/seed.sql` | Tabelas, regras de segurança (RLS) e dados iniciais |
| `vercel.json` | Redirecionamentos dos URLs antigos, cabeçalhos de segurança |

Os conteúdos aparecem com uma animação de entrada (`assets/js/reveal.js`) à medida que entram no ecrã. A animação respeita a opção do sistema "reduzir movimento".

## Modo de demonstração

Enquanto `assets/js/config.js` estiver vazio, a loja lê o catálogo de `data/catalog.json`. Funcionam a navegação, o carrinho, a finalização de compra e o painel. Não há contas.

As encomendas feitas neste modo, e os dados de cada comprador, ficam numa base de dados local do navegador (`assets/js/local-db.js`, chaves `ep_orders` e `ep_customers` do `localStorage`). Aparecem no painel em **Encomendas** e **Clientes**, mas só nesse navegador e nesse computador. Para guardar as compras de todos os visitantes é preciso ligar ao Supabase.

Para testar localmente:

```bash
python -m http.server 8080
```

Depois abra http://localhost:8080. O site tem de ser servido por HTTP: abrir os ficheiros diretamente não funciona.

## Ligar ao Supabase

1. Crie um projeto em https://supabase.com.
2. No **SQL Editor**, edite a linha `insert into public.admins ... 'SEU-EMAIL@exemplo.com'` no fim de `supabase/schema.sql` e ponha o seu email. Depois execute o ficheiro inteiro.
3. Execute `supabase/seed.sql` para carregar o catálogo inicial.
4. Em **Project Settings → API**, copie o *Project URL* e a chave *anon public* para `assets/js/config.js`. Nunca use a chave `service_role`.
5. Em **Authentication → URL Configuration**:
   - *Site URL*: o domínio do Vercel (ex.: `https://eletropoint.vercel.app`).
   - *Redirect URLs*: `https://<domínio>/reset-password.html`, `https://<domínio>/login.html` e `http://localhost:8080/**` para testes.
6. Em **Authentication → Emails**, configure um SMTP próprio. O SMTP incluído no Supabase tem limites muito baixos e serve apenas para testes.

## Base de dados de compras

Com o Supabase ligado, cada compra é registada pela função `place_order` (em `supabase/schema.sql`), que valida preços e stock no servidor e grava:

- `customers`: um registo por comprador (email único), com nome, telemóvel, NIF, morada, n.º de encomendas, total gasto e datas da primeira e da última compra;
- `orders`: a encomenda (número, estado, totais, pagamento, morada de entrega), ligada ao comprador por `customer_id`;
- `order_items`: uma linha por artigo, com produto, variante, cor, quantidade e preço na altura da compra.

Os administradores veem tudo; um cliente com conta vê apenas o seu registo e as suas encomendas (RLS).

## Painel de administração

Abra `/admin/`. Entre com uma conta registada no site cujo email esteja na tabela `admins`.

- **owner**: acesso total, incluindo a gestão de acessos e a eliminação de encomendas.
- **editor**: gere produtos, categorias, marcas, destaques, banners, encomendas e definições.

Para dar acesso a alguém, use **Acessos** no painel. A pessoa tem primeiro de criar conta em `/registo.html` com esse email. A proteção é feita na base de dados (RLS): mesmo que alguém abra `/admin/`, não consegue ler nem alterar dados sem estar na tabela `admins`.

No painel pode gerir:

- produtos: fotos (arrastar e largar ou URL), família de modelos (liga, por exemplo, o iPhone 17 Pro ao Pro Max na página do produto), cores, variantes (ex.: armazenamento) com preço e stock próprios, especificações, preço, preço antigo, destaque e visibilidade;
- categorias, marcas, slides da página inicial e banners;
- encomendas (estado e notas), clientes (dados de contacto e morada, n.º de encomendas, total gasto) e definições da loja (nome, email de contacto, custo de envio, envio grátis a partir de).

Atalho: `Ctrl+S` guarda o produto em edição.

## Publicar no Vercel

1. Envie o repositório para o GitHub.
2. No Vercel: **Add New → Project**, importe o repositório. Framework: **Other**. Sem comando de build. Output directory: a raiz.
3. Depois de publicar, atualize o *Site URL* e os *Redirect URLs* no Supabase com o domínio final.

## Pagamentos

O checkout regista a encomenda (função `place_order`, que confirma preços e stock no servidor) com o método escolhido: MB WAY, Multibanco, transferência ou pagamento na entrega. **Ainda não há cobrança automática.** As encomendas ficam "pendentes" e o estado muda-se no painel. Para cobrar online é preciso integrar um fornecedor (ex.: Stripe, Easypay, ifthenpay) através de uma função no servidor.
