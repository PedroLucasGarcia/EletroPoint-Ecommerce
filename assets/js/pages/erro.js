import { initLayout, emptyState, icons } from '../layout.js';
document.getElementById('page').innerHTML = emptyState({
  title: 'Página não encontrada',
  text: 'O endereço que procura não existe ou foi alterado. Explore o nosso catálogo.',
  cta: { href: '/', label: 'Voltar à página inicial' },
  icon: icons.search,
});
initLayout();
