import { initLayout } from '../layout.js';
import { hasBackend, supabase, getUser, authError } from '../store.js';
import { reveal } from '../reveal.js';
import { authCard, pwField, wirePasswordToggles, showAlert, busy, safeNext, demoNotice } from '../auth-ui.js';

const page = document.getElementById('page');
await initLayout();
const next = safeNext();

if (await getUser().catch(() => null)) location.replace(next);

page.innerHTML = authCard({
  title: 'Criar conta.',
  text: 'Guarde as suas moradas e acompanhe todas as encomendas num só lugar.',
  body: `
    <form id="form" novalidate>
      ${demoNotice()}
      <div class="field"><label for="name">Nome</label><input id="name" name="name" autocomplete="name" required maxlength="120"></div>
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="160"></div>
      ${pwField('password', 'Palavra-passe', 'new-password', 'aria-describedby="pw-hint"')}
      <span class="hint muted" id="pw-hint" style="font-size:13px;margin-top:-8px">Mínimo de 8 caracteres.</span>
      <label class="check"><input type="checkbox" id="terms" required> <span>Aceito os termos e condições e a política de privacidade.</span></label>
      <div class="alert" id="msg" role="alert"></div>
      <button class="btn btn-lg btn-block" type="submit" id="submit"${hasBackend ? '' : ' disabled'}>Criar conta</button>
    </form>`,
  alt: `Já tem conta? <a href="/login.html"><b>Entrar</b></a>`,
});
reveal();
wirePasswordToggles(page);

const form = page.querySelector('#form');
const msg = page.querySelector('#msg');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!name) return showAlert(msg, 'Indique o seu nome.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAlert(msg, 'O email não parece válido.');
  if (password.length < 8) return showAlert(msg, 'A palavra-passe deve ter pelo menos 8 caracteres.');
  if (!form.querySelector('#terms').checked) return showAlert(msg, 'Tem de aceitar os termos e condições.');
  await busy(form.querySelector('#submit'), async () => {
    const sb = await supabase();
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: `${location.origin}${next}` },
    });
    if (error) return showAlert(msg, authError(error));
    if (data.session) { location.replace(next); return; }
    page.querySelector('.auth-card').innerHTML = `
      <img class="success-mark" src="/img/icone.png" alt="" width="96" height="96">
      <h1>Confirme o seu email.</h1>
      <p>Enviámos uma ligação de confirmação para <b>${email.replace(/[<>&"]/g, '')}</b>. Abra-a para ativar a conta.</p>
      <a class="btn btn-block" href="/login.html">Ir para o login</a>`;
  });
});
