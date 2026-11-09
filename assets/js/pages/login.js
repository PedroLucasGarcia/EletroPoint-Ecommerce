import { initLayout } from '../layout.js';
import { hasBackend, supabase, getUser, authError } from '../store.js';
import { reveal } from '../reveal.js';
import { authCard, pwField, wirePasswordToggles, showAlert, busy, safeNext, demoNotice } from '../auth-ui.js';

const page = document.getElementById('page');
await initLayout();
const next = safeNext();

if (await getUser().catch(() => null)) location.replace(next);

const nextQs = next !== '/conta.html' ? `?next=${encodeURIComponent(next)}` : '';
page.innerHTML = authCard({
  title: 'Entrar.',
  text: 'Aceda à sua conta para acompanhar encomendas e comprar mais depressa.',
  body: `
    <form id="form" novalidate>
      ${demoNotice()}
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="160"></div>
      ${pwField('password', 'Palavra-passe').replace('minlength="8" ', '')}
      <a href="/reset-password.html" style="font-size:14px;justify-self:end;margin-top:-6px">Esqueceu-se da palavra-passe?</a>
      <div class="alert" id="msg" role="alert"></div>
      <button class="btn btn-lg btn-block" type="submit" id="submit"${hasBackend ? '' : ' disabled'}>Entrar</button>
    </form>`,
  alt: `Ainda não tem conta? <a href="/registo.html${nextQs}"><b>Criar conta</b></a>`,
});
reveal();
wirePasswordToggles(page);

const form = page.querySelector('#form');
const msg = page.querySelector('#msg');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return showAlert(msg, 'Preencha o email e a palavra-passe.');
  await busy(form.querySelector('#submit'), async () => {
    const sb = await supabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return showAlert(msg, authError(error));
    showAlert(msg, 'Sessão iniciada. A redirecionar…', 'ok');
    location.replace(next);
  });
});
