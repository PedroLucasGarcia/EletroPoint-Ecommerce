// Painel de administração EletroPoint
// Segurança: o acesso real é garantido pelas políticas RLS do Supabase (tabela `admins`).
// Este ficheiro só esconde a interface a quem não tem permissão.
import { hasBackend, supabase, clearCatalogCache, euro, esc, norm, authError, productUrl } from '/assets/js/store.js';
import { toast, icons } from '/assets/js/layout.js';
import { reveal } from '/assets/js/reveal.js';
import { listOrders, listCustomers, updateOrder, deleteOrder } from '/assets/js/local-db.js';
import { authCard, pwField, wirePasswordToggles, showAlert, busy } from '/assets/js/auth-ui.js';

const app = document.getElementById('app');
const BUCKET = 'product-images';
const STATUS = { pendente: 'Pendente', pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
const PAY = { mbway: 'MB WAY', multibanco: 'Multibanco', transferencia: 'Transferência', entrega: 'Pagamento na entrega' };
const dt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dShort = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

const ic = {
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
};

// ---------- utilitários ----------
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const int = (v) => Math.max(0, parseInt(v, 10) || 0);
const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
const byPos = (arr) => [...arr].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
const nextPos = (arr) => arr.reduce((m, x) => Math.max(m, (x.position ?? 0) + 1), 0);
const uuid = () => crypto.randomUUID();
const loader = '<div class="page-loader"><div class="spinner dark"></div></div>';
const stall = () => new Promise(() => {});

function friendly(err) {
  if (!err) return 'Erro desconhecido.';
  if (err.code === '23505') return 'Já existe um registo com esse valor (slug, email ou combinação repetida).';
  if (err.code === '42501' || /row-level security|permission/i.test(err.message || '')) return 'Sem permissão para esta operação.';
  if (err.code === '23503') return 'Este registo está a ser usado noutro sítio.';
  return err.message || String(err);
}

// ---------- arranque e controlo de acesso ----------
const sb = await supabase();
let me = { email: 'demonstração', role: 'owner' };

if (sb) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { loginScreen(); await stall(); }
  const email = (session.user.email || '').toLowerCase();
  const { data: row } = await sb.from('admins').select('email,role').eq('email', email).maybeSingle();
  if (!row) { deniedScreen(email); await stall(); }
  me = row;
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') location.reload(); });
}

function loginScreen() {
  app.innerHTML = `<div class="denied">${authCard({
    title: 'Área reservada.',
    text: 'Entre com uma conta autorizada para gerir a loja.',
    body: `
      <form id="form" novalidate>
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="160"></div>
        ${pwField('password', 'Palavra-passe', 'current-password')}
        <div class="alert" id="msg" role="alert"></div>
        <button class="btn btn-lg btn-block" type="submit" id="submit">Entrar</button>
      </form>`,
    alt: '<a href="/reset-password.html">Esqueceu a palavra-passe?</a> · <a href="/">Voltar à loja</a>',
  })}</div>`;
  reveal(app);
  wirePasswordToggles(app);
  const form = app.querySelector('#form');
  const msg = app.querySelector('#msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await busy(form.querySelector('#submit'), async () => {
      const { error } = await sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
      if (error) return showAlert(msg, authError(error));
      location.reload();
    });
  });
}

function deniedScreen(email) {
  app.innerHTML = `<div class="denied">${authCard({
    title: 'Sem acesso.',
    text: `A conta ${esc(email)} não tem permissão para o painel. Peça ao dono da loja para o adicionar em “Acessos”.`,
    body: '<button class="btn btn-block btn-light" type="button" id="out">Terminar sessão</button>',
    alt: '<a href="/">Voltar à loja</a>',
  })}</div>`;
  reveal(app);
  app.querySelector('#out').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
}

// ---------- dados ----------
let D = null;
async function loadAll() {
  if (!sb) {
    const raw = await fetch('/data/catalog.json', { cache: 'no-store' }).then((r) => r.json());
    return { ...raw, settings: raw.settings || {} };
  }
  const tables = ['categories', 'brands', 'products', 'product_colors', 'product_variants', 'product_images', 'slides', 'banners', 'settings'];
  const res = await Promise.all(tables.map((t) => sb.from(t).select('*')));
  const out = {};
  res.forEach((r, i) => {
    if (r.error) throw r.error;
    out[tables[i]] = r.data;
  });
  out.settings = out.settings.find((s) => s.key === 'store')?.value || {};
  return out;
}
async function reload() {
  clearCatalogCache();
  D = await loadAll();
}

// Escreve no Supabase; em modo demonstração apenas avisa
async function write(fn) {
  if (!sb) {
    toast('Modo de demonstração: ligue o Supabase para guardar alterações.', { error: true });
    return false;
  }
  try {
    const { error } = await fn(sb);
    if (error) throw error;
    clearCatalogCache();
    return true;
  } catch (err) {
    toast(friendly(err), { error: true, timeout: 6000 });
    return false;
  }
}
const must = async (q) => { const { data, error } = await q; if (error) throw error; return data; };

async function upload(file, folder) {
  if (!sb) { toast('Modo de demonstração: o envio de fotos precisa do Supabase.', { error: true }); return null; }
  if (!file.type.startsWith('image/')) { toast(`${file.name} não é uma imagem.`, { error: true }); return null; }
  if (file.size > 5 * 1024 * 1024) { toast(`${file.name} tem mais de 5 MB.`, { error: true }); return null; }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folder}/${uuid()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) { toast(friendly(error), { error: true }); return null; }
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
const storagePath = (url) => {
  const part = String(url || '').split(`/storage/v1/object/public/${BUCKET}/`)[1];
  return part ? decodeURIComponent(part.split('?')[0]) : null;
};
async function removeFiles(urls) {
  const paths = urls.map(storagePath).filter(Boolean);
  if (sb && paths.length) await sb.storage.from(BUCKET).remove(paths).catch(() => {});
}

app.innerHTML = loader;
try { D = await loadAll(); } catch (err) {
  app.innerHTML = `<div class="denied"><div class="auth-card"><h1>Erro.</h1><p>Não foi possível carregar os dados: ${esc(friendly(err))}</p><a class="btn" href="/admin/">Tentar de novo</a></div></div>`;
  await stall();
}

// ---------- estrutura ----------
const NAV = [
  ['painel', 'Painel'],
  ['produtos', 'Produtos'],
  ['categorias', 'Categorias'],
  ['marcas', 'Marcas'],
  ['destaques', 'Destaques'],
  ['banners', 'Banners'],
  ['encomendas', 'Encomendas'],
  ['clientes', 'Clientes'],
  ['definicoes', 'Definições'],
  ...(me.role === 'owner' ? [['acessos', 'Acessos']] : []),
];

app.innerHTML = `
  <div class="adm">
    <aside class="adm-side" id="side">
      <a class="adm-brand" href="#painel">EletroPoint <small>Admin</small></a>
      ${NAV.map(([k, l]) => `<button type="button" data-go="${k}">${l}</button>`).join('')}
      <span class="sep"></span>
      <a href="/" target="_blank" rel="noopener">Ver loja ↗</a>
      ${sb ? '<button type="button" data-logout>Terminar sessão</button>' : ''}
      <div class="who"><b>${esc(me.email)}</b>${me.role === 'owner' ? 'Dono' : 'Editor'}</div>
    </aside>
    <main class="adm-main">
      ${sb ? '' : '<div class="demo-bar"><b>Modo de demonstração.</b> Produtos lidos de <code>/data/catalog.json</code>; encomendas e clientes guardados apenas neste navegador. Para uma base de dados real, ligue a loja ao Supabase (ver README).</div>'}
      <div class="adm-top">
        <button class="icon-btn adm-menu" type="button" aria-label="Menu" id="menu">${icons.menu}</button>
        <h1 id="title"></h1>
        <div class="actions" id="actions"></div>
      </div>
      <div id="view"></div>
    </main>
  </div>`;

const shell = app.querySelector('.adm');
const view = app.querySelector('#view');
const titleEl = app.querySelector('#title');
const actions = app.querySelector('#actions');

app.querySelector('#side').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.go) location.hash = b.dataset.go;
  if (b.hasAttribute('data-logout')) { await sb.auth.signOut(); location.reload(); }
});
app.querySelector('#menu').addEventListener('click', () => shell.classList.toggle('nav-open'));

// ---------- router ----------
let guard = null;         // função que devolve true se houver alterações por guardar
let current = location.hash;
const ROUTES = {
  painel: ['Painel', dashboard],
  produtos: ['Produtos', productsView],
  produto: ['Produto', productEditor],
  categorias: ['Categorias', () => crudView('categorias')],
  marcas: ['Marcas', () => crudView('marcas')],
  destaques: ['Destaques da página inicial', () => crudView('destaques')],
  banners: ['Banners de marca', () => crudView('banners')],
  encomendas: ['Encomendas', ordersView],
  clientes: ['Clientes', customersView],
  definicoes: ['Definições da loja', settingsView],
  acessos: ['Acessos ao painel', accessView],
};

function route() {
  if (guard && guard() && !confirm('Tem alterações por guardar. Sair mesmo assim?')) {
    history.replaceState(null, '', current);
    return;
  }
  guard = null;
  current = location.hash;
  const [name, arg] = (location.hash.slice(1) || 'painel').split('/');
  const key = ROUTES[name] && (name !== 'acessos' || me.role === 'owner') ? name : 'painel';
  const navKey = key === 'produto' ? 'produtos' : key;
  app.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('active', b.dataset.go === navKey));
  shell.classList.remove('nav-open');
  titleEl.textContent = ROUTES[key][0];
  document.title = `${ROUTES[key][0]} — Admin EletroPoint`;
  actions.innerHTML = '';
  view.innerHTML = '';
  ROUTES[key][1](arg);
  reveal(view);
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', (e) => { if (guard && guard()) { e.preventDefault(); e.returnValue = ''; } });

// ---------- diálogo genérico ----------
function openDialog({ title, body, onSave, onDelete, saveLabel = 'Guardar', onOpen }) {
  const d = document.createElement('dialog');
  d.className = 'dlg';
  d.innerHTML = `
    <form novalidate>
      <h2>${esc(title)}</h2>
      ${body}
      <div class="dlg-foot">
        ${onDelete ? '<button type="button" class="btn btn-sm btn-danger left" data-del>Eliminar</button>' : ''}
        <button type="button" class="btn btn-sm btn-light" data-close>${onSave ? 'Cancelar' : 'Fechar'}</button>
        ${onSave ? `<button class="btn btn-sm" type="submit">${esc(saveLabel)}</button>` : ''}
      </div>
    </form>`;
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  const form = d.querySelector('form');
  d.querySelector('[data-close]').addEventListener('click', () => d.close());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const ok = await onSave(form).catch((err) => { toast(friendly(err), { error: true }); return false; });
    btn.disabled = false;
    if (ok !== false) d.close();
  });
  d.querySelector('[data-del]')?.addEventListener('click', async (e) => {
    if (!confirm('Eliminar definitivamente? Esta ação não pode ser desfeita.')) return;
    e.target.disabled = true;
    const ok = await onDelete();
    e.target.disabled = false;
    if (ok !== false) d.close();
  });
  onOpen?.(form);
  d.showModal();
  return d;
}

// ---------- campos genéricos ----------
function fieldHTML(f, v) {
  const span = f.span ? ' span2' : '';
  const lab = `<span>${esc(f.label)}${f.hint ? ` <small>${esc(f.hint)}</small>` : ''}</span>`;
  const req = f.req ? ' required' : '';
  switch (f.type) {
    case 'textarea':
      return `<label class="f${span}">${lab}<textarea name="${f.k}" maxlength="${f.max || 4000}">${esc(v ?? '')}</textarea></label>`;
    case 'bool':
      return `<label class="toggle${span}" style="align-self:end;padding-bottom:8px"><input type="checkbox" name="${f.k}"${v ? ' checked' : ''}> ${esc(f.label)}</label>`;
    case 'select':
      return `<label class="f${span}">${lab}<select name="${f.k}"${req}>${f.empty ? `<option value="">${esc(f.empty)}</option>` : ''}${f.options().map((o) => `<option value="${esc(o.value)}"${o.value === v ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    case 'image':
      return `<div class="f span2">${lab}
        <div style="display:flex;gap:8px"><input name="${f.k}" value="${esc(v ?? '')}" placeholder="https://… ou /img/…"${req}>
        <label class="btn btn-sm btn-light" style="cursor:pointer;flex:none">${ic.upload.replace('<svg', '<svg width="16" height="16"')} Carregar<input type="file" accept="image/*" hidden data-upload="${f.k}"></label></div>
        <img class="preview-img" data-prev="${f.k}" alt=""${v ? ` src="${esc(v)}"` : ' hidden'}></div>`;
    case 'svg':
      return `<label class="f span2">${lab}<textarea name="${f.k}" spellcheck="false" style="font-family:monospace;font-size:13px" maxlength="40000">${esc(v ?? '')}</textarea>
        <div class="svg-prev" data-svgprev="${f.k}"></div></label>`;
    default:
      return `<label class="f${span}">${lab}<input name="${f.k}" type="${f.type || 'text'}"${f.type === 'number' ? ` step="${f.step || 1}" min="0"` : ''} value="${esc(v ?? '')}" maxlength="${f.max || 300}"${req}${f.ph ? ` placeholder="${esc(f.ph)}"` : ''}></label>`;
  }
}

function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.k];
    if (!el) continue;
    if (f.type === 'bool') out[f.k] = el.checked;
    else if (f.type === 'number') out[f.k] = f.int ? int(el.value) : num(el.value);
    else if (f.type === 'select') out[f.k] = el.value || null;
    else out[f.k] = el.value.trim();
  }
  return out;
}

const svgData = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function wireFields(form, folder, { slugFrom } = {}) {
  let slugTouched = !!(form.elements.slug && form.elements.slug.value);
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (slugFrom && t.name === slugFrom && !slugTouched && form.elements.slug) form.elements.slug.value = slugify(t.value);
    if (t.name === 'slug') slugTouched = true;
    const prev = form.querySelector(`[data-prev="${t.name}"]`);
    if (prev) { prev.hidden = !t.value; if (t.value) prev.src = t.value; }
    const sp = form.querySelector(`[data-svgprev="${t.name}"]`);
    if (sp) sp.innerHTML = t.value.trim() ? `<img src="${svgData(t.value.trim())}" alt="" style="height:40px;max-width:140px"> Pré-visualização` : '';
  });
  form.querySelectorAll('[data-svgprev]').forEach((sp) => {
    const v = form.elements[sp.dataset.svgprev].value.trim();
    if (v) sp.innerHTML = `<img src="${svgData(v)}" alt="" style="height:40px;max-width:140px"> Pré-visualização`;
  });
  form.querySelectorAll('[data-upload]').forEach((inp) => inp.addEventListener('change', async () => {
    const file = inp.files[0];
    if (!file) return;
    const label = inp.closest('label');
    label.style.opacity = '.5';
    const url = await upload(file, folder);
    label.style.opacity = '';
    inp.value = '';
    if (!url) return;
    const target = form.elements[inp.dataset.upload];
    target.value = url;
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }));
}

// ---------- entidades simples ----------
const catOpts = () => byPos(D.categories).map((c) => ({ value: c.id, label: c.name }));
const brandOpts = () => [...D.brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.id, label: b.name }));
const catName = (id) => D.categories.find((c) => c.id === id)?.name || '—';
const brandName = (id) => D.brands.find((b) => b.id === id)?.name || '—';
const countBy = (k, id) => D.products.filter((p) => p[k] === id).length;
const thumb = (url) => (url ? `<img class="thumb" src="${esc(url)}" alt="" loading="lazy">` : '<span class="thumb"></span>');
const pill = (on, a = 'Ativo', b = 'Inativo') => `<span class="pill${on ? ' on' : ''}">${on ? a : b}</span>`;

const ENT = {
  categorias: {
    table: 'categories', one: 'categoria', newLabel: 'Nova categoria', folder: 'categories', slugFrom: 'name',
    head: ['', 'Nome', 'Produtos', 'Ordem', 'Estado'],
    cells: (r) => `<td>${thumb(r.image_url)}</td><td class="name"><b>${esc(r.name)}</b><small>/${esc(r.slug)}</small></td><td class="num">${countBy('category_id', r.id)}</td><td class="num">${r.position ?? 0}</td><td>${pill(r.active !== false)}</td>`,
    fields: [
      { k: 'name', label: 'Nome', req: true },
      { k: 'slug', label: 'Slug', hint: 'usado no URL', req: true },
      { k: 'description', label: 'Descrição', type: 'textarea', span: true },
      { k: 'image_url', label: 'Imagem', type: 'image' },
      { k: 'position', label: 'Ordem', type: 'number', int: true },
      { k: 'active', label: 'Visível na loja', type: 'bool' },
    ],
    defaults: () => ({ active: true, position: nextPos(D.categories) }),
    sort: byPos,
    del: (r) => countBy('category_id', r.id) ? `Há ${countBy('category_id', r.id)} produto(s) nesta categoria. Ficarão sem categoria.` : '',
  },
  marcas: {
    table: 'brands', one: 'marca', newLabel: 'Nova marca', slugFrom: 'name',
    head: ['Logótipo', 'Nome', 'Produtos', 'Ordem'],
    cells: (r) => `<td>${r.logo_svg ? `<img src="${svgData(r.logo_svg)}" alt="" style="height:26px;max-width:90px">` : '—'}</td><td class="name"><b>${esc(r.name)}</b><small>${esc(r.slug)}</small></td><td class="num">${countBy('brand_id', r.id)}</td><td class="num">${r.position ?? 0}</td>`,
    fields: [
      { k: 'name', label: 'Nome', req: true },
      { k: 'slug', label: 'Slug', req: true },
      { k: 'position', label: 'Ordem', type: 'number', int: true },
      { k: 'logo_svg', label: 'Logótipo (código SVG)', type: 'svg', hint: 'cole o conteúdo de um ficheiro .svg' },
    ],
    defaults: () => ({ position: nextPos(D.brands) }),
    sort: (a) => [...a].sort((x, y) => x.name.localeCompare(y.name)),
    del: (r) => countBy('brand_id', r.id) ? `Há ${countBy('brand_id', r.id)} produto(s) desta marca. Ficarão sem marca.` : '',
  },
  destaques: {
    table: 'slides', one: 'destaque', newLabel: 'Novo destaque', folder: 'slides',
    head: ['', 'Título', 'Preço', 'Ordem', 'Estado'],
    cells: (r) => `<td>${thumb(r.image_url)}</td><td class="name"><b>${esc(r.title)}</b><small>${esc(r.link || '')}</small></td><td>${esc(r.price_label || '')}</td><td class="num">${r.position ?? 0}</td><td>${pill(r.active !== false)}</td>`,
    fields: [
      { k: 'title', label: 'Título', req: true },
      { k: 'price_label', label: 'Texto de preço', ph: 'Desde 999 €' },
      { k: 'link', label: 'Ligação', ph: '/produto.html?slug=…', span: true },
      { k: 'image_url', label: 'Imagem', type: 'image', req: true },
      { k: 'bg_color', label: 'Cor de fundo', type: 'color' },
      { k: 'text_color', label: 'Cor do texto', type: 'color' },
      { k: 'position', label: 'Ordem', type: 'number', int: true },
      { k: 'active', label: 'Visível', type: 'bool' },
    ],
    defaults: () => ({ active: true, bg_color: '#000000', text_color: '#ffffff', position: nextPos(D.slides) }),
    sort: byPos,
  },
  banners: {
    table: 'banners', one: 'banner', newLabel: 'Novo banner', folder: 'banners',
    head: ['', 'Categoria', 'Marca', 'Texto alternativo'],
    cells: (r) => `<td>${thumb(r.image_url)}</td><td>${esc(catName(r.category_id))}</td><td>${esc(brandName(r.brand_id))}</td><td>${esc(r.alt || '')}</td>`,
    fields: [
      { k: 'category_id', label: 'Categoria', type: 'select', options: catOpts, req: true },
      { k: 'brand_id', label: 'Marca', type: 'select', options: brandOpts, req: true },
      { k: 'image_url', label: 'Imagem', type: 'image', req: true },
      { k: 'alt', label: 'Texto alternativo', span: true },
    ],
    defaults: () => ({}),
    sort: (a) => [...a].sort((x, y) => catName(x.category_id).localeCompare(catName(y.category_id)) || brandName(x.brand_id).localeCompare(brandName(y.brand_id))),
  },
};

function crudView(key) {
  const E = ENT[key];
  actions.innerHTML = `<button class="btn btn-sm" type="button" id="new">+ ${esc(E.newLabel)}</button>`;
  actions.querySelector('#new').addEventListener('click', () => editEntity(key, null));
  const rows = E.sort(D[E.table]);
  view.innerHTML = rows.length ? `
    <div class="card" data-rv><div class="tbl-wrap"><table class="tbl">
      <thead><tr>${E.head.map((h) => `<th>${h}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="click" data-id="${esc(r.id)}">${E.cells(r)}<td class="acts"><button class="icon-btn" type="button" aria-label="Editar">${ic.edit}</button></td></tr>`).join('')}</tbody>
    </table></div></div>`
    : `<div class="card" data-rv><p class="muted">Ainda não há registos. Use “${esc(E.newLabel)}”.</p></div>`;
  view.querySelector('tbody')?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) editEntity(key, D[E.table].find((r) => r.id === tr.dataset.id));
  });
}

function editEntity(key, row) {
  const E = ENT[key];
  const isNew = !row;
  const v = row || E.defaults();
  openDialog({
    title: isNew ? E.newLabel : `Editar ${E.one}`,
    body: `<div class="grid2">${E.fields.map((f) => fieldHTML(f, v[f.k])).join('')}</div>${!isNew && E.del?.(row) ? `<p class="muted" style="font-size:13px;margin-top:10px">${esc(E.del(row))}</p>` : ''}`,
    onOpen: (form) => wireFields(form, E.folder || 'misc', { slugFrom: isNew ? E.slugFrom : null }),
    onSave: async (form) => {
      const data = readForm(form, E.fields);
      const missing = E.fields.find((f) => f.req && (data[f.k] == null || data[f.k] === ''));
      if (missing) { toast(`Preencha “${missing.label}”.`, { error: true }); return false; }
      if ('slug' in data) data.slug = slugify(data.slug);
      data.id = isNew ? uuid() : row.id;
      if (!(await write((s) => s.from(E.table).upsert(data)))) return false;
      await reload();
      toast(isNew ? 'Criado com sucesso.' : 'Alterações guardadas.');
      route();
    },
    onDelete: isNew ? null : async () => {
      if (!(await write((s) => s.from(E.table).delete().eq('id', row.id)))) return false;
      if (row.image_url && !D[E.table].some((r) => r.id !== row.id && r.image_url === row.image_url)) await removeFiles([row.image_url]);
      await reload();
      toast('Eliminado.');
      route();
    },
  });
}

// ---------- painel ----------
async function fetchOrders() {
  if (!sb) return listOrders();
  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) throw error;
  return data;
}

function ordersTable(list) {
  return `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th class="num">Artigos</th><th class="num">Total</th><th>Pagamento</th><th>Estado</th></tr></thead>
    <tbody>${list.map((o) => `<tr class="click" data-order="${esc(o.id)}">
      <td><b>#${esc(o.number)}</b></td><td>${dt.format(new Date(o.created_at))}</td>
      <td class="name"><b>${esc(o.customer?.name || '—')}</b><small>${esc(o.email)}</small></td>
      <td class="num">${(o.items || []).reduce((n, i) => n + (i.qty || 0), 0)}</td><td class="num"><b>${euro(o.total)}</b></td>
      <td>${esc(PAY[o.payment_method] || o.payment_method || '')}</td>
      <td><span class="status ${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span></td></tr>`).join('')}</tbody></table></div>`;
}

async function dashboard() {
  const prods = D.products;
  const low = prods.filter((p) => p.active !== false && p.stock <= 3).sort((a, b) => a.stock - b.stock);
  actions.innerHTML = '<a class="btn btn-sm" href="#produto/novo">+ Novo produto</a>';
  view.innerHTML = `
    <div class="stats">
      <div class="stat" data-rv><span>Produtos ativos</span><b>${prods.filter((p) => p.active !== false).length}<small style="font-size:16px;color:var(--muted)"> / ${prods.length}</small></b></div>
      <div class="stat${low.length ? ' warn' : ''}" data-rv><span>Stock baixo (≤ 3)</span><b>${low.length}</b></div>
      <div class="stat" data-rv><span>Encomendas pendentes</span><b id="st-pend">…</b></div>
      <div class="stat" data-rv><span>Vendas · últimos 30 dias</span><b id="st-rev">…</b></div>
    </div>
    <div class="card" data-rv><h2>Encomendas recentes</h2><div id="recent">${loader}</div></div>
    <div class="card" data-rv><h2>Stock a precisar de atenção <small>${low.length} produto(s)</small></h2>
      ${low.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${low.slice(0, 12).map((p) => `<tr class="click" data-edit="${esc(p.id)}"><td>${thumb(mainImg(p.id))}</td><td class="name"><b>${esc(p.name)}</b><small>${esc(catName(p.category_id))}</small></td><td class="num">${stockPill(p.stock)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Tudo em ordem.</p>'}
    </div>`;
  view.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-edit]');
    if (tr) location.hash = `produto/${tr.dataset.edit}`;
  });
  try {
    const orders = await fetchOrders();
    const since = Date.now() - 30 * 864e5;
    const paid = orders.filter((o) => ['pago', 'enviado', 'entregue'].includes(o.status) && new Date(o.created_at) >= since);
    view.querySelector('#st-pend').textContent = orders.filter((o) => o.status === 'pendente').length;
    view.querySelector('#st-rev').textContent = euro(paid.reduce((s, o) => s + Number(o.total), 0));
    const recent = view.querySelector('#recent');
    recent.innerHTML = orders.length ? ordersTable(orders.slice(0, 8)) : '<p class="muted">Ainda não há encomendas.</p>';
    recent.addEventListener('click', (e) => {
      const tr = e.target.closest('[data-order]');
      if (tr) orderDialog(orders.find((o) => o.id === tr.dataset.order), () => route());
    });
  } catch (err) {
    view.querySelector('#recent').innerHTML = `<p class="muted">${esc(friendly(err))}</p>`;
  }
}

// ---------- produtos ----------
const mainImg = (pid) => byPos(D.product_images.filter((i) => i.product_id === pid))[0]?.url || '';
const stockPill = (n) => `<span class="pill${n <= 0 ? ' out' : n <= 3 ? ' low' : ' on'}">${n <= 0 ? 'Esgotado' : `${n} un.`}</span>`;

function productsView() {
  actions.innerHTML = '<a class="btn btn-sm" href="#produto/novo">+ Novo produto</a>';
  view.innerHTML = `
    <div class="toolbar" data-rv>
      <input type="search" id="q" placeholder="Pesquisar por nome, slug ou marca…" aria-label="Pesquisar">
      <select id="fc" aria-label="Categoria"><option value="">Todas as categorias</option>${catOpts().map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>
      <select id="fs" aria-label="Estado"><option value="">Todos</option><option value="on">Ativos</option><option value="off">Inativos</option><option value="feat">Em destaque</option><option value="low">Stock baixo</option></select>
    </div>
    <div class="card" data-rv><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th></th><th>Produto</th><th>Categoria</th><th class="num">Preço</th><th class="num">Stock</th><th>Estado</th><th></th></tr></thead>
      <tbody id="rows"></tbody></table></div><p class="muted" id="count" style="font-size:13px;margin-top:10px"></p></div>`;
  const q = view.querySelector('#q');
  const fc = view.querySelector('#fc');
  const fs = view.querySelector('#fs');
  const tbody = view.querySelector('#rows');
  const saved = JSON.parse(sessionStorage.getItem('adm_pf') || '{}');
  q.value = saved.q || ''; fc.value = saved.c || ''; fs.value = saved.s || '';

  const render = () => {
    sessionStorage.setItem('adm_pf', JSON.stringify({ q: q.value, c: fc.value, s: fs.value }));
    const term = norm(q.value.trim());
    const list = D.products.filter((p) => {
      if (fc.value && p.category_id !== fc.value) return false;
      if (fs.value === 'on' && p.active === false) return false;
      if (fs.value === 'off' && p.active !== false) return false;
      if (fs.value === 'feat' && !p.featured) return false;
      if (fs.value === 'low' && p.stock > 3) return false;
      return !term || norm(`${p.name} ${p.slug} ${brandName(p.brand_id)}`).includes(term);
    }).sort((a, b) => a.name.localeCompare(b.name));
    tbody.innerHTML = list.map((p) => {
      const vs = D.product_variants.filter((v) => v.product_id === p.id);
      const price = vs.length ? `<small class="muted">desde</small> ${euro(Math.min(...vs.map((v) => Number(v.price))))}` : euro(p.base_price);
      return `<tr class="click" data-id="${esc(p.id)}">
        <td>${thumb(mainImg(p.id))}</td>
        <td class="name"><b>${esc(p.name)}</b><small>${esc(brandName(p.brand_id))} · ${esc(p.slug)}</small></td>
        <td>${esc(catName(p.category_id))}</td>
        <td class="num">${price}${p.compare_at_price ? `<br><small class="muted" style="text-decoration:line-through">${euro(p.compare_at_price)}</small>` : ''}</td>
        <td class="num">${stockPill(p.stock)}</td>
        <td>${pill(p.active !== false)}${p.featured ? ' <span class="pill star">Destaque</span>' : ''}</td>
        <td class="acts">
          <button class="icon-btn" type="button" data-act="dup" aria-label="Duplicar" title="Duplicar">${ic.copy}</button>
          <button class="icon-btn danger" type="button" data-act="del" aria-label="Eliminar" title="Eliminar">${ic.trash}</button>
        </td></tr>`;
    }).join('');
    view.querySelector('#count').textContent = `${list.length} de ${D.products.length} produtos`;
  };
  render();
  q.addEventListener('input', render);
  fc.addEventListener('change', render);
  fs.addEventListener('change', render);
  tbody.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const p = D.products.find((x) => x.id === tr.dataset.id);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'dup') return duplicateProduct(p);
    if (act === 'del') return deleteProduct(p);
    location.hash = `produto/${p.id}`;
  });
}

async function deleteProduct(p) {
  if (!confirm(`Eliminar “${p.name}”? As fotos, cores e variantes também serão apagadas.`)) return;
  const urls = D.product_images.filter((i) => i.product_id === p.id).map((i) => i.url);
  if (!(await write((s) => s.from('products').delete().eq('id', p.id)))) return;
  await removeFiles(urls);
  await reload();
  toast('Produto eliminado.');
  route();
}

async function duplicateProduct(p) {
  if (!sb) return write();
  const pid = uuid();
  const colorMap = new Map();
  let slug = `${p.slug}-copia`;
  for (let n = 2; D.products.some((x) => x.slug === slug); n += 1) slug = `${p.slug}-copia-${n}`;
  const { created_at, updated_at, ...rest } = p;
  const colors = D.product_colors.filter((c) => c.product_id === p.id).map((c) => { const id = uuid(); colorMap.set(c.id, id); return { ...c, id, product_id: pid }; });
  const variants = D.product_variants.filter((v) => v.product_id === p.id).map((v) => ({ ...v, id: uuid(), product_id: pid, sku: null }));
  const images = D.product_images.filter((i) => i.product_id === p.id).map((i) => ({ ...i, id: uuid(), product_id: pid, color_id: colorMap.get(i.color_id) || null }));
  try {
    await must(sb.from('products').insert({ ...rest, id: pid, slug, name: `${p.name} (cópia)`, active: false, featured: false }));
    if (colors.length) await must(sb.from('product_colors').insert(colors));
    if (images.length) await must(sb.from('product_images').insert(images));
    if (variants.length) await must(sb.from('product_variants').insert(variants));
  } catch (err) { toast(friendly(err), { error: true }); return; }
  await reload();
  toast('Cópia criada (inativa). Reveja e ative quando estiver pronta.');
  location.hash = `produto/${pid}`;
}

// ---------- editor de produto ----------
function productEditor(id) {
  const isNew = !id || id === 'novo';
  const p0 = isNew ? null : D.products.find((x) => x.id === id);
  if (!isNew && !p0) {
    view.innerHTML = '<div class="card" data-rv><p>Produto não encontrado.</p><a class="btn btn-sm" href="#produtos">Voltar aos produtos</a></div>';
    return;
  }
  const pid = isNew ? uuid() : p0.id;
  titleEl.textContent = isNew ? 'Novo produto' : p0.name;
  const M = {
    p: isNew
      ? { id: pid, name: '', slug: '', category_id: null, brand_id: null, model_group: '', short_description: '', description: '', base_price: 0, compare_at_price: null, stock: 0, featured: false, active: true }
      : { ...p0 },
    colors: byPos(D.product_colors.filter((c) => c.product_id === pid)).map((c) => ({ ...c })),
    variants: byPos(D.product_variants.filter((v) => v.product_id === pid)).map((v) => ({ ...v })),
    images: byPos(D.product_images.filter((i) => i.product_id === pid)).map((i) => ({ ...i })),
    specs: (p0?.specs || []).map((s) => ({ group: s.group || '', label: s.label || '', value: s.value || '' })),
  };
  const origImages = M.images.map((i) => i.url);
  let dirty = false;
  let slugTouched = !isNew;
  guard = () => dirty;

  const groups = [...new Set(D.products.flatMap((p) => (p.specs || []).map((s) => s.group)).filter(Boolean))];
  const labels = [...new Set(D.products.flatMap((p) => (p.specs || []).map((s) => s.label)).filter(Boolean))];
  const P = M.p;

  actions.innerHTML = `${isNew ? '' : `<a class="btn btn-sm btn-light" href="${productUrl(P)}" target="_blank" rel="noopener">Ver na loja ↗</a>`}<a class="btn btn-sm btn-light" href="#produtos">Voltar</a>`;
  view.innerHTML = `
    <form class="editor" id="pf" novalidate autocomplete="off">
      <div>
        <section class="card" data-rv><h2>Informação</h2>
          <div class="grid2">
            <label class="f span2"><span>Nome</span><input name="name" required maxlength="160" value="${esc(P.name)}"></label>
            <label class="f"><span>Slug <small>URL do produto</small></span><input name="slug" maxlength="90" value="${esc(P.slug)}"></label>
            <label class="f"><span>Categoria</span><select name="category_id"><option value="">— Sem categoria —</option>${catOpts().map((o) => `<option value="${esc(o.value)}"${o.value === P.category_id ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
            <label class="f"><span>Marca</span><select name="brand_id"><option value="">— Sem marca —</option>${brandOpts().map((o) => `<option value="${esc(o.value)}"${o.value === P.brand_id ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
            <label class="f span2"><span>Família de modelos <small>produtos com o mesmo valor aparecem como "Modelo" na página (ex.: iphone-17-pro)</small></span><input name="model_group" maxlength="80" value="${esc(P.model_group || '')}"></label>
            <label class="f span2"><span>Descrição curta <small>aparece nos cartões e no topo da página</small></span><input name="short_description" maxlength="240" value="${esc(P.short_description || '')}"></label>
            <label class="f span2"><span>Descrição completa <small>linhas em branco separam parágrafos</small></span><textarea name="description" rows="6" maxlength="8000">${esc(P.description || '')}</textarea></label>
          </div>
        </section>

        <section class="card" data-rv><h2>Fotografias <small>a primeira é a principal · máx. 5 MB cada</small></h2>
          <div class="imgs" id="imgs"></div>
          <div class="f inline" style="margin-top:12px"><input id="img-url" placeholder="…ou cole o URL de uma imagem" style="flex:1"><button type="button" class="btn btn-sm btn-light" id="img-add">Adicionar URL</button></div>
        </section>

        <section class="card" data-rv><h2>Cores <small>opcional · pode associar fotos a cada cor</small></h2>
          <div class="rows rows-colors" id="colors"></div>
          <button type="button" class="btn btn-sm btn-light add-row" data-add="colors">+ Adicionar cor</button>
        </section>

        <section class="card" data-rv><h2>Variantes <small>opcional · ex.: 256 GB, 16GB / 1TB — cada uma com preço e stock</small></h2>
          <div class="rows-head variants"><span>Etiqueta</span><span>Preço (€)</span><span>Stock</span><span>SKU</span><span></span></div>
          <div class="rows rows-variants" id="variants"></div>
          <button type="button" class="btn btn-sm btn-light add-row" data-add="variants">+ Adicionar variante</button>
        </section>

        <section class="card" data-rv><h2>Especificações técnicas</h2>
          <div class="rows-head specs"><span>Grupo</span><span>Característica</span><span>Valor</span><span></span></div>
          <div class="rows rows-specs" id="specs"></div>
          <button type="button" class="btn btn-sm btn-light add-row" data-add="specs">+ Adicionar especificação</button>
          <datalist id="dl-groups">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
          <datalist id="dl-labels">${labels.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
        </section>
      </div>

      <aside>
        <section class="card" data-rv><h2>Preço e stock</h2>
          <div style="display:grid;gap:12px">
            <label class="f"><span>Preço (€)</span><input name="base_price" type="number" step="0.01" min="0" value="${esc(P.base_price ?? 0)}"></label>
            <label class="f"><span>Preço anterior (€) <small>riscado, opcional</small></span><input name="compare_at_price" type="number" step="0.01" min="0" value="${esc(P.compare_at_price ?? '')}"></label>
            <label class="f"><span>Stock <small>unidades</small></span><input name="stock" type="number" step="1" min="0" value="${esc(P.stock ?? 0)}"></label>
            <p class="muted" style="font-size:13px;margin:0">Com variantes, a loja usa o preço e o stock de cada variante.</p>
          </div>
        </section>
        <section class="card" data-rv><h2>Visibilidade</h2>
          <div style="display:grid;gap:14px">
            <label class="toggle"><input type="checkbox" name="active"${P.active !== false ? ' checked' : ''}> Visível na loja</label>
            <label class="toggle"><input type="checkbox" name="featured"${P.featured ? ' checked' : ''}> Em destaque na página inicial</label>
          </div>
        </section>
        <section class="card" data-rv><h2>Pré-visualização</h2><img class="preview-img" id="pv" alt="" style="max-height:220px"><p id="pv-name" style="font-weight:600;margin:10px 0 0"></p><p class="muted" id="pv-price" style="margin:0"></p></section>
        ${isNew ? '' : '<button type="button" class="btn btn-sm btn-danger" id="del">Eliminar produto</button>'}
      </aside>

      <div class="savebar" style="grid-column:1/-1"><span id="state">${isNew ? 'Produto novo — ainda não guardado' : 'Sem alterações'}</span>
        <button class="btn btn-sm" type="submit" id="save">Guardar produto</button></div>
    </form>`;

  const form = view.querySelector('#pf');
  const stateEl = view.querySelector('#state');
  const box = { colors: view.querySelector('#colors'), variants: view.querySelector('#variants'), specs: view.querySelector('#specs'), images: view.querySelector('#imgs') };
  const btn = (act, icon, label, cls = '') => `<button type="button" class="icon-btn${cls}" data-${act} aria-label="${label}" title="${label}">${icon}</button>`;

  const R = {
    colors: () => M.colors.map((c, i) => `<div class="rowx" data-list="colors" data-i="${i}">
      <input type="color" data-k="hex" value="${esc(c.hex || '#cccccc')}" aria-label="Cor">
      <input data-k="name" value="${esc(c.name)}" placeholder="Nome da cor (ex.: Titânio natural)" maxlength="60">
      ${btn('rm', ic.trash, 'Remover', ' danger')}</div>`).join(''),
    variants: () => M.variants.map((v, i) => `<div class="rowx" data-list="variants" data-i="${i}">
      <input data-k="label" value="${esc(v.label)}" placeholder="256 GB" maxlength="60">
      <input data-k="price" type="number" step="0.01" min="0" value="${esc(v.price ?? '')}" placeholder="0.00">
      <input data-k="stock" type="number" step="1" min="0" value="${esc(v.stock ?? 0)}">
      <input data-k="sku" value="${esc(v.sku || '')}" placeholder="opcional" maxlength="60">
      ${btn('rm', ic.trash, 'Remover', ' danger')}</div>`).join(''),
    specs: () => M.specs.map((s, i) => `<div class="rowx" data-list="specs" data-i="${i}">
      <input data-k="group" list="dl-groups" value="${esc(s.group)}" placeholder="Ecrã" maxlength="60">
      <input data-k="label" list="dl-labels" value="${esc(s.label)}" placeholder="Tamanho" maxlength="80">
      <input data-k="value" value="${esc(s.value)}" placeholder="6,3 polegadas" maxlength="300">
      <div class="ord">${btn('up', ic.up, 'Subir')}${btn('down', ic.down, 'Descer')}${btn('rm', ic.trash, 'Remover', ' danger')}</div></div>`).join(''),
    images: () => M.images.map((m, i) => `<div class="img-card" data-list="images" data-i="${i}">
      ${i === 0 ? '<span class="main-tag">Principal</span>' : ''}
      <img src="${esc(m.url)}" alt="${esc(m.alt || '')}" loading="lazy">
      <input data-k="alt" value="${esc(m.alt || '')}" placeholder="Texto alternativo" maxlength="160">
      <select data-k="color_id" aria-label="Cor associada"><option value="">Todas as cores</option>${M.colors.filter((c) => c.name.trim()).map((c) => `<option value="${esc(c.id)}"${c.id === m.color_id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <div class="bar"><span>${btn('up', ic.left, 'Mover para trás')}${btn('down', ic.right, 'Mover para a frente')}</span>${btn('rm', ic.trash, 'Remover', ' danger')}</div>
    </div>`).join('') + `<label class="drop" id="drop">${ic.upload}<span><b>Carregar fotos</b><br>clique ou arraste para aqui</span><input type="file" accept="image/*" multiple hidden id="files"></label>`,
  };
  const paint = (k) => { box[k].innerHTML = R[k](); if (k === 'images') wireDrop(); preview(); };
  const touch = () => { dirty = true; stateEl.textContent = 'Alterações por guardar'; };

  function preview() {
    const pv = view.querySelector('#pv');
    const url = M.images[0]?.url;
    pv.hidden = !url;
    if (url) pv.src = url;
    view.querySelector('#pv-name').textContent = form.elements.name.value || 'Sem nome';
    const vs = M.variants.map((v) => num(v.price)).filter((x) => x != null);
    view.querySelector('#pv-price').textContent = vs.length ? `desde ${euro(Math.min(...vs))}` : euro(num(form.elements.base_price.value) || 0);
  }

  async function addFiles(files) {
    const drop = view.querySelector('#drop');
    drop.classList.add('busy');
    for (const file of files) {
      const url = await upload(file, `products/${pid}`);
      if (url) M.images.push({ id: uuid(), product_id: pid, url, alt: form.elements.name.value.trim(), color_id: null });
    }
    paint('images');
    touch();
  }
  function wireDrop() {
    const drop = view.querySelector('#drop');
    const input = view.querySelector('#files');
    input.addEventListener('change', () => { if (input.files.length) addFiles([...input.files]); });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { const fl = [...(e.dataTransfer?.files || [])]; if (fl.length) addFiles(fl); });
  }
  Object.keys(R).forEach(paint);

  view.querySelector('#img-add').addEventListener('click', () => {
    const inp = view.querySelector('#img-url');
    const url = inp.value.trim();
    if (!/^(https?:\/\/|\/)/.test(url)) { toast('Indique um URL começado por https:// ou /', { error: true }); return; }
    M.images.push({ id: uuid(), product_id: pid, url, alt: form.elements.name.value.trim(), color_id: null });
    inp.value = '';
    paint('images');
    touch();
  });

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.type === 'file' || t.id === 'img-url') return;
    touch();
    const row = t.closest('[data-list]');
    if (row && t.dataset.k) {
      const item = M[row.dataset.list][+row.dataset.i];
      item[t.dataset.k] = t.dataset.k === 'color_id' ? (t.value || null) : t.value;
      if (row.dataset.list === 'colors') paint('images');
      if (row.dataset.list === 'variants') preview();
      return;
    }
    if (t.name === 'name') {
      if (!slugTouched) form.elements.slug.value = slugify(t.value);
      titleEl.textContent = t.value || 'Novo produto';
    }
    if (t.name === 'slug') slugTouched = true;
    preview();
  });

  form.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const k = add.dataset.add;
      if (k === 'colors') M.colors.push({ id: uuid(), product_id: pid, name: '', hex: '#cccccc' });
      if (k === 'variants') M.variants.push({ id: uuid(), product_id: pid, label: '', price: form.elements.base_price.value || '', stock: 0, sku: '' });
      if (k === 'specs') M.specs.push({ group: M.specs.at(-1)?.group || '', label: '', value: '' });
      paint(k);
      if (k === 'colors') paint('images');
      box[k].lastElementChild?.querySelector('input:not([type=color])')?.focus();
      touch();
      return;
    }
    const b = e.target.closest('[data-rm],[data-up],[data-down]');
    const row = b?.closest('[data-list]');
    if (!row) return;
    const k = row.dataset.list;
    const arr = M[k];
    const i = +row.dataset.i;
    if (b.hasAttribute('data-rm')) {
      const [gone] = arr.splice(i, 1);
      if (k === 'colors') M.images.forEach((m) => { if (m.color_id === gone.id) m.color_id = null; });
    } else {
      const j = b.hasAttribute('data-up') ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    paint(k);
    if (k === 'colors') paint('images');
    touch();
  });

  view.querySelector('#del')?.addEventListener('click', async () => {
    dirty = false;
    await deleteProduct(p0);
    if (!D.products.some((x) => x.id === pid)) location.hash = 'produtos';
  });

  const onKey = (e) => {
    if (!document.body.contains(form)) { document.removeEventListener('keydown', onKey); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); form.requestSubmit(); }
  };
  document.addEventListener('keydown', onKey);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const name = f.name.value.trim();
    const slug = slugify(f.slug.value || name);
    const base = num(f.base_price.value);
    const compare = num(f.compare_at_price.value);
    const err = (m, el) => { toast(m, { error: true }); el?.focus(); };
    if (!name) return err('Indique o nome do produto.', f.name);
    if (!slug) return err('Indique um slug válido.', f.slug);
    if (D.products.some((x) => x.slug === slug && x.id !== pid)) return err('Já existe outro produto com este slug.', f.slug);
    if (base == null || base < 0) return err('Indique um preço válido.', f.base_price);
    if (compare != null && compare <= base) return err('O preço anterior deve ser maior do que o preço atual (ou ficar vazio).', f.compare_at_price);
    if (M.colors.some((c) => !c.name.trim())) return err('Todas as cores precisam de nome.');
    if (M.variants.some((v) => !v.label.trim() || num(v.price) == null)) return err('Todas as variantes precisam de etiqueta e preço.');

    const { created_at, updated_at, ...keep } = M.p;
    const product = {
      ...keep, id: pid, name, slug,
      category_id: f.category_id.value || null,
      brand_id: f.brand_id.value || null,
      model_group: f.model_group.value.trim().toLowerCase(),
      short_description: f.short_description.value.trim(),
      description: f.description.value.trim(),
      base_price: base, compare_at_price: compare, stock: int(f.stock.value),
      active: f.active.checked, featured: f.featured.checked,
      specs: M.specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ group: s.group.trim() || 'Geral', label: s.label.trim(), value: s.value.trim() })),
    };
    const colors = M.colors.map((c, i) => ({ id: c.id, product_id: pid, name: c.name.trim(), hex: c.hex || '#cccccc', position: i }));
    const variants = M.variants.map((v, i) => ({ id: v.id, product_id: pid, label: v.label.trim(), price: num(v.price), stock: int(v.stock), sku: (v.sku || '').trim() || null, position: i }));
    const images = M.images.map((m, i) => ({ id: m.id, product_id: pid, url: m.url, alt: (m.alt || '').trim() || name, color_id: colors.some((c) => c.id === m.color_id) ? m.color_id : null, position: i }));

    if (!sb) return write();
    const saveBtn = form.querySelector('#save');
    saveBtn.disabled = true;
    stateEl.textContent = 'A guardar…';
    const prune = (table, ids) => {
      let q = sb.from(table).delete().eq('product_id', pid);
      if (ids.length) q = q.not('id', 'in', `(${ids.join(',')})`);
      return must(q);
    };
    try {
      await must(sb.from('products').upsert(product));
      await prune('product_images', images.map((x) => x.id));
      await prune('product_colors', colors.map((x) => x.id));
      await prune('product_variants', variants.map((x) => x.id));
      if (colors.length) await must(sb.from('product_colors').upsert(colors));
      if (images.length) await must(sb.from('product_images').upsert(images));
      if (variants.length) await must(sb.from('product_variants').upsert(variants));
    } catch (error) {
      saveBtn.disabled = false;
      stateEl.textContent = 'Erro ao guardar';
      toast(friendly(error), { error: true, timeout: 7000 });
      return;
    }
    const removed = origImages.filter((u) => !images.some((m) => m.url === u));
    await removeFiles(removed);
    await reload();
    dirty = false;
    toast('Produto guardado.', { img: images[0]?.url, link: productUrl(product), linkText: 'Ver na loja' });
    if (isNew) location.hash = `produto/${pid}`;
    else route();
  });
}

// ---------- encomendas ----------
function orderDialog(o, after) {
  const c = o.customer || {};
  openDialog({
    title: `Encomenda #${o.number}`,
    saveLabel: 'Guardar estado',
    body: `
      <dl class="kv">
        <dt>Data</dt><dd>${dt.format(new Date(o.created_at))}</dd>
        <dt>Cliente</dt><dd>${esc(c.name || '—')}${o.user_id ? '' : ' <small class="muted">(sem conta)</small>'}</dd>
        <dt>Email</dt><dd><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></dd>
        <dt>Telemóvel</dt><dd>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—'}</dd>
        ${c.nif ? `<dt>NIF</dt><dd>${esc(c.nif)}</dd>` : ''}
        <dt>Morada</dt><dd>${esc(c.address || '')}<br>${esc(c.postal_code || '')} ${esc(c.city || '')}${c.country ? `, ${esc(c.country)}` : ''}</dd>
        <dt>Pagamento</dt><dd>${esc(PAY[o.payment_method] || o.payment_method || '—')}</dd>
      </dl>
      <h3 style="margin:18px 0 8px;font-size:16px">Artigos</h3>
      <ul class="lines">${(o.items || []).map((i) => `<li><span>${i.qty}× ${esc(i.name)}${i.variant || i.color ? ` <small class="muted">${[i.variant, i.color].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</span><span>${euro(i.line_total)}</span></li>`).join('')}
        <li style="border-top:1px solid var(--line);padding-top:6px"><span class="muted">Subtotal</span><span>${euro(o.subtotal)}</span></li>
        <li><span class="muted">Envio</span><span>${Number(o.shipping) ? euro(o.shipping) : 'Grátis'}</span></li>
        <li><b>Total</b><b>${euro(o.total)}</b></li></ul>
      <div class="grid2" style="margin-top:18px">
        <label class="f"><span>Estado</span><select name="status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}"${k === o.status ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f span2"><span>Notas internas</span><textarea name="notes" maxlength="2000" placeholder="Ex.: nº de seguimento CTT">${esc(o.notes || '')}</textarea></label>
      </div>`,
    onSave: async (form) => {
      const patch = { status: form.elements.status.value, notes: form.elements.notes.value.trim() };
      if (sb ? !(await write((s) => s.from('orders').update(patch).eq('id', o.id))) : !updateOrder(o.id, patch)) return false;
      Object.assign(o, patch);
      toast('Encomenda atualizada.');
      after?.();
    },
    onDelete: me.role === 'owner' ? async () => {
      if (sb ? !(await write((s) => s.from('orders').delete().eq('id', o.id))) : !deleteOrder(o.id)) return false;
      toast('Encomenda eliminada.');
      after?.(true);
    } : null,
  });
}

async function ordersView() {
  view.innerHTML = loader;
  let orders;
  try { orders = await fetchOrders(); } catch (err) {
    view.innerHTML = `<div class="card"><p>${esc(friendly(err))}</p></div>`;
    return;
  }
  view.innerHTML = `
    <div class="toolbar" data-rv>
      <input type="search" id="q" placeholder="Nº, nome ou email…" aria-label="Pesquisar">
      <select id="fs" aria-label="Estado"><option value="">Todos os estados</option>${Object.entries(STATUS).map(([k, l]) => `<option value="${k}">${l} (${orders.filter((o) => o.status === k).length})</option>`).join('')}</select>
    </div>
    <div class="card" data-rv id="list"></div>`;
  const q = view.querySelector('#q');
  const fs = view.querySelector('#fs');
  const list = view.querySelector('#list');
  const render = () => {
    const term = norm(q.value.trim());
    const rows = orders.filter((o) => (!fs.value || o.status === fs.value)
      && (!term || norm(`${o.number} ${o.email} ${o.customer?.name || ''}`).includes(term)));
    list.innerHTML = rows.length ? ordersTable(rows) : '<p class="muted">Nenhuma encomenda encontrada.</p>';
  };
  render();
  q.addEventListener('input', render);
  fs.addEventListener('change', render);
  list.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-order]');
    if (!tr) return;
    const o = orders.find((x) => x.id === tr.dataset.order);
    orderDialog(o, (deleted) => {
      if (deleted) orders = orders.filter((x) => x.id !== o.id);
      render();
    });
  });
  reveal(view);
}

// ---------- clientes ----------
async function customersView() {
  view.innerHTML = loader;
  let list;
  try {
    if (sb) {
      const { data, error } = await sb.from('customers').select('*').order('last_order_at', { ascending: false, nullsFirst: false }).limit(2000);
      if (error) throw error;
      list = data;
    } else list = listCustomers();
  } catch (err) {
    view.innerHTML = `<div class="card"><p>${esc(friendly(err))}</p></div>`;
    return;
  }
  view.innerHTML = `
    <div class="toolbar" data-rv><input type="search" id="q" placeholder="Nome, email, telemóvel, NIF ou cidade…" aria-label="Pesquisar"></div>
    <div class="card" data-rv id="list"></div>`;
  const q = view.querySelector('#q');
  const box = view.querySelector('#list');
  const render = () => {
    const term = norm(q.value.trim());
    const rows = list.filter((c) => !term || norm(`${c.name} ${c.email} ${c.phone} ${c.nif} ${c.city}`).includes(term));
    box.innerHTML = rows.length ? `<div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Cliente</th><th>Telemóvel</th><th>NIF</th><th>Localidade</th><th class="num">Encomendas</th><th class="num">Total gasto</th><th>Última compra</th></tr></thead>
      <tbody>${rows.map((c) => `<tr>
        <td class="name"><b>${esc(c.name || '—')}</b><small><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></small></td>
        <td>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—'}</td>
        <td>${esc(c.nif || '—')}</td>
        <td>${esc([c.postal_code, c.city].filter(Boolean).join(' ') || '—')}</td>
        <td class="num">${Number(c.orders_count) || 0}</td>
        <td class="num"><b>${euro(c.total_spent || 0)}</b></td>
        <td>${c.last_order_at ? dShort.format(new Date(c.last_order_at)) : '—'}</td></tr>`).join('')}</tbody></table></div>`
      : `<p class="muted">${list.length ? 'Nenhum cliente encontrado.' : 'Ainda não há clientes. Os compradores aparecem aqui após a primeira encomenda.'}</p>`;
  };
  render();
  q.addEventListener('input', render);
  reveal(view);
}

// ---------- definições ----------
function settingsView() {
  const s = D.settings || {};
  const fields = [
    { k: 'store_name', label: 'Nome da loja', req: true },
    { k: 'contact_email', label: 'Email de contacto', type: 'email' },
    { k: 'shipping_cost', label: 'Custo de envio (€)', type: 'number', step: '0.01' },
    { k: 'free_shipping_over', label: 'Envio grátis a partir de (€)', type: 'number', step: '0.01', hint: '0 = nunca' },
  ];
  view.innerHTML = `
    <form class="card" id="sf" data-rv novalidate style="max-width:720px">
      <h2>Loja</h2>
      <div class="grid2">${fields.map((f) => fieldHTML(f, s[f.k])).join('')}</div>
      <p class="muted" style="font-size:13px;margin:14px 0">Os valores de envio também são usados pelo servidor ao calcular o total da encomenda.</p>
      <button class="btn btn-sm" type="submit">Guardar definições</button>
    </form>`;
  const form = view.querySelector('#sf');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = readForm(form, fields);
    if (!data.store_name) { toast('Indique o nome da loja.', { error: true }); return; }
    const value = { ...s, ...data, shipping_cost: data.shipping_cost ?? 0, free_shipping_over: data.free_shipping_over ?? 0, currency: s.currency || 'EUR' };
    if (!(await write((x) => x.from('settings').upsert({ key: 'store', value })))) return;
    await reload();
    toast('Definições guardadas.');
  });
}

// ---------- acessos (só dono) ----------
async function accessView() {
  if (!sb) {
    view.innerHTML = '<div class="card" data-rv><p class="muted">A gestão de acessos fica disponível depois de ligar a loja ao Supabase.</p></div>';
    return;
  }
  view.innerHTML = loader;
  let list;
  try { list = await must(sb.from('admins').select('*').order('created_at')); } catch (err) {
    view.innerHTML = `<div class="card"><p>${esc(friendly(err))}</p></div>`;
    return;
  }
  view.innerHTML = `
    <form class="card" id="af" data-rv novalidate>
      <h2>Dar acesso <small>a pessoa entra com uma conta criada em /registo.html com este email</small></h2>
      <div class="grid3" style="align-items:end">
        <label class="f"><span>Email</span><input name="email" type="email" required maxlength="160" placeholder="pessoa@exemplo.com"></label>
        <label class="f"><span>Função</span><select name="role"><option value="editor">Editor — gere produtos e encomendas</option><option value="owner">Dono — também gere acessos</option></select></label>
        <button class="btn btn-sm" type="submit" style="justify-self:start">Adicionar</button>
      </div>
    </form>
    <div class="card" data-rv><h2>Equipa <small>${list.length} pessoa(s)</small></h2><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Email</th><th>Função</th><th>Desde</th><th></th></tr></thead>
      <tbody>${list.map((a) => {
        const self = a.email === me.email;
        return `<tr data-email="${esc(a.email)}"><td><b>${esc(a.email)}</b>${self ? ' <span class="pill on">Você</span>' : ''}</td>
          <td><select data-role${self ? ' disabled' : ''} aria-label="Função"><option value="editor"${a.role === 'editor' ? ' selected' : ''}>Editor</option><option value="owner"${a.role === 'owner' ? ' selected' : ''}>Dono</option></select></td>
          <td>${a.created_at ? dShort.format(new Date(a.created_at)) : ''}</td>
          <td class="acts">${self ? '' : `<button class="icon-btn danger" type="button" data-rm aria-label="Remover acesso" title="Remover acesso">${ic.trash}</button>`}</td></tr>`;
      }).join('')}</tbody></table></div></div>`;
  reveal(view);
  const form = view.querySelector('#af');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Email inválido.', { error: true }); return; }
    if (!(await write((s) => s.from('admins').upsert({ email, role: form.elements.role.value })))) return;
    toast(`Acesso dado a ${email}.`);
    route();
  });
  view.querySelector('tbody').addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-role]');
    if (!sel) return;
    const email = sel.closest('tr').dataset.email;
    if (await write((s) => s.from('admins').update({ role: sel.value }).eq('email', email))) toast('Função atualizada.');
  });
  view.querySelector('tbody').addEventListener('click', async (e) => {
    if (!e.target.closest('[data-rm]')) return;
    const email = e.target.closest('tr').dataset.email;
    if (!confirm(`Remover o acesso de ${email} ao painel?`)) return;
    if (await write((s) => s.from('admins').delete().eq('email', email))) { toast('Acesso removido.'); route(); }
  });
}

route();
