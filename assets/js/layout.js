// Cabeçalho, rodapé, pesquisa, menu móvel, toasts e cartões de produto partilhados
import { catalog, euro, productUrl, categoryUrl, mainImage, esc, norm, hasBackend, getUser, onAuthChange } from './store.js';
import { cart } from './cart.js';
import { reveal } from './reveal.js';

export const icons = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l4 4v2h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  return: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="m8 5-4 4 4 4"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10"/></svg>',
};

// ---------- Toasts ----------
let toastHost;
export function toast(msg, { img, link, linkText = 'Ver carrinho', error = false, timeout = 3800 } = {}) {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toasts';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastHost);
  }
  const el = document.createElement('div');
  el.className = `toast${error ? ' error' : ''}`;
  el.innerHTML = `${img ? `<img src="${esc(img)}" alt="">` : ''}<span>${esc(msg)}</span>${link ? `<a href="${esc(link)}">${esc(linkText)}</a>` : ''}`;
  toastHost.appendChild(el);
  while (toastHost.children.length > 3) toastHost.firstChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, timeout);
}

// ---------- Cartões de produto ----------
export function priceHTML(p) {
  const many = p.variants.length > 1 && p.variants.some((v) => v.price !== p.min_price);
  const cmp = p.compare_at_price && p.compare_at_price > p.min_price ? `<s>${euro(p.compare_at_price)}</s>` : '';
  return `<div class="price">${many ? '<small>Desde</small>' : ''}${euro(p.min_price)}${cmp}</div>`;
}

export function cardHTML(p) {
  const img = mainImage(p);
  const sale = p.compare_at_price && p.compare_at_price > p.min_price;
  const tag = sale
    ? `<span class="card-tag sale">-${Math.round((1 - p.min_price / p.compare_at_price) * 100)}%</span>`
    : (p.featured ? '<span class="card-tag">Novo</span>' : '');
  const sw = p.colors.length > 1
    ? `<div class="card-swatches" aria-label="${p.colors.length} cores">${p.colors.slice(0, 6).map((c) => `<i style="background:${esc(c.hex)}" title="${esc(c.name)}"></i>`).join('')}</div>`
    : '';
  const needsChoice = p.colors.length > 1 || p.variants.length > 1;
  const out = p.total_stock <= 0;
  const action = out
    ? '<span class="stock-out">Esgotado</span>'
    : needsChoice
      ? `<a class="btn btn-sm add" href="${productUrl(p)}">Escolher</a>`
      : `<button class="btn btn-sm add" type="button" data-add="${esc(p.id)}">Adicionar</button>`;
  return `<article class="card">
    <a class="card-media" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">${tag}<img src="${esc(img.url)}" alt="" loading="lazy" decoding="async"></a>
    <div class="card-body">
      <span class="card-brand">${esc(p.brand ? p.brand.name : p.category.name)}</span>
      <h3 class="card-title"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
      ${p.short_description ? `<p class="card-desc">${esc(p.short_description)}</p>` : ''}
      ${sw}
      <div class="card-foot">${priceHTML(p)}${action}</div>
    </div>
  </article>`;
}

export function skeletonCards(n = 8) {
  return Array.from({ length: n }, () => '<div class="sk-card" aria-hidden="true"><div class="sk sk-img"></div><div class="sk sk-line"></div><div class="sk sk-line w60"></div><div class="sk sk-line w40"></div></div>').join('');
}

export function addToCart(p, { variant = null, color = null, qty = 1 } = {}) {
  const v = variant || (p.variants.length ? p.variants[0] : null);
  const c = color || (p.colors.length ? p.colors[0] : null);
  cart.add({ product_id: p.id, variant_id: v ? v.id : null, color_id: c ? c.id : null, qty });
  const label = [p.name, v && v.label, c && c.name].filter(Boolean).join(' · ');
  toast(`Adicionado: ${label}`, { img: mainImage(p, c && c.id).url, link: '/carrinho.html' });
}

// Botões "Adicionar" dos cartões (delegação de eventos, funciona para conteúdo novo)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-add]');
  if (!btn) return;
  e.preventDefault();
  const cat = await catalog();
  const p = cat.byId.get(btn.dataset.add);
  if (p) addToCart(p);
});

// ---------- Cabeçalho ----------
function headerHTML(cat) {
  const nav = cat.categories.map((c) => `
    <div class="nav-item">
      <a class="nav-link" href="${categoryUrl(c)}" data-cat="${esc(c.slug)}">${esc(c.name)}</a>
      ${c.brands.length ? `<div class="mega">
        ${c.brands.map((b) => `<a href="${categoryUrl(c, b)}"><span class="brand-logo">${b.logo_svg || ''}</span>${esc(b.name)}</a>`).join('')}
        <a class="all" href="${categoryUrl(c)}">Ver tudo em ${esc(c.name)}</a>
      </div>` : ''}
    </div>`).join('');
  return `
  <div class="wrap header-bar">
    <a class="logo" href="/" aria-label="EletroPoint — início"><img src="/img/logo.png" alt="EletroPoint" width="140" height="34"></a>
    <nav class="nav" aria-label="Categorias">${nav}</nav>
    <div class="header-actions">
      <button class="icon-btn" type="button" data-search-toggle aria-label="Pesquisar" aria-expanded="false">${icons.search}</button>
      <a class="icon-btn" href="/login.html" data-account aria-label="Conta">${icons.user}</a>
      <a class="icon-btn" href="/carrinho.html" aria-label="Carrinho">${icons.bag}<span class="badge" data-cart-badge></span></a>
      <button class="icon-btn menu-toggle" type="button" data-drawer-open aria-label="Abrir menu">${icons.menu}</button>
    </div>
  </div>
  <div class="search-panel" data-search-panel>
    <div class="wrap">
      <form class="search-form" role="search" action="/categoria.html">
        ${icons.search}
        <input type="search" name="q" placeholder="Pesquisar produtos, marcas…" autocomplete="off" aria-label="Pesquisar" aria-controls="search-results">
        <button class="icon-btn" type="button" data-search-close aria-label="Fechar pesquisa">${icons.close}</button>
      </form>
      <div class="search-results" id="search-results" role="listbox"></div>
    </div>
  </div>`;
}

function drawerHTML(cat) {
  return `
  <div class="drawer-backdrop" data-drawer-close></div>
  <aside class="drawer" aria-label="Menu" aria-hidden="true">
    <div class="drawer-head">
      <img src="/img/logo.png" alt="EletroPoint" style="height:28px;width:auto">
      <button class="icon-btn" type="button" data-drawer-close aria-label="Fechar menu">${icons.close}</button>
    </div>
    <nav>
      ${cat.categories.map((c) => `<details>
        <summary>${esc(c.name)}</summary>
        ${c.brands.map((b) => `<a href="${categoryUrl(c, b)}">${esc(b.name)}</a>`).join('')}
        <a href="${categoryUrl(c)}"><b>Ver tudo</b></a>
      </details>`).join('')}
      <div class="drawer-links">
        <a href="/categoria.html">Todos os produtos</a>
      </div>
    </nav>
  </aside>`;
}

function footerHTML(cat) {
  const year = new Date().getFullYear();
  return `
  <div class="wrap">
    <div class="footer-grid">
      <div class="about">
        <img src="/img/logo.png" alt="EletroPoint" style="height:30px;width:auto">
        <p>Tecnologia das melhores marcas, com entrega rápida em Portugal e apoio de quem percebe do assunto.</p>
        <form class="newsletter" data-newsletter>
          <input type="email" required placeholder="O seu email" aria-label="Email para a newsletter">
          <button class="btn btn-sm" type="submit">Subscrever</button>
        </form>
      </div>
      <div>
        <h4>Loja</h4>
        <ul>${cat.categories.map((c) => `<li><a href="${categoryUrl(c)}">${esc(c.name)}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h4>Conta</h4>
        <ul>
          <li><a href="/conta.html">A minha conta</a></li>
          <li><a href="/conta.html">Encomendas</a></li>
          <li><a href="/reset-password.html">Recuperar palavra-passe</a></li>
        </ul>
      </div>
      <div>
        <h4>Apoio</h4>
        <ul>
          <li><span class="muted">Envio grátis acima de ${euro(cat.settings.free_shipping_over)}</span></li>
          <li><span class="muted">Devolução em 14 dias</span></li>
          <li><span class="muted">Garantia de 3 anos</span></li>
          ${cat.settings.contact_email ? `<li><a href="mailto:${esc(cat.settings.contact_email)}">${esc(cat.settings.contact_email)}</a></li>` : ''}
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${year} ${esc(cat.settings.store_name || 'EletroPoint')}. Todos os direitos reservados.</span>
      <span>Preços com IVA incluído.</span>
    </div>
  </div>`;
}

// ---------- Pesquisa ----------
function setupSearch(header, cat) {
  const panel = header.querySelector('[data-search-panel]');
  const toggle = header.querySelector('[data-search-toggle]');
  const input = panel.querySelector('input');
  const results = panel.querySelector('.search-results');
  const form = panel.querySelector('form');
  let hl = -1;

  const index = cat.products.map((p) => ({ p, text: norm(`${p.name} ${p.brand ? p.brand.name : ''} ${p.category.name}`) }));

  const open = (v) => {
    panel.classList.toggle('open', v);
    toggle.setAttribute('aria-expanded', String(v));
    if (v) setTimeout(() => input.focus(), 60);
  };
  toggle.addEventListener('click', () => open(!panel.classList.contains('open')));
  panel.querySelector('[data-search-close]').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) open(false);
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); open(true); }
  });
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !header.contains(e.target)) open(false);
  });

  const render = () => {
    const q = norm(input.value.trim());
    hl = -1;
    if (!q) { results.innerHTML = ''; return; }
    const terms = q.split(/\s+/);
    const found = index.filter((x) => terms.every((t) => x.text.includes(t))).slice(0, 7).map((x) => x.p);
    results.innerHTML = found.length
      ? found.map((p) => `<a href="${productUrl(p)}" role="option"><img src="${esc(mainImage(p).url)}" alt=""><span><span class="s-name">${esc(p.name)}</span><br><span class="s-meta">${esc([p.brand && p.brand.name, p.category.name].filter(Boolean).join(' · '))}</span></span><span class="s-price">${euro(p.min_price)}</span></a>`).join('')
      : `<p class="search-empty">Sem resultados para “${esc(input.value.trim())}”.</p>`;
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    const items = [...results.querySelectorAll('a')];
    if (!items.length || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((a, i) => a.classList.toggle('hl', i === hl));
    items[hl].scrollIntoView({ block: 'nearest' });
  });
  form.addEventListener('submit', (e) => {
    const items = results.querySelectorAll('a');
    if (hl >= 0 && items[hl]) { e.preventDefault(); location.href = items[hl].href; return; }
    if (!input.value.trim()) e.preventDefault();
  });
}

// ---------- Menu móvel ----------
function setupDrawer(header) {
  const drawer = document.querySelector('.drawer');
  const set = (v) => {
    document.body.classList.toggle('drawer-open', v);
    drawer.setAttribute('aria-hidden', String(!v));
    document.body.style.overflow = v ? 'hidden' : '';
  };
  header.querySelector('[data-drawer-open]').addEventListener('click', () => set(true));
  document.querySelectorAll('[data-drawer-close]').forEach((b) => b.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

// ---------- Contador do carrinho ----------
function setupBadge() {
  const badge = document.querySelector('[data-cart-badge]');
  if (!badge) return;
  const update = (bump) => {
    const n = cart.count();
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.toggle('show', n > 0);
    if (bump && n > 0) {
      badge.classList.remove('bump');
      void badge.offsetWidth; // reinicia a animação
      badge.classList.add('bump');
    }
  };
  update(false);
  window.addEventListener('cart:change', () => update(true));
}

async function setupAccount() {
  if (!hasBackend) return;
  const set = (user) => document.querySelectorAll('[data-account]').forEach((a) => {
    a.href = user ? '/conta.html' : '/login.html';
    a.setAttribute('aria-label', user ? 'A minha conta' : 'Entrar');
  });
  set(await getUser());
  onAuthChange(set);
}

// ---------- Inicialização ----------
let ready;
export function initLayout({ activeCategory } = {}) {
  if (ready) return ready;
  ready = (async () => {
    const header = document.getElementById('site-header');
    const footer = document.getElementById('site-footer');
    let cat;
    try { cat = await catalog(); } catch (err) {
      console.error(err);
      cat = { categories: [], products: [], settings: { free_shipping_over: 50, store_name: 'EletroPoint' } };
    }
    if (header) {
      header.innerHTML = headerHTML(cat);
      // O menu fica no body: o cabeçalho usa backdrop-filter, que prenderia o position:fixed dentro dele.
      document.body.insertAdjacentHTML('beforeend', drawerHTML(cat));
      setupSearch(header, cat);
      setupDrawer(header);
      if (activeCategory) header.querySelector(`.nav-link[data-cat="${CSS.escape(activeCategory)}"]`)?.classList.add('active');
      const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    if (footer) {
      footer.innerHTML = footerHTML(cat);
      footer.querySelector('[data-newsletter]')?.addEventListener('submit', (e) => {
        e.preventDefault();
        e.target.reset();
        toast('Obrigado! Vai receber as nossas novidades.');
      });
    }
    setupBadge();
    setupAccount();
    reveal();
    return cat;
  })();
  return ready;
}

// Página de erro reutilizável
export function emptyState({ title, text, cta = { href: '/', label: 'Voltar à loja' }, icon = icons.box }) {
  return `<div class="empty fade-in">${icon}<h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${cta ? `<a class="btn" href="${esc(cta.href)}">${esc(cta.label)}</a>` : ''}</div>`;
}
