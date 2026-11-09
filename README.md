# EletroPoint

EletroPoint é uma loja online de eletrónica: smartphones, computadores, áudio, acessórios e mais. Os clientes encontram os produtos, comparam modelos e fazem encomendas. A equipa da loja gere tudo num painel de administração.

Site: https://eletropoint.vercel.app

## Funcionalidades

### Loja

- Página inicial com carrossel de destaques, categorias e os produtos mais procurados.
- Listagens por categoria e por marca. Podem filtrar-se por preço e ordenar-se.
- Pesquisa com sugestões enquanto se escreve.
- Página de produto com:
  - galeria de imagens em ecrã inteiro;
  - escolha de cor e de variante (por exemplo, armazenamento), cada uma com preço e stock próprios;
  - especificações técnicas;
  - ligação aos outros modelos da mesma família (por exemplo, iPhone 17 Pro e Pro Max).
- Carrinho guardado no navegador.
- Finalização de compra com MB WAY, Multibanco, transferência ou pagamento na entrega.
- Conta de cliente: registo, login, recuperação de palavra-passe e histórico de encomendas com o estado de cada uma.
- Animações de entrada suaves. Respeitam a opção do sistema "reduzir movimento".

### Painel de administração (`/admin/`)

- Produtos: fotos, cores, variantes, especificações, preços, stock, destaque e visibilidade.
- Categorias, marcas, slides da página inicial e banners.
- Encomendas: estado e notas.
- Clientes: contactos, morada, número de encomendas e total gasto.
- Definições da loja: nome, email de contacto, custo de envio e valor a partir do qual o envio é grátis.
- Gestão de acessos com dois níveis:
  - **owner**: acesso total;
  - **editor**: gere o catálogo e as encomendas.

## Tecnologia

- **Frontend:** HTML, CSS e JavaScript em módulos ES, sem frameworks e sem passo de build.
- **Backend:** [Supabase](https://supabase.com), que trata da base de dados, da autenticação e do armazenamento das imagens. A segurança é feita na própria base de dados, com regras RLS:
  - os clientes só veem os seus próprios dados;
  - só os administradores podem alterar a loja.
- **Encomendas:** validadas no servidor pela função `place_order`, que confirma preços e stock antes de gravar.
- **Alojamento:** [Vercel](https://vercel.com).

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html` | Página inicial |
| `categoria.html` | Listagem de produtos com filtros |
| `produto.html` | Página de produto |
| `carrinho.html`, `checkout.html` | Carrinho e finalização da encomenda |
| `login.html`, `registo.html`, `reset-password.html`, `conta.html` | Conta de cliente |
| `admin/` | Painel de administração |
| `assets/` | Estilos, scripts partilhados e scripts de cada página |
| `data/catalog.json` | Catálogo de demonstração |
| `supabase/` | Esquema da base de dados, regras de segurança e dados iniciais |
| `vercel.json` | Redirecionamentos e cabeçalhos de segurança |
