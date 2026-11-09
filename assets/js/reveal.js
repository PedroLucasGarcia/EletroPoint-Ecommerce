// Animação de entrada ao fazer scroll (mesma da Royal Lion):
// os elementos sobem 40px e aparecem quando entram no ecrã.
// As classes são adicionadas por JS, por isso sem JS o conteúdo continua visível.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      setTimeout(() => { el.style.transitionDelay = ''; }, 1200);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' })
  : null;

function watch(el) {
  if (reduce || !io) { el.classList.add('in'); return; }
  io.observe(el);
}

// Títulos de secção: descem (-40px → 0)
export function riseHead(sel, root = document) {
  root.querySelectorAll(sel).forEach((el) => {
    if (el.classList.contains('rv')) return;
    el.classList.add('rv', 'rv-down');
    watch(el);
  });
}

// Itens (cartões, linhas…): sobem com atraso escalonado
export function riseItems(sel, root = document) {
  let i = 0;
  root.querySelectorAll(sel).forEach((el) => {
    if (el.classList.contains('rv')) return;
    el.classList.add('rv');
    el.style.transitionDelay = `${Math.min(i, 5) * 0.1}s`;
    i += 1;
    watch(el);
  });
}

// Aplica o padrão a toda a página (chamar de novo após renderizar conteúdo)
export function reveal(root = document) {
  riseHead('.section-head, .page-title, .pdp-section h2', root);
  riseItems('.cat-card, .grid > .card, .benefit, .promo > a, .spec-group, .order, .cart-line, .footer-grid > div', root);
  riseItems('[data-rv]', root);
}
