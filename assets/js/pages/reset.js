import { initLayout, toast } from '../layout.js';
import { hasBackend, supabase, authError } from '../store.js';
import { reveal } from '../reveal.js';
import { authCard, pwField, wirePasswordToggles, showAlert, busy, demoNotice } from '../auth-ui.js';

const page = document.getElementById('page');
await initLayout();
wirePasswordToggles(page);

// O link do email traz tokens no URL; o cliente Supabase troca-os por uma sessão
// e emite o evento PASSWORD_RECOVERY.
const fromEmail = /type=recovery|access_token|code=/.test(location.hash + location.search);
const sb = await supabase();
let shown = false;

if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (fromEmail && session)) newPasswordForm();
  });
  const { data } = await sb.auth.getSession();
  if (fromEmail && data.session) newPasswordForm();
}
if (!shown) {
  if (fromEmail && sb) {
    page.innerHTML = '<div class="page-loader"><div class="spinner dark"></div></div>';
    // se o token for inválido/expirado, mostra o pedido normal após alguns segundos
    setTimeout(() => { if (!shown) requestForm('A ligação expirou ou já foi usada. Peça uma nova.'); }, 4000);
  } else requestForm();
}

function requestForm(error = '') {
  page.innerHTML = authCard({
    title: 'Recuperar acesso.',
    text: 'Indique o email da sua conta e enviamos uma ligação para definir uma nova palavra-passe.',
    body: `
      <form id="form" novalidate>
        ${demoNotice()}
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="160"></div>
        <div class="alert" id="msg" role="alert"></div>
        <button class="btn btn-lg btn-block" type="submit" id="submit"${hasBackend ? '' : ' disabled'}>Enviar ligação</button>
      </form>`,
    alt: '<a href="/login.html">Voltar ao login</a>',
  });
  reveal();
  const form = page.querySelector('#form');
  const msg = page.querySelector('#msg');
  if (error) showAlert(msg, error);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAlert(msg, 'O email não parece válido.');
    await busy(form.querySelector('#submit'), async () => {
      const { error: err } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password.html` });
      if (err) return showAlert(msg, authError(err));
      // mesma mensagem exista ou não a conta (não revela emails registados)
      showAlert(msg, 'Se existir uma conta com este email, vai receber uma ligação dentro de minutos. Verifique também o spam.', 'ok');
      form.email.disabled = true;
    });
  });
}

function newPasswordForm() {
  if (shown) return;
  shown = true;
  page.innerHTML = authCard({
    title: 'Nova palavra-passe.',
    text: 'Escolha uma palavra-passe nova para a sua conta.',
    body: `
      <form id="form" novalidate>
        ${pwField('password', 'Nova palavra-passe', 'new-password')}
        ${pwField('confirm', 'Confirmar palavra-passe', 'new-password')}
        <div class="alert" id="msg" role="alert"></div>
        <button class="btn btn-lg btn-block" type="submit" id="submit">Guardar palavra-passe</button>
      </form>`,
  });
  reveal();
  const form = page.querySelector('#form');
  const msg = page.querySelector('#msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = form.password.value;
    if (pw.length < 8) return showAlert(msg, 'A palavra-passe deve ter pelo menos 8 caracteres.');
    if (pw !== form.confirm.value) return showAlert(msg, 'As palavras-passe não coincidem.');
    await busy(form.querySelector('#submit'), async () => {
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) return showAlert(msg, authError(error));
      history.replaceState(null, '', '/reset-password.html');
      toast('Palavra-passe atualizada.');
      setTimeout(() => location.replace('/conta.html'), 900);
    });
  });
}
