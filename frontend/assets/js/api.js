const API_BASE = location.protocol.startsWith('http') && location.port !== '5500' ? '' : 'http://127.0.0.1:8000';

const PECAS_ORDEM = ['instagram_pe', 'whatsapp_pe', 'instagram_sp', 'whatsapp_sp'];

const AJUSTES_RAPIDOS = {
  conciso: 'Torne o texto mais conciso e direto, destacando o benefício principal e a chamada para ação.',
  hidratacao: 'Foque nos benefícios de hidratação intensa depois da praia.',
  whatsapp: 'Adapte o estilo para disparo no WhatsApp, com leitura rápida e emojis funcionais, sem inventar cupom ou preço.'
};

const estado = {
  briefing: null,
  conceitos: {},
  conceitoAtivo: 'A',
  pecaAtual: null,
  anterior: null,
  comparando: false,
  ocupado: false
};

const carregarNoEditorOriginal = window.carregarNoEditor;
const selecionarConceitoOriginal = window.selecionarConceito;

async function chamarApi(caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(API_BASE + caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
  } catch (erro) {
    throw new Error('Não foi possível falar com o servidor. Ele está rodando em http://127.0.0.1:8000?');
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = typeof dados.detail === 'string' ? dados.detail : 'Erro inesperado no servidor.';
    throw new Error(detalhe);
  }
  return dados;
}

function lerBriefing() {
  const valor = (id) => document.getElementById(id).value.trim();
  return {
    nome: valor('input-campanha-nome') || 'Campanha Pague Menos',
    objetivo: valor('input-campanha-obj'),
    tom: valor('input-campanha-tom'),
    produtos: valor('input-campanha-produtos'),
    publico: valor('input-campanha-publico'),
    regioes: ['Pernambuco', 'São Paulo'],
    canais: ['Instagram', 'WhatsApp']
  };
}

function urlImagem(caminho) {
  return API_BASE + caminho;
}

function mostrarCarregando(container, ativo, texto) {
  let camada = container.querySelector('[data-carregando]');
  if (!ativo) {
    if (camada) camada.remove();
    return;
  }
  if (!camada) {
    camada = document.createElement('div');
    camada.setAttribute('data-carregando', '');
    camada.className = 'absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-primary text-label-md font-label-md font-semibold text-center px-4';
    container.appendChild(camada);
  }
  camada.textContent = texto || 'Gerando imagem com IA...';
}

function cartaoConceito(letra) {
  return document.getElementById('card-conceito-' + letra.toLowerCase());
}

function preencherConceito(letra, dados) {
  const cartao = cartaoConceito(letra);
  cartao.querySelector('h3').textContent = dados.titulo;
  cartao.querySelector('h3 + p').textContent = dados.descricao;
  cartao.querySelector('p.bg-surface-container-low').textContent = '"' + dados.mensagem_chave + '"';
  const imagem = cartao.querySelector('img');
  imagem.src = urlImagem(dados.imagem_url);
  imagem.alt = dados.titulo;
}

async function gerarConceitos() {
  const botao = document.getElementById('btn-gerar-conceitos');
  if (estado.ocupado) return;
  estado.ocupado = true;
  const textoOriginal = botao.innerHTML;
  botao.disabled = true;
  botao.classList.add('opacity-70', 'cursor-wait');
  botao.textContent = 'Gerando conceitos...';

  estado.briefing = lerBriefing();
  estado.conceitos = {};
  const letras = ['A', 'B'];
  const imagens = letras.map((letra) => cartaoConceito(letra).querySelector('img').parentElement);
  imagens.forEach((container) => mostrarCarregando(container, true));
  navigateToView('conceitos');

  const resultados = await Promise.allSettled(
    letras.map((letra) => chamarApi('/api/campanhas', { briefing: estado.briefing, conceito: letra }))
  );

  const erros = [];
  resultados.forEach((resultado, i) => {
    mostrarCarregando(imagens[i], false);
    if (resultado.status === 'fulfilled') {
      estado.conceitos[letras[i]] = resultado.value;
      preencherConceito(letras[i], resultado.value);
    } else {
      erros.push('Conceito ' + letras[i] + ': ' + resultado.reason.message);
    }
  });

  if (erros.length) alert('Algo deu errado ao gerar:\n\n' + erros.join('\n'));
  const modelo = Object.values(estado.conceitos).some((c) => c.origem_texto === 'modelo');
  if (modelo) {
    console.warn('A IA de texto não respondeu; foram usados textos-modelo gerados a partir do briefing.');
  }

  const primeira = letras.find((letra) => estado.conceitos[letra]);
  if (primeira) {
    estado.conceitoAtivo = primeira;
    selecionarConceitoOriginal(primeira);
  }

  botao.disabled = false;
  botao.classList.remove('opacity-70', 'cursor-wait');
  botao.innerHTML = textoOriginal;
  estado.ocupado = false;
}

window.selecionarConceito = function (letra) {
  estado.conceitoAtivo = letra;
  selecionarConceitoOriginal(letra);
};

function cartoesAdaptacao() {
  const grade = document.querySelector('#view-adaptacoes div[class*="lg:grid-cols-4"]');
  return Array.from(grade.children);
}

function atualizarCartaoAdaptacao(id, titulo, texto, imagemUrl) {
  const cartao = cartoesAdaptacao()[PECAS_ORDEM.indexOf(id)];
  if (!cartao) return;

  const imagem = cartao.querySelector('img');
  if (imagem && imagemUrl) imagem.src = imagemUrl;

  if (id.startsWith('instagram')) {
    cartao.querySelector('p.font-bold.text-primary').textContent = titulo;
    cartao.querySelector('p.line-clamp-2').textContent = texto;
  } else {
    const balao = cartao.querySelector('.bg-white.rounded-lg');
    const paragrafos = balao.querySelectorAll('p');
    paragrafos[0].textContent = titulo;
    paragrafos[1].textContent = texto;
    const cupom = balao.querySelector('.bg-surface-container-low');
    if (cupom) cupom.classList.add('hidden');
  }
}

function mostrarAdaptacoes() {
  const conceito = estado.conceitos[estado.conceitoAtivo];
  if (conceito) {
    conceito.pecas.forEach((peca) => {
      atualizarCartaoAdaptacao(peca.id, peca.titulo, peca.texto, urlImagem(conceito.imagem_url));
    });
  }
  navigateToView('adaptacoes');
}

function identificarPeca(nome) {
  const texto = nome.toLowerCase();
  const canal = texto.includes('whatsapp') ? 'whatsapp' : 'instagram';
  const regiao = /\bsp\b/.test(texto) ? 'sp' : 'pe';
  return canal + '_' + regiao;
}

function pecaDoConceito(id) {
  const conceito = estado.conceitos[estado.conceitoAtivo];
  if (!conceito) return null;
  return conceito.pecas.find((peca) => peca.id === id) || null;
}

window.carregarNoEditor = function (nome) {
  const id = identificarPeca(nome);
  const peca = pecaDoConceito(id);
  if (!peca) {
    estado.pecaAtual = id;
    estado.anterior = null;
    estado.comparando = false;
    carregarNoEditorOriginal(nome);
    return;
  }

  const conceito = estado.conceitos[estado.conceitoAtivo];
  navigateToView('editor');
  estado.pecaAtual = id;
  estado.anterior = null;
  estado.comparando = false;

  document.getElementById('editor-peca-badge').textContent = nome;
  document.getElementById('editor-canvas-title').textContent = peca.titulo;
  document.getElementById('editor-canvas-desc').textContent = peca.texto;
  document.getElementById('editor-canvas-img').src = urlImagem(conceito.imagem_url);

  const faixa = document.querySelector('#editor-canvas .absolute.bottom-3');
  if (faixa) faixa.textContent = estado.briefing.nome.toUpperCase();

  const botao = document.getElementById('btn-comparador');
  botao.classList.remove('bg-primary', 'text-white');
  botao.classList.add('text-primary');

  const conversa = document.getElementById('editor-chat-messages');
  conversa.innerHTML = '';
  adicionarBalaoIa(conversa, 'Peça carregada. Peça um ajuste no texto ou use os botões rápidos.', 'Pronto para editar:');
};

function adicionarBalaoUsuario(conversa, texto) {
  const linha = document.createElement('div');
  linha.className = 'flex justify-end';
  const balao = document.createElement('div');
  balao.className = 'max-w-[85%] bg-primary-fixed text-primary p-3 rounded-xl rounded-tr-none text-body-sm font-body-sm';
  balao.textContent = '"' + texto + '"';
  linha.appendChild(balao);
  conversa.appendChild(linha);
  conversa.scrollTop = conversa.scrollHeight;
}

function adicionarBalaoIa(conversa, texto, titulo) {
  const linha = document.createElement('div');
  linha.className = 'flex justify-start';
  const balao = document.createElement('div');
  balao.className = 'max-w-[85%] bg-surface-container-low border border-outline-variant/30 text-on-surface p-3 rounded-xl rounded-tl-none text-body-sm font-body-sm space-y-1';
  const rotulo = document.createElement('span');
  rotulo.className = 'text-label-sm font-label-sm text-secondary font-bold flex items-center gap-1';
  rotulo.textContent = titulo || 'Ajuste Aplicado:';
  const corpo = document.createElement('p');
  corpo.textContent = texto;
  balao.appendChild(rotulo);
  balao.appendChild(corpo);
  linha.appendChild(balao);
  conversa.appendChild(linha);
  conversa.scrollTop = conversa.scrollHeight;
  return linha;
}

async function editarPeca(instrucao) {
  if (estado.ocupado) return;
  estado.ocupado = true;

  const conversa = document.getElementById('editor-chat-messages');
  const titulo = document.getElementById('editor-canvas-title');
  const descricao = document.getElementById('editor-canvas-desc');
  const campo = document.getElementById('input-editor-chat');

  if (estado.comparando) alternarComparador();

  adicionarBalaoUsuario(conversa, instrucao);
  const aguardando = adicionarBalaoIa(conversa, 'Ajustando o texto...', 'Trabalhando:');
  campo.disabled = true;

  const briefing = estado.briefing || lerBriefing();
  const pecaId = estado.pecaAtual || identificarPeca(document.getElementById('editor-peca-badge').textContent);
  const [canal, sigla] = pecaId.split('_');

  try {
    const resultado = await chamarApi('/api/editar', {
      instrucao,
      titulo_atual: titulo.textContent,
      texto_atual: descricao.textContent,
      canal: canal === 'whatsapp' ? 'WhatsApp' : 'Instagram',
      regiao: sigla === 'sp' ? 'São Paulo' : 'Pernambuco',
      produtos: briefing.produtos,
      tom: briefing.tom
    });

    estado.anterior = { titulo: titulo.textContent, texto: descricao.textContent };
    titulo.textContent = resultado.titulo;
    descricao.textContent = resultado.texto;
    aguardando.remove();
    adicionarBalaoIa(conversa, resultado.resumo);

    const conceito = estado.conceitos[estado.conceitoAtivo];
    atualizarCartaoAdaptacao(pecaId, resultado.titulo, resultado.texto, conceito ? urlImagem(conceito.imagem_url) : null);
    if (conceito) {
      const peca = conceito.pecas.find((p) => p.id === pecaId);
      if (peca) {
        peca.titulo = resultado.titulo;
        peca.texto = resultado.texto;
      }
    }
  } catch (erro) {
    aguardando.remove();
    adicionarBalaoIa(conversa, erro.message, 'Não deu certo:');
  } finally {
    campo.disabled = false;
    estado.ocupado = false;
  }
}

window.aplicarAjusteRapido = function (tipo) {
  editarPeca(AJUSTES_RAPIDOS[tipo]);
};

window.enviarMensagemEditor = function (evento) {
  evento.preventDefault();
  const campo = document.getElementById('input-editor-chat');
  const valor = campo.value.trim();
  if (!valor) return;
  campo.value = '';
  editarPeca(valor);
};

window.alternarComparador = function () {
  const botao = document.getElementById('btn-comparador');
  const descricao = document.getElementById('editor-canvas-desc');

  if (!estado.anterior) {
    alert('Ainda não há nenhuma edição para comparar. Peça um ajuste à IA primeiro.');
    return;
  }

  estado.comparando = !estado.comparando;
  if (estado.comparando) {
    estado.textoAtual = descricao.textContent;
    botao.classList.add('bg-primary', 'text-white');
    botao.classList.remove('text-primary');

    const antes = document.createElement('span');
    antes.className = 'line-through text-outline block mb-1';
    antes.textContent = 'Antes: "' + estado.anterior.texto + '"';
    const depois = document.createElement('strong');
    depois.className = 'text-primary block';
    depois.textContent = 'Depois (IA): "' + estado.textoAtual + '"';
    descricao.replaceChildren(antes, depois);
  } else {
    botao.classList.remove('bg-primary', 'text-white');
    botao.classList.add('text-primary');
    descricao.textContent = estado.textoAtual;
  }
};

document.addEventListener('DOMContentLoaded', function () {
  const botao = document.getElementById('btn-gerar-conceitos');
  if (botao) botao.addEventListener('click', gerarConceitos);
});
