function mostrarAviso(texto) {
  let aviso = document.getElementById('aviso-flutuante');
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.id = 'aviso-flutuante';
    aviso.className = 'fixed bottom-6 right-6 z-50 max-w-sm bg-primary text-on-primary text-label-md font-label-md px-4 py-3 rounded-lg shadow-lg transition-opacity duration-300';
    document.body.appendChild(aviso);
  }
  aviso.textContent = texto;
  aviso.style.opacity = '1';
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => { aviso.style.opacity = '0'; }, 3200);
}

function ligarBotoesSemAcao() {
  const avisos = {
    settings: 'Configurações ainda não estão disponíveis nesta versão.',
    help_center: 'Ajuda e suporte ainda não estão disponíveis nesta versão.',
    notifications: 'Você não tem notificações novas.',
    help: 'Fluxo: Briefing, Conceitos, Adaptações, Editor e Revisão.'
  };
  document.querySelectorAll('button').forEach((botao) => {
    if (botao.hasAttribute('onclick') || botao.getAttribute('type') === 'submit' || botao.id) return;
    const icone = botao.querySelector('.material-symbols-outlined');
    const chave = icone ? icone.textContent.trim() : '';
    if (avisos[chave]) {
      botao.addEventListener('click', () => mostrarAviso(avisos[chave]));
    } else if (botao.textContent.includes('+ Região')) {
      botao.addEventListener('click', () => mostrarAviso('Nesta versão as peças são geradas para Pernambuco e São Paulo.'));
    }
  });
}

function ligarFiltrosBiblioteca() {
  const filtros = Array.from(document.querySelectorAll('#view-biblioteca button')).filter((b) =>
    ['Todas', 'Dermocosméticos', 'Verão', 'Sempre Bem'].includes(b.textContent.trim())
  );
  if (!filtros.length) return;
  const grade = filtros[0].closest('div.mb-4').nextElementSibling;
  const cartoes = Array.from(grade.children);
  const etiquetas = [
    'vitaminas saúde bem-estar circuito',
    'dermocosméticos dermacenter pele',
    'sempre bem família festival'
  ];
  cartoes.forEach((cartao, i) => { cartao.dataset.etiquetas = etiquetas[i] || ''; });

  const vazio = document.createElement('p');
  vazio.className = 'hidden col-span-full text-body-md font-body-md text-outline py-6 text-center';
  vazio.textContent = 'Nenhuma campanha aprovada nesta categoria ainda.';
  grade.appendChild(vazio);

  const estiloAtivo = 'px-3 py-1 rounded-full bg-primary text-on-primary text-label-sm font-label-sm font-semibold';
  const estiloInativo = 'px-3 py-1 rounded-full bg-surface-container text-on-surface text-label-sm font-label-sm hover:bg-surface-container-high';

  window.filtrarBiblioteca = function (termo) {
    const busca = termo.trim().toLowerCase();
    let visiveis = 0;
    cartoes.forEach((cartao) => {
      const texto = (cartao.textContent + ' ' + cartao.dataset.etiquetas).toLowerCase();
      const mostrar = !busca || texto.includes(busca);
      cartao.classList.toggle('hidden', !mostrar);
      if (mostrar) visiveis += 1;
    });
    vazio.classList.toggle('hidden', visiveis > 0);
  };

  filtros.forEach((botao) => {
    botao.addEventListener('click', () => {
      filtros.forEach((outro) => { outro.className = outro === botao ? estiloAtivo : estiloInativo; });
      const nome = botao.textContent.trim();
      window.filtrarBiblioteca(nome === 'Todas' ? '' : nome);
    });
  });
}

function ligarBuscaSuperior() {
  const campo = document.querySelector('header input[type="text"]');
  if (!campo) return;
  campo.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    navigateToView('biblioteca');
    window.filtrarBiblioteca(campo.value);
  });
}

function atualizarRevisao() {
  const conceito = estado.conceitos[estado.conceitoAtivo];
  if (!conceito) return;
  conceito.pecas.forEach((peca, i) => {
    const linha = document.getElementById('row-peca-' + (i + 1));
    if (!linha) return;
    const blocos = linha.querySelectorAll('td:first-child > div:last-child > div');
    if (blocos.length < 2) return;
    blocos[0].textContent = peca.canal + ' ' + (peca.regiao === 'São Paulo' ? 'SP' : 'PE') + ' · ' + (peca.canal === 'Instagram' ? 'Post Feed 4:5' : 'Mensagem');
    blocos[1].textContent = peca.titulo;
  });
}

const navegarOriginal = window.navigateToView;
window.navigateToView = function (id) {
  if (id === 'revisao') atualizarRevisao();
  navegarOriginal(id);
};

window.aprovarTodasPecas = function () {
  for (let i = 1; i <= 4; i++) decidirPeca(i, 'Aprovada');
  mostrarAviso('As 4 peças foram marcadas como aprovadas.');
};

document.addEventListener('DOMContentLoaded', function () {
  ligarBotoesSemAcao();
  ligarFiltrosBiblioteca();
  ligarBuscaSuperior();
});
