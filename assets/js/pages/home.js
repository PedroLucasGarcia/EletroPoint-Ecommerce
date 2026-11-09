import { initLayout, cardHTML, skeletonCards, icons } from '../layout.js';
import { euro, esc, categoryUrl, mainImage } from '../store.js';
import { reveal } from '../reveal.js';

const $ = (s) => document.querySelector(s);
$('#featured').innerHTML = skeletonCards(8);

const cat = await initLayout();

// ---------- Carrossel (o original) ----------
function hero(slides) {
  const list = $('#slides');
  const section = list.closest('.carousel');
  if (!slides.length) { section.remove(); return; }
  list.innerHTML = slides.map((s, i) => `
    <div class="item${i + 1} item${i === 0 ? ' active' : ''}"${s.bg_color ? ` style="background:${esc(s.bg_color)}"` : ''} aria-roledescription="slide" aria-label="${i + 1} de ${slides.length}"${i ? ' aria-hidden="true"' : ''}>
      <div class="carousel-img"><img src="${esc(s.image_url)}" alt="${esc(s.title)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></div>
      <div class="carousel-content">
        ${s.link ? `<div class="button"><a class="btn" href="${esc(s.link)}" title="Saiba mais">${esc(s.cta_label || 'Saiba mais')}</a></div>` : ''}
        ${s.price_label || s.subtitle ? `<p class="price"${s.text_color ? ` style="color:${esc(s.text_color)}"` : ''}>${esc(s.price_label || s.subtitle)}</p>` : ''}
      </div>
    </div>`).join('');
  section.classList.remove('skeleton');
  if (slides.length < 2) return;

  section.insertAdjacentHTML('beforeend', `
    <div class="arrows">
      <button class="arrow-btn" id="prev-btn" type="button" aria-label="Anterior">${icons.prev}</button>
      <button class="arrow-btn" id="next-btn" type="button" aria-label="Seguinte">${icons.next}</button>
    </div>
    <div class="indicators"><div class="dots">${slides.map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" type="button" aria-label="Destaque ${i + 1}"></button>`).join('')}</div></div>`);

  const items = [...list.children];
  const dots = [...section.querySelectorAll('.dot')];
  let cur = 0;
  let timer;
  const go = (n) => {
    cur = (n + items.length) % items.length;
    items.forEach((el, i) => { el.classList.toggle('active', i === cur); el.setAttribute('aria-hidden', String(i !== cur)); });
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  };
  const play = () => { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(cur + 1), 5000); };
  section.querySelector('#prev-btn').addEventListener('click', () => { go(cur - 1); play(); });
  section.querySelector('#next-btn').addEventListener('click', () => { go(cur + 1); play(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); play(); }));
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : play()));

  // deslizar no telemóvel
  let x0 = null;
  section.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  section.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); play(); }
    x0 = null;
  });
  play();
}

hero(cat.slides);

// ---------- Categorias ----------
$('#categories').innerHTML = cat.categories.map((c) => {
  const first = cat.products.find((p) => p.category_id === c.id);
  const img = c.image_url || (first ? mainImage(first).url : '/img/icone.png');
  return `<a class="cat-card" href="${categoryUrl(c)}"><img src="${esc(img)}" alt="" loading="lazy"><h3>${esc(c.name)}</h3><span>${c.count} ${c.count === 1 ? 'produto' : 'produtos'}</span></a>`;
}).join('');

// ---------- Vantagens ----------
const benefits = [
  ['#benefit-shipping', icons.truck, 'Envio grátis', `Em encomendas acima de ${euro(cat.settings.free_shipping_over)}`],
  ['#benefit-return', icons.return, '14 dias para devolver', 'Sem perguntas, sem complicações'],
  ['#benefit-warranty', icons.shield, 'Garantia de 3 anos', 'Em todos os equipamentos'],
  ['#benefit-pay', icons.card, 'Pagamento seguro', 'MB WAY, Multibanco e transferência'],
];
benefits.forEach(([sel, ic, b, s]) => { $(sel).innerHTML = `${ic}<div><b>${b}</b><span>${esc(s)}</span></div>`; });

// ---------- Destaques ----------
let featured = cat.products.filter((p) => p.featured);
if (featured.length < 8) featured = featured.concat(cat.products.filter((p) => !p.featured)).slice(0, 8);
$('#featured').innerHTML = featured.slice(0, 8).map(cardHTML).join('');

reveal();
