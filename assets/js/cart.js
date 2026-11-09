// Carrinho guardado no navegador (localStorage)
const KEY = 'ep_cart_v1';
const MAX_QTY = 20;

const keyOf = (i) => `${i.product_id}|${i.variant_id || ''}|${i.color_id || ''}`;

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('cart:change', { detail: { count: count(items) } }));
}
function count(items = read()) { return items.reduce((s, i) => s + i.qty, 0); }

export const cart = {
  items: read,
  count: () => count(),
  add({ product_id, variant_id = null, color_id = null, qty = 1 }) {
    const items = read();
    const k = keyOf({ product_id, variant_id, color_id });
    const found = items.find((i) => keyOf(i) === k);
    if (found) found.qty = Math.min(MAX_QTY, found.qty + qty);
    else items.push({ product_id, variant_id, color_id, qty: Math.min(MAX_QTY, qty) });
    write(items);
  },
  setQty(key, qty) {
    const items = read();
    const it = items.find((i) => keyOf(i) === key);
    if (!it) return;
    it.qty = Math.max(1, Math.min(MAX_QTY, qty | 0));
    write(items);
  },
  remove(key) { write(read().filter((i) => keyOf(i) !== key)); },
  clear() { write([]); },
  key: keyOf,

  // Junta o carrinho com o catálogo (ignora produtos que já não existem)
  lines(cat) {
    const items = read();
    const out = [];
    for (const i of items) {
      const p = cat.byId.get(i.product_id);
      if (!p) continue;
      const v = i.variant_id ? p.variants.find((x) => x.id === i.variant_id) : null;
      if (i.variant_id && !v) continue;
      const c = i.color_id ? p.colors.find((x) => x.id === i.color_id) : null;
      const unit = v ? v.price : p.base_price;
      const img = (c && p.images.find((im) => im.color_id === c.id)) || p.images[0];
      out.push({ key: keyOf(i), product: p, variant: v, color: c, qty: i.qty, unit, total: unit * i.qty, image: img ? img.url : '/img/icone.png' });
    }
    return out;
  },
  totals(lines, settings) {
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const freeOver = Number(settings.free_shipping_over ?? 50);
    const shipping = subtotal === 0 || subtotal >= freeOver ? 0 : Number(settings.shipping_cost ?? 4.99);
    return { subtotal, shipping, total: subtotal + shipping, freeOver, missing: Math.max(0, freeOver - subtotal) };
  },
};

// Sincroniza entre separadores
window.addEventListener('storage', (e) => {
  if (e.key === KEY) window.dispatchEvent(new CustomEvent('cart:change', { detail: { count: count() } }));
});
