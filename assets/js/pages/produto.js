import { initLayout, cardHTML, emptyState, addToCart, icons } from '../layout.js';
import { esc, euro, params, categoryUrl, productUrl } from '../store.js';
import { reveal } from '../reveal.js';

const page = document.getElementById('page');
const chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>';
const chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>';
const slug = params().get('slug') || '';
const cat = await initLayout();
const p = cat.bySlug.get(slug);

if (!p) {
  document.title = 'Produto não encontrado — EletroPoint';
  page.innerHTML = emptyState({
    title: 'Produto não encontrado',
    text: 'Este produto já não está disponível ou o endereço está incorreto.',
    cta: { href: '/categoria.html', label: 'Ver todos os produtos' },
    icon: icons.search,
  });
} else {
  render(p);
}

function render(p) {
  document.title = `${p.name} — EletroPoint`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && p.short_description) meta.content = p.short_description;

  const state = {
    color: p.colors.find((c) => c.id === p.card_color_id) || p.colors[0] || null,
    variant: p.variants.find((v) => v.stock > 0) || p.variants[0] || null,
    qty: 1,
    img: 0,
  };

  const imagesFor = () => {
    const own = state.color ? p.images.filter((i) => i.color_id === state.color.id) : [];
    const shared = p.images.filter((i) => !i.color_id);
    const list = own.length ? own : (shared.length ? shared : p.images);
    return list.length ? list : [{ url: '/img/icone.png', alt: p.name }];
  };
  const price = () => (state.variant ? state.variant.price : p.base_price);
  const stock = () => (state.variant ? state.variant.stock : p.stock);

  // Especificações agrupadas
  const groups = new Map();
  (p.specs || []).forEach((s) => {
    if (!s || !s.label) return;
    const g = s.group || 'Geral';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(s);
  });

  // Outros modelos da mesma família (ex.: iPhone 17 Pro / Pro Max)
  const models = p.model_group
    ? cat.products.filter((x) => x.model_group === p.model_group).sort((a, b) => (a.min_price ?? a.base_price) - (b.min_price ?? b.base_price))
    : [];

  const crumbs = ['<a href="/">Início</a>'];
  if (p.category) crumbs.push(`<a href="${categoryUrl(p.category)}">${esc(p.category.name)}</a>`);
  if (p.category && p.brand) crumbs.push(`<a href="${categoryUrl(p.category, p.brand)}">${esc(p.brand.name)}</a>`);
  crumbs.push(`<span>${esc(p.name)}</span>`);

  page.innerHTML = `
    <nav class="breadcrumbs" aria-label="Navegação estrutural">${crumbs.join('')}</nav>
    <div class="pdp">
      <div class="gallery" data-rv>
        <div class="gallery-main">
          <button type="button" class="g-zoom" id="g-open" aria-label="Ver imagem em ecrã inteiro"><img id="main-img" src="" alt=""></button>
          <button type="button" class="g-arrow prev" data-step="-1" aria-label="Imagem anterior">${chevL}</button>
          <button type="button" class="g-arrow next" data-step="1" aria-label="Imagem seguinte">${chevR}</button>
          <span class="g-count" id="g-count" aria-hidden="true"></span>
        </div>
        <div class="thumbs" id="thumbs"></div>
      </div>
      <div class="pdp-info" data-rv>
        ${p.brand ? `<span class="brand">${esc(p.brand.name)}</span>` : ''}
        <h1>${esc(p.name)}</h1>
        ${p.short_description ? `<p class="lead">${esc(p.short_description)}</p>` : ''}
        <div class="pdp-price" id="price"></div>
        <p class="pdp-note" id="stock"></p>

        ${models.length > 1 ? `
        <div class="opt">
          <div class="opt-label">Modelo: <span>${esc(p.name)}</span></div>
          <div class="variants models" aria-label="Modelo">
            ${models.map((x) => `<a class="variant${x.id === p.id ? ' active' : ''}" href="${productUrl(x)}"${x.id === p.id ? ' aria-current="page"' : ''}><b>${esc(x.name)}</b><small>desde ${euro(x.min_price ?? x.base_price)}</small></a>`).join('')}
          </div>
        </div>` : ''}

        ${p.colors.length ? `
        <div class="opt">
          <div class="opt-label">Cor: <span id="color-name"></span></div>
          <div class="swatches" role="radiogroup" aria-label="Cor">
            ${p.colors.map((c) => `<button type="button" class="swatch" role="radio" data-color="${esc(c.id)}" style="background:${esc(c.hex || '#ccc')}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join('')}
          </div>
        </div>` : ''}

        ${p.variants.length ? `
        <div class="opt">
          <div class="opt-label">Armazenamento: <span id="variant-name"></span></div>
          <div class="variants" role="radiogroup" aria-label="Armazenamento">
            ${p.variants.map((v) => `<button type="button" class="variant" role="radio" data-variant="${esc(v.id)}"${v.stock > 0 ? '' : ' disabled'}><b>${esc(v.label)}</b><small>${v.stock > 0 ? euro(v.price) : 'Esgotado'}</small></button>`).join('')}
          </div>
        </div>` : ''}

        <div class="buy-row">
          <div class="qty" aria-label="Quantidade">
            <button type="button" data-q="-1" aria-label="Diminuir">−</button>
            <input id="qty" type="number" min="1" max="20" value="1" inputmode="numeric" aria-label="Quantidade">
            <button type="button" data-q="1" aria-label="Aumentar">+</button>
          </div>
          <button type="button" class="btn btn-lg" id="buy">Adicionar ao carrinho</button>
        </div>

        <div class="perks">
          <div class="perk">${icons.truck}<span>Envio grátis acima de ${euro(cat.settings.free_shipping_over)}</span></div>
          <div class="perk">${icons.return}<span>14 dias para devolver</span></div>
          <div class="perk">${icons.shield}<span>Garantia de 3 anos</span></div>
        </div>
      </div>
    </div>

    ${p.description ? `
    <section class="pdp-section">
      <h2>Descrição.</h2>
      <div class="prose" data-rv>${p.description.split(/\n{2,}/).map((t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('')}</div>
    </section>` : ''}

    ${groups.size ? `
    <section class="pdp-section">
      <h2>Especificações.</h2>
      <div class="specs">
        ${[...groups].map(([g, rows]) => `
          <div class="spec-group">
            <h3>${esc(g)}</h3>
            <dl>${rows.map((r) => `<div class="spec-row"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl>
          </div>`).join('')}
      </div>
    </section>` : ''}

    <section class="pdp-section" id="related-wrap">
      <h2>Também pode gostar.</h2>
      <div class="grid" id="related"></div>
    </section>
    <div class="section-sm"></div>`;

  const $ = (s) => page.querySelector(s);
  const mainImg = $('#main-img');

  const gm = $('.gallery-main');
  const thumbs = $('#thumbs');
  let swapTimer = null;

  function showImage(i, animate = true) {
    const imgs = imagesFor();
    const n = imgs.length;
    state.img = ((i % n) + n) % n;
    const im = imgs[state.img];
    const apply = () => {
      mainImg.src = im.url;
      mainImg.alt = im.alt || p.name;
      mainImg.classList.remove('swap');
    };
    clearTimeout(swapTimer);
    if (animate && mainImg.getAttribute('src') && mainImg.getAttribute('src') !== im.url) {
      mainImg.classList.add('swap');
      swapTimer = setTimeout(apply, 180);
    } else apply();
    gm.classList.toggle('multi', n > 1);
    $('#g-count').textContent = n > 1 ? `${state.img + 1} / ${n}` : '';
    thumbs.querySelectorAll('button').forEach((b, j) => {
      const on = j === state.img;
      b.classList.toggle('active', on);
      b.setAttribute('aria-current', String(on));
      // manter a miniatura ativa visível sem mexer no scroll da página
      if (on) thumbs.scrollTo({ left: b.offsetLeft - thumbs.offsetLeft - (thumbs.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
    });
    if (lb.open) lb.show();
  }

  function renderThumbs() {
    const imgs = imagesFor();
    thumbs.innerHTML = imgs.length > 1
      ? imgs.map((im, i) => `<button type="button" aria-label="Imagem ${i + 1} de ${imgs.length}"><img src="${esc(im.url)}" alt="" loading="lazy"></button>`).join('')
      : '';
    showImage(0);
  }

  // Ecrã inteiro (lightbox)
  const lb = (() => {
    const el = document.createElement('div');
    el.className = 'lightbox';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', `Imagens de ${p.name}`);
    el.innerHTML = `
      <button type="button" class="lb-close" aria-label="Fechar">${icons.close}</button>
      <span class="lb-count"></span>
      <div class="lb-stage"><img alt=""></div>
      <button type="button" class="g-arrow lb-arrow prev" data-step="-1" aria-label="Imagem anterior">${chevL}</button>
      <button type="button" class="g-arrow lb-arrow next" data-step="1" aria-label="Imagem seguinte">${chevR}</button>
      <div class="lb-thumbs"></div>`;
    document.body.appendChild(el);
    const img = el.querySelector('.lb-stage img');
    const strip = el.querySelector('.lb-thumbs');
    let lastFocus = null;
    const api = {
      open: false,
      show() {
        const imgs = imagesFor();
        const im = imgs[state.img];
        img.src = im.url;
        img.alt = im.alt || p.name;
        el.classList.toggle('multi', imgs.length > 1);
        el.querySelector('.lb-count').textContent = imgs.length > 1 ? `${state.img + 1} / ${imgs.length}` : '';
        const key = imgs.map((x) => x.url).join('|');
        if (strip.dataset.key !== key) {
          strip.dataset.key = key;
          strip.innerHTML = imgs.length > 1 ? imgs.map((x, i) => `<button type="button" data-i="${i}" aria-label="Imagem ${i + 1}"><img src="${esc(x.url)}" alt=""></button>`).join('') : '';
        }
        strip.querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', j === state.img));
      },
      openAt(i) {
        lastFocus = document.activeElement;
        api.open = true;
        el.hidden = false;
        document.documentElement.classList.add('lb-lock');
        showImage(i, false);
        requestAnimationFrame(() => el.classList.add('in'));
        el.querySelector('.lb-close').focus();
      },
      close() {
        api.open = false;
        el.classList.remove('in');
        document.documentElement.classList.remove('lb-lock');
        setTimeout(() => { if (!api.open) el.hidden = true; }, 250);
        if (lastFocus) lastFocus.focus({ preventScroll: true });
      },
    };
    el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-step]');
      if (s) { showImage(state.img + +s.dataset.step, false); return; }
      const t = e.target.closest('[data-i]');
      if (t) { showImage(+t.dataset.i, false); return; }
      if (el.dataset.swiped) { delete el.dataset.swiped; return; }
      if (e.target.closest('.lb-close') || !e.target.closest('img')) api.close();
    });
    swipe(el.querySelector('.lb-stage'), el);
    return api;
  })();

  document.addEventListener('keydown', (e) => {
    if (lb.open) {
      if (e.key === 'Escape') lb.close();
      else if (e.key === 'ArrowLeft') showImage(state.img - 1, false);
      else if (e.key === 'ArrowRight') showImage(state.img + 1, false);
      else if (e.key === 'Tab') { // manter o foco dentro do ecrã inteiro
        const f = [...document.querySelectorAll('.lightbox button')].filter((b) => b.offsetParent);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
      return;
    }
    if (!gm.contains(document.activeElement) && !thumbs.contains(document.activeElement)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); showImage(state.img - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); showImage(state.img + 1); }
  });

  // deslizar o dedo para trocar de imagem
  function swipe(target, flagEl) {
    let x0 = null, y0 = null;
    target.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    target.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && imagesFor().length > 1) {
        flagEl.dataset.swiped = '1';
        setTimeout(() => delete flagEl.dataset.swiped, 400);
        showImage(state.img + (dx < 0 ? 1 : -1), !lb.open);
      }
      x0 = null;
    });
  }
  swipe(gm, gm);

  function update() {
    const cmp = p.compare_at_price && p.compare_at_price > price() ? `<s>${euro(p.compare_at_price)}</s>` : '';
    $('#price').innerHTML = `${euro(price())} ${cmp}`;
    const s = stock();
    const stockEl = $('#stock');
    stockEl.textContent = s > 5 ? 'Em stock · Envio em 24–48h' : s > 0 ? `Últimas ${s} unidades` : 'Esgotado de momento';
    stockEl.style.color = s > 5 ? 'var(--ok)' : s > 0 ? 'var(--warn)' : 'var(--danger)';
    const buy = $('#buy');
    buy.disabled = s <= 0;
    buy.textContent = s > 0 ? 'Adicionar ao carrinho' : 'Esgotado';
    $('#qty').max = Math.max(1, Math.min(20, s));
    if (state.color) $('#color-name').textContent = state.color.name;
    if ($('#variant-name') && state.variant) $('#variant-name').textContent = state.variant.label;
    page.querySelectorAll('[data-color]').forEach((b) => {
      const on = state.color && b.dataset.color === state.color.id;
      b.classList.toggle('active', on); b.setAttribute('aria-checked', String(!!on));
    });
    page.querySelectorAll('[data-variant]').forEach((b) => {
      const on = state.variant && b.dataset.variant === state.variant.id;
      b.classList.toggle('active', on); b.setAttribute('aria-checked', String(!!on));
    });
  }

  page.addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]');
    if (c) { state.color = p.colors.find((x) => x.id === c.dataset.color); update(); renderThumbs(); return; }
    const v = e.target.closest('[data-variant]');
    if (v && !v.disabled) { state.variant = p.variants.find((x) => x.id === v.dataset.variant); update(); return; }
    const t = e.target.closest('#thumbs button');
    if (t) { showImage([...t.parentNode.children].indexOf(t)); return; }
    const st = e.target.closest('.gallery-main [data-step]');
    if (st) { showImage(state.img + +st.dataset.step); return; }
    if (e.target.closest('#g-open')) {
      if (gm.dataset.swiped) { delete gm.dataset.swiped; return; }
      lb.openAt(state.img);
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) {
      const input = $('#qty');
      input.value = Math.max(1, Math.min(+input.max || 20, (+input.value || 1) + +q.dataset.q));
      return;
    }
    if (e.target.closest('#buy')) {
      const input = $('#qty');
      const qty = Math.max(1, Math.min(+input.max || 20, +input.value || 1));
      addToCart(p, { variant: state.variant, color: state.color, qty });
      const btn = $('#buy');
      btn.innerHTML = `${icons.check} Adicionado`;
      setTimeout(() => { if (stock() > 0) btn.textContent = 'Adicionar ao carrinho'; }, 1600);
    }
  });

  update();
  renderThumbs();
  // pré-carregar as fotos das outras cores para a troca ser imediata
  p.images.filter((i) => i.color_id).forEach((i) => { new Image().src = i.url; });

  // Relacionados: mesma categoria primeiro, depois mesma marca
  const rel = cat.products.filter((x) => x.id !== p.id && x.category_id === p.category_id)
    .concat(cat.products.filter((x) => x.id !== p.id && x.category_id !== p.category_id && x.brand_id === p.brand_id))
    .slice(0, 4);
  if (rel.length) $('#related').innerHTML = rel.map(cardHTML).join('');
  else $('#related-wrap').remove();

  reveal();
}
