import { initLayout, cardHTML, skeletonCards, emptyState, icons } from '../layout.js';
import { esc, norm, params, categoryUrl, euro } from '../store.js';
import { reveal } from '../reveal.js';

const $ = (s) => document.querySelector(s);
const q = params();
const catSlug = q.get('c') || '';
const brandSlug = q.get('marca') || '';
const term = (q.get('q') || '').trim();

$('#grid').innerHTML = skeletonCards(8);
const cat = await initLayout({ activeCategory: catSlug });

const category = catSlug ? cat.catBySlug.get(catSlug) : null;
let brand = brandSlug ? cat.brandBySlug.get(brandSlug) : null;

if (catSlug && !category) {
  document.title = 'Categoria não encontrada — EletroPoint';
  $('#page').innerHTML = emptyState({ title: 'Categoria não encontrada', text: 'A categoria que procura não existe ou foi removida.', cta: { href: '/categoria.html', label: 'Ver todos os produtos' } });
  await new Promise(() => {}); // pára aqui
}

// ---------- Lista base ----------
let base = cat.products;
if (category) base = base.filter((p) => p.category_id === category.id);
if (term) {
  const words = norm(term).split(/\s+/).filter(Boolean);
  base = base.filter((p) => {
    const hay = norm([p.name, p.short_description, p.brand?.name, p.category?.name].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

// ---------- Cabeçalho da página (atualizado quando muda a marca) ----------
function renderHead() {
  let title = 'Todos os produtos';
  let subtitle = 'Explore todo o catálogo EletroPoint.';
  if (term) { title = `Resultados para “${term}”`; subtitle = ''; }
  else if (category && brand) { title = `${category.name} ${brand.name}`; subtitle = category.description || ''; }
  else if (category) { title = category.name; subtitle = category.description || ''; }
  else if (brand) { title = brand.name; subtitle = `Todos os produtos ${brand.name}.`; }
  document.title = `${title} — EletroPoint`;

  const crumbs = ['<a href="/">Início</a>'];
  if (category) crumbs.push(brand ? `<a href="${categoryUrl(category)}">${esc(category.name)}</a>` : `<span>${esc(category.name)}</span>`);
  if (brand) crumbs.push(`<span>${esc(brand.name)}</span>`);
  if (!category && !brand) crumbs.push(`<span>${term ? 'Pesquisa' : 'Produtos'}</span>`);
  $('#crumbs').innerHTML = crumbs.join('');
  $('#title').innerHTML = `<h1>${esc(title)}</h1>${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}`;
}
renderHead();

// ---------- Filtros ----------
const state = { brand: brand ? brand.id : '', sort: 'relevance', max: '' };
const brandsHere = cat.brands.filter((b) => base.some((p) => p.brand_id === b.id));

function chips() {
  if (brandsHere.length < 2) return '';
  return `<div class="chips" role="group" aria-label="Marcas">
    <button type="button" class="chip${state.brand ? '' : ' active'}" data-brand="">Todas</button>
    ${brandsHere.map((b) => `<button type="button" class="chip${state.brand === b.id ? ' active' : ''}" data-brand="${esc(b.id)}">${esc(b.name)}</button>`).join('')}
  </div>`;
}

const maxPrice = Math.ceil(Math.max(0, ...base.map((p) => p.min_price)));
$('#toolbar').innerHTML = `
  <div id="chips">${chips()}</div>
  <span class="spacer"></span>
  ${maxPrice > 0 ? `<label class="price-filter">Até <input type="number" id="max" min="0" step="10" placeholder="${maxPrice}" inputmode="numeric"> €</label>` : ''}
  <select class="select" id="sort" aria-label="Ordenar">
    <option value="relevance">Relevância</option>
    <option value="price-asc">Preço: mais baixo</option>
    <option value="price-desc">Preço: mais alto</option>
    <option value="name">Nome (A–Z)</option>
    <option value="new">Mais recentes</option>
  </select>
  <span class="result-count" id="count" aria-live="polite"></span>`;

function list() {
  let out = base.slice();
  if (state.brand) out = out.filter((p) => p.brand_id === state.brand);
  if (state.max !== '') out = out.filter((p) => p.min_price <= +state.max);
  const s = state.sort;
  if (s === 'price-asc') out.sort((a, b) => a.min_price - b.min_price);
  else if (s === 'price-desc') out.sort((a, b) => b.min_price - a.min_price);
  else if (s === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  else if (s === 'new') out.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  else out.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.total_stock > 0) - (a.total_stock > 0));
  return out;
}

function render() {
  const items = list();
  $('#count').textContent = `${items.length} ${items.length === 1 ? 'produto' : 'produtos'}`;
  $('#grid').innerHTML = items.length
    ? items.map(cardHTML).join('')
    : `<div style="grid-column:1/-1">${emptyState({
      title: term ? 'Sem resultados' : 'Nenhum produto encontrado',
      text: term ? 'Experimente outras palavras ou veja todas as categorias.' : 'Ajuste os filtros para ver mais produtos.',
      cta: { href: '/categoria.html', label: 'Ver todos os produtos' },
      icon: icons.search,
    })}</div>`;
  reveal();
}

$('#toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-brand]');
  if (!b) return;
  state.brand = b.dataset.brand;
  $('#chips').innerHTML = chips();
  // o caminho (Início › Categoria › Marca), o título e o URL acompanham o filtro
  brand = cat.brands.find((x) => x.id === state.brand) || null;
  const u = new URL(location.href);
  if (brand) u.searchParams.set('marca', brand.slug); else u.searchParams.delete('marca');
  history.pushState({ brand: state.brand }, '', u);
  renderHead();
  render();
});
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
const maxInput = $('#max');
if (maxInput) {
  let t;
  maxInput.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { state.max = maxInput.value; render(); }, 250);
  });
  maxInput.title = `Preço mais alto: ${euro(maxPrice)}`;
}

render();

// botões "anterior/seguinte" do browser voltam ao filtro certo
addEventListener('popstate', () => {
  const slug = new URL(location.href).searchParams.get('marca') || '';
  brand = slug ? cat.brandBySlug.get(slug) || null : null;
  state.brand = brand ? brand.id : '';
  $('#chips').innerHTML = chips();
  renderHead();
  render();
});
