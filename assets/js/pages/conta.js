import { initLayout, emptyState, icons, toast } from '../layout.js';
import { hasBackend, supabase, getUser, signOut, esc, euro, authError } from '../store.js';
import { reveal } from '../reveal.js';

const page = document.getElementById('page');
await initLayout();

if (!hasBackend) {
  page.innerHTML = `
    <div class="page-title"><h1>A minha conta.</h1></div>
    <div class="alert info show" data-rv>Modo de demonstração: a área de cliente fica disponível depois de ligar a loja ao Supabase (ver README).</div>
    ${emptyState({ title: 'Sem sessão iniciada', text: 'Ligue a loja à base de dados para ativar contas de cliente.', icon: icons.user })}`;
  reveal();
  await new Promise(() => {});
}

const user = await getUser().catch(() => null);
if (!user) {
  location.replace('/login.html?next=/conta.html');
  await new Promise(() => {});
}

const sb = await supabase();
const STATUS = { pendente: 'Pendente', pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
const PAY = { mbway: 'MB WAY', multibanco: 'Multibanco', transferencia: 'Transferência', entrega: 'Pagamento na entrega' };
const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
const meta = () => user.user_metadata || {};

page.innerHTML = `
  <div class="page-title"><h1>Olá, ${esc((meta().name || user.email).split(' ')[0])}.</h1><p class="muted">${esc(user.email)}</p></div>
  <div class="account-grid">
    <nav class="account-nav" aria-label="Área de cliente" data-rv>
      <button type="button" data-tab="orders" class="active">Encomendas</button>
      <button type="button" data-tab="profile">Dados pessoais</button>
      <a href="/reset-password.html">Alterar palavra-passe</a>
      <button type="button" data-logout>Terminar sessão</button>
    </nav>
    <section id="panel" aria-live="polite"></section>
  </div>`;
reveal();

const panel = page.querySelector('#panel');
page.querySelector('.account-nav').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-logout')) {
    await signOut();
    location.replace('/');
    return;
  }
  page.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
  show(b.dataset.tab);
});

function show(tab) {
  history.replaceState(null, '', tab === 'profile' ? '#dados' : '#encomendas');
  if (tab === 'profile') profile();
  else orders();
}

async function orders() {
  panel.innerHTML = '<div class="page-loader"><div class="spinner dark"></div></div>';
  const { data, error } = await sb.from('orders')
    .select('id,number,created_at,status,items,subtotal,shipping,total,payment_method')
    .order('created_at', { ascending: false });
  if (error) {
    panel.innerHTML = `<div class="alert error show">Não foi possível carregar as encomendas. ${esc(error.message)}</div>`;
    return;
  }
  if (!data.length) {
    panel.innerHTML = emptyState({ title: 'Ainda não tem encomendas', text: 'Quando fizer uma compra, vai poder acompanhá-la aqui.', cta: { href: '/categoria.html', label: 'Começar a comprar' }, icon: icons.bag });
    reveal();
    return;
  }
  panel.innerHTML = data.map((o) => `
    <article class="order">
      <div class="order-head">
        <div><b>Encomenda #${esc(o.number)}</b><br><span class="muted" style="font-size:14px">${dateFmt.format(new Date(o.created_at))} · ${esc(PAY[o.payment_method] || o.payment_method || '')}</span></div>
        <span class="status ${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span>
      </div>
      <ul style="list-style:none;padding:0;margin:0 0 10px;display:grid;gap:6px;font-size:15px">
        ${(o.items || []).map((i) => `<li style="display:flex;justify-content:space-between;gap:12px">
          <span>${i.qty}× <a href="/produto.html?slug=${encodeURIComponent(i.slug || '')}">${esc(i.name)}</a>${i.variant || i.color ? ` <small class="muted">${[i.variant, i.color].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</span>
          <span>${euro(i.line_total)}</span></li>`).join('')}
      </ul>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px">
        <span class="muted">Envio ${Number(o.shipping) ? euro(o.shipping) : 'grátis'}</span><b>Total ${euro(o.total)}</b>
      </div>
    </article>`).join('');
  reveal();
}

function profile() {
  const m = meta();
  panel.innerHTML = `
    <form id="profile" class="fieldset" novalidate data-rv style="display:grid;gap:16px;max-width:520px">
      <div class="field"><label for="p-name">Nome</label><input id="p-name" name="name" autocomplete="name" maxlength="120" value="${esc(m.name || '')}"></div>
      <div class="field"><label for="p-phone">Telemóvel</label><input id="p-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" value="${esc(m.phone || '')}"></div>
      <div class="field"><label for="p-email">Email</label><input id="p-email" value="${esc(user.email)}" disabled><span class="hint">Para alterar o email contacte o apoio ao cliente.</span></div>
      <div class="alert" id="msg" role="alert"></div>
      <button class="btn" type="submit" style="justify-self:start">Guardar alterações</button>
    </form>`;
  reveal();
  const form = panel.querySelector('#profile');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const msg = form.querySelector('#msg');
    btn.disabled = true;
    const { data, error } = await sb.auth.updateUser({ data: { name: form.name.value.trim(), phone: form.phone.value.trim() } });
    btn.disabled = false;
    if (error) { msg.className = 'alert error show'; msg.textContent = authError(error); return; }
    user.user_metadata = data.user.user_metadata;
    msg.className = 'alert ok show';
    msg.textContent = 'Dados atualizados.';
    toast('Dados guardados.');
  });
}

if (location.hash === '#dados') page.querySelector('[data-tab="profile"]').click();
else orders();
