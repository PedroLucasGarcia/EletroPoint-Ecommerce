import { initLayout, emptyState, icons, toast } from '../layout.js';
import { esc, euro, hasBackend, supabase, getUser } from '../store.js';
import { cart } from '../cart.js';
import { saveOrder } from '../local-db.js';
import { reveal } from '../reveal.js';

const page = document.getElementById('page');
const cat = await initLayout();
const user = await getUser().catch(() => null);

const PAY = [
  ['mbway', 'MB WAY', 'Recebe um pedido de pagamento no telemóvel.'],
  ['multibanco', 'Multibanco', 'Enviamos entidade e referência por email.'],
  ['transferencia', 'Transferência bancária', 'Enviamos o IBAN por email. Envio após confirmação.'],
  ['entrega', 'Pagamento na entrega', 'Paga ao estafeta no momento da entrega.'],
];

function render() {
  const lines = cart.lines(cat);
  if (!lines.length) {
    page.innerHTML = `<div class="page-title"><h1>Finalizar compra.</h1></div>${emptyState({
      title: 'Não há nada para finalizar',
      text: 'O seu carrinho está vazio. Adicione produtos para continuar.',
      cta: { href: '/categoria.html', label: 'Ver produtos' },
      icon: icons.bag,
    })}`;
    reveal();
    return;
  }
  const t = cart.totals(lines, cat.settings);
  const meta = user?.user_metadata || {};

  page.innerHTML = `
    <nav class="breadcrumbs" aria-label="Navegação estrutural"><a href="/">Início</a><a href="/carrinho.html">Carrinho</a><span>Finalizar compra</span></nav>
    <div class="page-title"><h1>Finalizar compra.</h1></div>
    ${!hasBackend ? `<div class="alert info show" data-rv>Modo de demonstração: a loja ainda não está ligada ao Supabase, por isso a encomenda e os seus dados ficam guardados apenas neste navegador (visíveis no painel de administração).</div>` : ''}
    ${hasBackend && !user ? `<p class="muted" data-rv>Já tem conta? <a href="/login.html?next=/checkout.html"><b>Entre</b></a> para acompanhar a encomenda na sua área de cliente.</p>` : ''}
    <div class="cart-layout">
      <form class="checkout-form" id="form" novalidate data-rv>
        <fieldset class="fieldset">
          <legend>Contacto</legend>
          <div class="row">
            <div class="field"><label for="f-name">Nome completo</label><input id="f-name" name="name" autocomplete="name" required maxlength="120" value="${esc(meta.name || '')}"></div>
            <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required maxlength="160" value="${esc(user?.email || '')}"></div>
          </div>
          <div class="row">
            <div class="field"><label for="f-phone">Telemóvel</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" required maxlength="20" placeholder="9XX XXX XXX" value="${esc(meta.phone || '')}"></div>
            <div class="field"><label for="f-nif">NIF <small class="muted">(opcional)</small></label><input id="f-nif" name="nif" inputmode="numeric" maxlength="9" pattern="\\d{9}"></div>
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>Morada de entrega</legend>
          <div class="field"><label for="f-address">Morada</label><input id="f-address" name="address" autocomplete="street-address" required maxlength="200"></div>
          <div class="row three">
            <div class="field"><label for="f-postal">Código postal</label><input id="f-postal" name="postal_code" autocomplete="postal-code" required maxlength="8" placeholder="0000-000"></div>
            <div class="field"><label for="f-city">Localidade</label><input id="f-city" name="city" autocomplete="address-level2" required maxlength="80"></div>
            <div class="field"><label for="f-country">País</label>
              <select id="f-country" name="country" autocomplete="country-name"><option>Portugal</option><option>Espanha</option></select>
            </div>
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>Pagamento</legend>
          <div class="pay-options">
            ${PAY.map(([v, b, s], i) => `<label class="pay"><input type="radio" name="payment_method" value="${v}"${i === 0 ? ' checked' : ''}><span><b>${b}</b><small>${s}</small></span></label>`).join('')}
          </div>
        </fieldset>

        <fieldset class="fieldset">
          <legend>Notas <small class="muted">(opcional)</small></legend>
          <div class="field"><textarea id="f-notes" name="notes" rows="3" maxlength="500" aria-label="Notas para a encomenda" placeholder="Indicações para a entrega, horário preferido…"></textarea></div>
          <label class="check"><input type="checkbox" id="f-terms" required> <span>Li e aceito os termos e condições e a política de privacidade.</span></label>
        </fieldset>

        <div class="alert error" id="err" role="alert"></div>
        <button class="btn btn-lg btn-block" type="submit" id="submit">Confirmar encomenda · ${euro(t.total)}</button>
      </form>

      <aside class="summary" data-rv>
        <h2>A sua encomenda</h2>
        <div class="summary-items">
          ${lines.map((l) => `
            <div class="summary-item">
              <span class="thumb"><img src="${esc(l.image)}" alt="" loading="lazy"><b>${l.qty}</b></span>
              <span>${esc(l.product.name)}${l.variant || l.color ? `<small>${[l.variant?.label, l.color?.name].filter(Boolean).map(esc).join(' · ')}</small>` : ''}</span>
              <span>${euro(l.total)}</span>
            </div>`).join('')}
        </div>
        <div class="sum-row"><span>Subtotal</span><span>${euro(t.subtotal)}</span></div>
        <div class="sum-row"><span>Envio</span><span>${t.shipping ? euro(t.shipping) : 'Grátis'}</span></div>
        <div class="sum-row total"><span>Total</span><span>${euro(t.total)}</span></div>
        <p class="muted" style="font-size:13px">IVA incluído. <a href="/carrinho.html">Editar carrinho</a></p>
      </aside>
    </div>
    <div class="section-sm"></div>`;

  reveal();
  page.querySelector('#form').addEventListener('submit', submit);
}

function fail(msg, field) {
  const err = page.querySelector('#err');
  err.textContent = msg;
  err.classList.add('show');
  if (field) field.focus();
  else err.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function submit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const err = page.querySelector('#err');
  err.classList.remove('show');
  const f = Object.fromEntries(new FormData(form));
  Object.keys(f).forEach((k) => { f[k] = String(f[k]).trim(); });

  const req = [['name', 'Indique o seu nome.'], ['email', 'Indique o seu email.'], ['phone', 'Indique o seu telemóvel.'], ['address', 'Indique a morada.'], ['postal_code', 'Indique o código postal.'], ['city', 'Indique a localidade.']];
  for (const [k, msg] of req) if (!f[k]) return fail(msg, form.elements[k]);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return fail('O email não parece válido.', form.elements.email);
  if (f.country === 'Portugal' && !/^\d{4}-?\d{3}$/.test(f.postal_code)) return fail('O código postal deve ter o formato 0000-000.', form.elements.postal_code);
  if (f.nif && !/^\d{9}$/.test(f.nif)) return fail('O NIF deve ter 9 dígitos.', form.elements.nif);
  if (!form.querySelector('#f-terms').checked) return fail('Tem de aceitar os termos e condições.', form.querySelector('#f-terms'));

  const btn = form.querySelector('#submit');
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> A processar…';

  try {
    let order;
    if (!hasBackend) {
      await new Promise((r) => setTimeout(r, 600));
      const lines = cart.lines(cat);
      order = saveOrder(lines, cart.totals(lines, cat.settings), f);
    } else {
      const sb = await supabase();
      const items = cart.items().map((i) => ({ product_id: i.product_id, variant_id: i.variant_id || null, color_id: i.color_id || null, qty: i.qty }));
      const { data, error } = await sb.rpc('place_order', { items, customer: f });
      if (error) throw error;
      order = data;
    }
    cart.clear();
    success(order, f);
  } catch (ex) {
    btn.disabled = false;
    btn.innerHTML = label;
    fail(String(ex?.message || 'Não foi possível concluir a encomenda. Tente novamente.'));
  }
}

function success(order, f) {
  window.removeEventListener('cart:change', render);
  const payInfo = {
    mbway: `Vai receber um pedido MB WAY no número <b>${esc(f.phone)}</b>.`,
    multibanco: 'Vai receber por email a entidade e a referência Multibanco.',
    transferencia: 'Vai receber por email os dados para a transferência bancária.',
    entrega: 'Pagará no momento da entrega.',
  }[f.payment_method] || '';
  page.innerHTML = `
    <div class="auth">
      <div class="auth-card fade-in" style="text-align:center">
        <img class="success-mark" src="/img/icone.png" alt="" width="96" height="96">
        <h1>Obrigado pela sua encomenda!</h1>
        <p>Encomenda <b>#${esc(order.number)}</b> · Total ${euro(order.total)}</p>
        <p class="muted">${payInfo} Enviámos a confirmação para <b>${esc(f.email)}</b>.</p>
        <div style="display:grid;gap:10px;margin-top:24px">
          ${user ? '<a class="btn btn-block" href="/conta.html">Ver as minhas encomendas</a>' : ''}
          <a class="btn ${user ? 'btn-ghost' : ''} btn-block" href="/">Voltar à loja</a>
        </div>
      </div>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Encomenda registada com sucesso.');
}

window.addEventListener('cart:change', render);
render();
