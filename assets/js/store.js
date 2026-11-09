// Camada de dados: Supabase quando configurado, senão /data/catalog.json
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const hasBackend = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const CACHE_KEY = 'ep_catalog_v7';
const CACHE_TTL = 60_000;

let clientPromise = null;
export function supabase() {
  if (!hasBackend) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }));
  }
  return clientPromise;
}

const DEFAULT_SETTINGS = { shipping_cost: 4.99, free_shipping_over: 50, store_name: 'EletroPoint', currency: 'EUR' };

async function loadRaw() {
  if (!hasBackend) {
    const res = await fetch('/data/catalog.json');
    if (!res.ok) throw new Error('Não foi possível carregar o catálogo');
    return res.json();
  }
  const sb = await supabase();
  const tables = ['categories', 'brands', 'products', 'product_colors', 'product_variants', 'product_images', 'slides', 'banners', 'settings'];
  const results = await Promise.all(tables.map((t) => sb.from(t).select('*')));
  const out = {};
  results.forEach((r, i) => {
    if (r.error) throw r.error;
    out[tables[i]] = r.data;
  });
  const store = (out.settings || []).find((s) => s.key === 'store');
  out.settings = store ? store.value : {};
  return out;
}

const byPos = (a, b) => (a.position ?? 0) - (b.position ?? 0);

function build(raw) {
  const settings = { ...DEFAULT_SETTINGS, ...(Array.isArray(raw.settings) ? {} : raw.settings || {}) };
  const categories = (raw.categories || []).filter((c) => c.active !== false).sort(byPos);
  const brands = (raw.brands || []).slice().sort(byPos);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const group = (rows) => {
    const m = new Map();
    (rows || []).slice().sort(byPos).forEach((r) => {
      if (!m.has(r.product_id)) m.set(r.product_id, []);
      m.get(r.product_id).push(r);
    });
    return m;
  };
  const colors = group(raw.product_colors);
  const variants = group(raw.product_variants);
  const images = group(raw.product_images);

  const products = (raw.products || [])
    .filter((p) => p.active !== false && catById.has(p.category_id))
    .map((p) => {
      const v = variants.get(p.id) || [];
      const prices = v.length ? v.map((x) => +x.price) : [+p.base_price];
      const stock = v.length ? v.reduce((s, x) => s + (x.stock || 0), 0) : p.stock || 0;
      return {
        ...p,
        base_price: +p.base_price,
        compare_at_price: p.compare_at_price ? +p.compare_at_price : null,
        specs: Array.isArray(p.specs) ? p.specs : [],
        category: catById.get(p.category_id),
        brand: brandById.get(p.brand_id) || null,
        colors: colors.get(p.id) || [],
        variants: v.map((x) => ({ ...x, price: +x.price })),
        images: images.get(p.id) || [],
        min_price: Math.min(...prices),
        total_stock: stock,
      };
    });

  // cor mostrada no cartão: evita que produtos diferentes da mesma marca mostrem a mesma cor (ex.: S25 e S25+)
  const used = new Map();
  const key = (s) => norm(s).replace(/[^a-z]/g, '');
  products.forEach((p) => {
    const withImg = p.colors.filter((c) => p.images.some((i) => i.color_id === c.id));
    if (!withImg.length) return;
    const k = `${p.brand_id}|${p.category_id}`;
    if (!used.has(k)) used.set(k, new Map());
    const seen = used.get(k);
    const pick = withImg.slice().sort((a, b) => (seen.get(key(a.name)) || 0) - (seen.get(key(b.name)) || 0))[0];
    seen.set(key(pick.name), (seen.get(key(pick.name)) || 0) + 1);
    p.card_color_id = pick.id;
  });

  // contagem de produtos por categoria e marcas presentes em cada categoria
  categories.forEach((c) => {
    const list = products.filter((p) => p.category_id === c.id);
    c.count = list.length;
    const ids = new Set(list.map((p) => p.brand_id));
    c.brands = brands.filter((b) => ids.has(b.id));
  });

  return {
    settings,
    categories,
    brands,
    products,
    slides: (raw.slides || []).filter((s) => s.active !== false).sort(byPos),
    banners: raw.banners || [],
    byId: new Map(products.map((p) => [p.id, p])),
    bySlug: new Map(products.map((p) => [p.slug, p])),
    catBySlug: new Map(categories.map((c) => [c.slug, c])),
    brandBySlug: new Map(brands.map((b) => [b.slug, b])),
  };
}

let catalogPromise = null;
export function catalog() {
  if (catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.t < CACHE_TTL && cached.backend === hasBackend) return build(cached.raw);
    } catch { /* sem cache */ }
    const raw = await loadRaw();
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), backend: hasBackend, raw })); } catch { /* cheio */ }
    return build(raw);
  })();
  catalogPromise.catch(() => { catalogPromise = null; });
  return catalogPromise;
}

export function clearCatalogCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  catalogPromise = null;
}

// ---------- utilitários ----------
const fmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
export const euro = (n) => fmt.format(Number(n) || 0);
export const productUrl = (p) => `/produto.html?slug=${encodeURIComponent(p.slug)}`;
export const categoryUrl = (c, b) => `/categoria.html?c=${encodeURIComponent(c.slug)}${b ? `&marca=${encodeURIComponent(b.slug)}` : ''}`;
export const mainImage = (p, colorId) => {
  const imgs = p.images || [];
  const cid = colorId || p.card_color_id;
  return (cid && imgs.find((i) => i.color_id === cid)) || imgs[0] || { url: '/img/icone.png', alt: p.name };
};
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const params = () => new URLSearchParams(location.search);

// ---------- autenticação ----------
export async function getSession() {
  const sb = await supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}
export async function getUser() {
  const s = await getSession();
  return s ? s.user : null;
}
export async function onAuthChange(cb) {
  const sb = await supabase();
  if (!sb) return;
  sb.auth.onAuthStateChange((_e, session) => cb(session ? session.user : null));
}
export async function signOut() {
  const sb = await supabase();
  if (sb) await sb.auth.signOut();
}

// Mensagens de erro do Supabase em português
export function authError(err) {
  const m = String(err?.message || err || '');
  if (/invalid login credentials/i.test(m)) return 'Email ou palavra-passe incorretos.';
  if (/email not confirmed/i.test(m)) return 'Confirme o seu email antes de entrar (verifique a caixa de entrada).';
  if (/already registered|already been registered/i.test(m)) return 'Já existe uma conta com este email.';
  if (/password should be at least/i.test(m)) return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  if (/rate limit|too many/i.test(m)) return 'Demasiadas tentativas. Aguarde um pouco e tente novamente.';
  if (/network|fetch/i.test(m)) return 'Sem ligação ao servidor. Verifique a sua internet.';
  return m || 'Ocorreu um erro. Tente novamente.';
}
