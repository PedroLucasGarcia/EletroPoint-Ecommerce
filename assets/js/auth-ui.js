// Peças partilhadas pelas páginas de autenticação (login, registo, reset)
import { hasBackend } from './store.js';

export const demoNotice = () => (hasBackend ? '' : `<div class="alert info show">Modo de demonstração: as contas ficam disponíveis depois de ligar a loja ao Supabase (ver README).</div>`);

export function authCard({ title, text = '', body, alt = '' }) {
  return `
    <section class="auth">
      <div class="auth-card" data-rv>
        <h1>${title}</h1>
        ${text ? `<p>${text}</p>` : ''}
        ${body}
        ${alt ? `<p class="alt">${alt}</p>` : ''}
      </div>
    </section>`;
}

export const pwField = (id, label, autocomplete = 'current-password', extra = '') => `
  <div class="field">
    <label for="${id}">${label}</label>
    <div class="pw">
      <input id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" required minlength="8" maxlength="72" ${extra}>
      <button type="button" data-toggle-pw aria-label="Mostrar palavra-passe">Mostrar</button>
    </div>
  </div>`;

export function wirePasswordToggles(root = document) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-toggle-pw]');
    if (!b) return;
    const input = b.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Ocultar' : 'Mostrar';
    b.setAttribute('aria-label', show ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe');
  });
}

export function showAlert(el, msg, kind = 'error') {
  el.className = `alert ${kind} show`;
  el.textContent = msg;
}

export async function busy(btn, fn) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Aguarde…';
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = label; }
}

// Só aceita caminhos internos (evita redirecionamentos abertos)
export function safeNext(fallback = '/conta.html') {
  const n = new URLSearchParams(location.search).get('next') || '';
  return /^\/(?!\/)[^\s\\]*$/.test(n) ? n : fallback;
}
