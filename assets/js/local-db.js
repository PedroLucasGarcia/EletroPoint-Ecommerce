// Base de dados local (modo demonstração, sem Supabase).
// Guarda encomendas e compradores no localStorage deste navegador,
// com a mesma forma das tabelas orders / customers do Supabase.
const ORDERS = 'ep_orders';
const CUSTOMERS = 'ep_customers';

const read = (k) => {
  try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const round = (n) => Math.round(n * 100) / 100;

const CUSTOMER_FIELDS = ['name', 'phone', 'nif', 'address', 'postal_code', 'city', 'country'];

// Atualiza (ou cria) o comprador a partir de uma encomenda
function upsertCustomer(list, order) {
  const email = order.email;
  let c = list.find((x) => x.email === email);
  const now = order.created_at;
  if (!c) {
    c = { id: uid(), email, orders_count: 0, total_spent: 0, first_order_at: now, created_at: now };
    list.push(c);
  }
  for (const f of CUSTOMER_FIELDS) c[f] = order.customer[f] || '';
  c.orders_count += 1;
  c.total_spent = round(c.total_spent + order.total);
  c.last_order_at = now;
  c.updated_at = now;
  return c;
}

/** Regista uma encomenda. lines = cart.lines(cat); totals = cart.totals(...); form = dados do formulário */
export function saveOrder(lines, totals, form) {
  const orders = read(ORDERS);
  const customers = read(CUSTOMERS);
  const number = orders.reduce((m, o) => Math.max(m, Number(o.number) || 0), 1000) + 1;
  const email = String(form.email || '').trim().toLowerCase();
  const customer = {
    email,
    name: String(form.name || '').trim(),
    phone: form.phone || '',
    nif: form.nif || '',
    address: String(form.address || '').trim(),
    postal_code: form.postal_code || '',
    city: form.city || '',
    country: form.country || 'Portugal',
  };
  const items = lines.map((l) => ({
    product_id: l.product.id,
    slug: l.product.slug,
    name: l.product.name,
    variant_id: l.variant?.id || null,
    variant: l.variant?.label || null,
    color_id: l.color?.id || null,
    color: l.color?.name || null,
    qty: l.qty,
    unit_price: round(l.unit),
    line_total: round(l.total),
  }));
  const order = {
    id: uid(),
    number,
    created_at: new Date().toISOString(),
    email,
    customer,
    items,
    subtotal: round(totals.subtotal),
    shipping: round(totals.shipping),
    total: round(totals.total),
    payment_method: form.payment_method,
    status: 'pendente',
    notes: String(form.notes || '').slice(0, 1000),
  };
  order.customer_id = upsertCustomer(customers, order).id;
  orders.push(order);
  if (!write(ORDERS, orders) || !write(CUSTOMERS, customers)) throw new Error('Não foi possível guardar a encomenda neste navegador.');
  return order;
}

export const listOrders = () => read(ORDERS).sort((a, b) => b.created_at.localeCompare(a.created_at));
export const listCustomers = () => read(CUSTOMERS).sort((a, b) => (b.last_order_at || '').localeCompare(a.last_order_at || ''));

export function updateOrder(id, patch) {
  const orders = read(ORDERS);
  const o = orders.find((x) => x.id === id);
  if (!o) return false;
  Object.assign(o, patch);
  return write(ORDERS, orders);
}

export function deleteOrder(id) {
  const orders = read(ORDERS);
  const o = orders.find((x) => x.id === id);
  if (!o) return false;
  write(ORDERS, orders.filter((x) => x.id !== id));
  // recalcula os totais do comprador
  const customers = read(CUSTOMERS);
  const c = customers.find((x) => x.email === o.email);
  if (c) {
    c.orders_count = Math.max(0, c.orders_count - 1);
    c.total_spent = round(Math.max(0, c.total_spent - o.total));
    write(CUSTOMERS, customers);
  }
  return true;
}
