import { initLayout, emptyState, icons } from '../layout.js';
import { esc, euro, productUrl } from '../store.js';
import { cart } from '../cart.js';
import { reveal } from '../reveal.js';

const host = document.getElementById('cart');
const cat = await initLayout();

function summaryHTML(lines, t, { button = true } = {}) {
  const pct = t.freeOver > 0 ? Math.min(100, (t.subtotal / t.freeOver) * 100) : 100;
  return `
    <h2>Resumo</h2>
    <div class="sum-row"><span>Subtotal (${lines.reduce((s, l) => s + l.qty, 0)} artigos)</span><span>${euro(t.subtotal)}</span></div>
    <div class="sum-row"><span>Envio</span><span>${t.shipping ? euro(t.shipping) : 'Grátis'}</span></div>
    <div class="free-bar">
      ${t.missing > 0 ? `Faltam <b>${euro(t.missing)}</b> para envio grátis.` : 'Tem envio grátis nesta encomenda.'}
      <div class="bar"><i style="width:${pct}%"></i></div>
    </div>
    <div class="sum-row total"><span>Total</span><span>${euro(t.total)}</span></div>
    <p class="muted" style="font-size:13px">IVA incluído à taxa legal em vigor.</p>
    ${button ? `<a class="btn btn-lg btn-block" href="/checkout.html">Finalizar compra</a>
    <a class="btn btn-ghost btn-block" href="/categoria.html" style="margin-top:10px">Continuar a comprar</a>` : ''}`;
}

function lineHTML(l) {
  const meta = [l.variant?.label, l.color?.name].filter(Boolean).map(esc).join(' · ');
  const max = Math.max(1, Math.min(20, l.variant ? l.variant.stock : l.product.stock));
  return `
    <article class="cart-line" data-key="${esc(l.key)}">
      <a class="thumb" href="${productUrl(l.product)}"><img src="${esc(l.image)}" alt="" loading="lazy"></a>
      <div>
        <h3><a href="${productUrl(l.product)}">${esc(l.product.name)}</a></h3>
        <div class="meta">${meta ? `${meta} · ` : ''}${euro(l.unit)} / un.</div>
        <div class="line-actions">
          <div class="qty sm" aria-label="Quantidade">
            <button type="button" data-step="-1" aria-label="Diminuir"${l.qty <= 1 ? ' disabled' : ''}>−</button>
            <input type="number" min="1" max="${max}" value="${l.qty}" inputmode="numeric" aria-label="Quantidade">
            <button type="button" data-step="1" aria-label="Aumentar"${l.qty >= max ? ' disabled' : ''}>+</button>
          </div>
          <button type="button" class="remove">Remover</button>
        </div>
      </div>
      <div class="line-total">${euro(l.total)}</div>
    </article>`;
}

let first = true;
function render() {
  const lines = cart.lines(cat);
  if (!lines.length) {
    host.innerHTML = emptyState({
      title: 'O carrinho está vazio',
      text: 'Ainda não adicionou nenhum produto. Explore as novidades e encontre o próximo equipamento.',
      cta: { href: '/categoria.html', label: 'Ver produtos' },
      icon: icons.bag,
    });
    reveal();
    return;
  }
  const t = cart.totals(lines, cat.settings);
  if (first || !host.querySelector('.cart-layout')) {
    host.innerHTML = `
      <div class="cart-layout">
        <div class="cart-list" id="cart-list"></div>
        <aside class="summary" data-rv id="summary"></aside>
      </div>`;
  }
  const list = host.querySelector('#cart-list');
  // Atualiza sem reconstruir tudo (mantém as animações de entrada já feitas)
  const keys = new Set(lines.map((l) => l.key));
  list.querySelectorAll('.cart-line').forEach((el) => { if (!keys.has(el.dataset.key)) el.remove(); });
  lines.forEach((l) => {
    const old = list.querySelector(`.cart-line[data-key="${CSS.escape(l.key)}"]`);
    const tmp = document.createElement('div');
    tmp.innerHTML = lineHTML(l).trim();
    const el = tmp.firstElementChild;
    if (old) { el.classList.add('in'); old.replaceWith(el); } else list.append(el);
  });
  host.querySelector('#summary').innerHTML = summaryHTML(lines, t);
  first = false;
  reveal();
}

host.addEventListener('click', (e) => {
  const line = e.target.closest('.cart-line');
  if (!line) return;
  const key = line.dataset.key;
  const step = e.target.closest('[data-step]');
  if (step) {
    const input = line.querySelector('input');
    cart.setQty(key, Math.max(1, Math.min(+input.max || 20, (+input.value || 1) + +step.dataset.step)));
    return;
  }
  if (e.target.closest('.remove')) {
    line.classList.add('removing');
    setTimeout(() => cart.remove(key), 420);
  }
});
host.addEventListener('change', (e) => {
  const input = e.target.closest('.cart-line input');
  if (!input) return;
  const key = input.closest('.cart-line').dataset.key;
  cart.setQty(key, Math.max(1, Math.min(+input.max || 20, Math.round(+input.value) || 1)));
});

window.addEventListener('cart:change', render);
render();
