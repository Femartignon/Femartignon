// Modo base de conhecimento do Assistente Infield: responde sem modelo de IA.
// Lê a mesma SSOT (conhecimento.md) e as mesmas ferramentas ao vivo do modo Claude,
// escolhendo a resposta por palavras-chave. Usado quando não há ANTHROPIC_API_KEY.

import { ferramentas } from './ferramentas.mjs';
import { lerConhecimento } from './base.mjs';

// Tabelas viram itens de lista, com os títulos das colunas:
//   | Sala | 17/11 | 18/11 |  +  | BU X | 8h–12h | — |   →   "- BU X — 17/11: 8h–12h"
// Tabela de duas colunas vira "- chave: valor". Células vazias ou "—" são omitidas.
const SEPARADOR = /^\|[\s:|-]+\|$/;
const celulas = (linha) => linha.split('|').slice(1, -1).map((c) => c.trim());

function converteTabela(bloco) {
  const [cabecalho, ...linhas] = bloco.filter((l) => !SEPARADOR.test(l)).map(celulas);
  return linhas.map(([chave, ...valores]) => {
    const itens = valores
      .map((v, j) => ({ titulo: cabecalho[j + 1], valor: v }))
      .filter(({ valor }) => valor && valor !== '—' && valor !== '-');
    if (cabecalho.length <= 2) return `- ${chave}: ${itens.map((i) => i.valor).join('; ')}`.replace(/: $/, '');
    return itens.length
      ? `- ${chave} — ${itens.map((i) => `${i.titulo}: ${i.valor}`).join('; ')}`
      : `- ${chave}`;
  });
}

function tabelaParaLista(linhas) {
  const saida = [];
  let i = 0;
  while (i < linhas.length) {
    if (!linhas[i].startsWith('|')) {
      saida.push(linhas[i++]);
      continue;
    }
    const bloco = [];
    while (i < linhas.length && linhas[i].startsWith('|')) bloco.push(linhas[i++]);
    saida.push(...converteTabela(bloco));
  }
  return saida;
}

// Seções internas da base, que orientam o assistente mas não são exibidas ao participante
const INTERNAS = ['regras para o assistente', 'como ler esta base'];

// Seções "## Título" da base → { titulo, linhas }
export function lerBase(texto) {
  const secoes = [];
  let atual = null;
  for (const linha of texto.replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
    const h = linha.match(/^##\s+(.+)/);
    if (h) {
      atual = { titulo: h[1].trim(), linhas: [] };
      secoes.push(atual);
    } else if (atual && linha.trim()) {
      // Subtítulos (###) viram rótulo em negrito, sem o símbolo
      const sub = linha.trim().match(/^###\s+(.+)/);
      atual.linhas.push(sub ? `**${sub[1]}**` : linha.trim());
    }
  }
  return secoes
    .filter((s) => !INTERNAS.some((t) => normaliza(s.titulo).startsWith(t)))
    .map((s) => ({ ...s, linhas: tabelaParaLista(s.linhas) }));
}

const normaliza = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const BASE = lerBase(lerConhecimento());

// Palavras-chave por seção (sem acento), ligadas pelo início do título da seção
// ("Agenda" vale para "Agenda (previsto)"). O título também conta, então uma seção
// nova na base já é encontrada pelas palavras do próprio título.
const PALAVRAS = {
  'Evento': ['evento', 'endereco', 'tema', 'datas', 'quando e', 'quem participa', 'participantes', 'estagiario', 'terceiro', 'hotel fica'],
  'Agenda': ['agenda', 'programacao', 'cronograma', 'abertura', 'plenaria', 'festa', 'encerramento', 'lideranca', 'treinamento', 'atividade', 'que horas', 'horario', 'programa', 'sala', 'salas', ' bu ', 'bus', 'grupo', 'lagoa', 'ballroom', 'world cafe', 'hemato', 'onco', 'raras', 'specialty', 'market access', 'gastro', 'retail', 'medical affairs', 'msl'],
  'Credenciamento': ['credenciamento', 'cracha', 'credencial', 'registro'],
  'Traje': ['traje', 'roupa', 'dress', 'vestir', 'vestimenta', 'look', 'agasalho', 'casaco', 'blusa', 'ar condicionado', 'o que levar'],
  'Hospedagem': ['hospedagem', 'check-in', 'checkin', 'check in', 'check-out', 'checkout', 'check out', 'quarto', 'apartamento', 'early', 'late', 'bagagem', 'mala'],
  'Refeições': ['refeicao', 'refeicoes', 'jantar', 'almoco', 'cafe', 'comida', 'restaurante', 'comer', 'reembolso', 'cartao corporativo'],
  'Ações no evento': ['vacina', 'vacinacao', 'dengue', 'dose', 'voluntariado', 'natal', 'totem', 'presidente', 'cafe com', 'qr code'],
  'Vacinação': ['vacina', 'vacinacao', 'dengue', 'dose'],
  'Segurança': ['seguranca', 'emergencia', 'saida de emergencia', 'perigo', 'roubo'],
  'Viagem aérea': ['voo', 'aereo', 'aerea', 'passagem', 'embarque', 'companhia', 'localizador', 'assento', 'aeroporto', 'franquia', 'franquia de bagagem', 'quantos kg', 'peso da mala', 'mochila'],
  'Transfer': ['transfer', 'traslado', 'receptivo', 'chegada', 'buscar', ' van', 'onibus', 'saida do hotel'],
  'App': ['app', 'aplicativo', 'login', 'senha', 'sso', 'menu'],
  'Contatos': ['contato', 'suporte', 'ajuda', 'falar com', 'telefone', 'organizacao'],
};

const INTENCOES = {
  clima: ['clima', 'chuva', 'chover', 'previsao do tempo', 'como esta o tempo', 'temperatura', 'calor', 'frio', 'previsao', 'guarda-chuva', 'ensolarado'],
  transito: ['transito', 'trajeto', 'quanto tempo leva', 'demora', 'engarrafamento', 'galeao', 'gig', 'sdu', 'santos dumont'],
  contagem: ['quantos dias', 'falta', 'faltam', 'quando comeca', 'contagem'],
};

// Palavras de título genéricas demais para indicar uma seção sozinhas
const GENERICAS = ['hotel', 'evento', 'acao', 'interna', 'chegada', 'previsto', 'contra'];

const FORA_DO_ESCOPO = ['medicamento', 'remedio', 'doenca', 'tratamento', 'estudo clinico', 'bula', 'posologia', 'dosagem', 'concorrente', 'meta comercial', 'preco'];

const tem = (texto, termos) => termos.some((t) => texto.includes(t));

// "A CONFIRMAR" vira uma frase clara para o participante
const linhaParaTexto = (linha) => linha.replace(/\bA CONFIRMAR\b/g, '**ainda não divulgado**');

function formataSecao(secao) {
  return `**${secao.titulo}**\n${secao.linhas.map(linhaParaTexto).join('\n')}`;
}

export function escolherSecoes(pergunta) {
  const q = ` ${normaliza(pergunta)} `;
  return BASE.map((s) => {
    const doTitulo = normaliza(s.titulo).split(/[^a-z]+/).filter((p) => p.length > 3 && !GENERICAS.includes(p));
    const chave = Object.keys(PALAVRAS).find((k) => normaliza(s.titulo).startsWith(normaliza(k)));
    const termos = [...(PALAVRAS[chave] ?? []), ...doTitulo];
    const pontos = termos.reduce((n, t) => n + (q.includes(t) ? t.length : 0), 0);
    return { s, pontos };
  })
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .filter((x, i, todas) => i === 0 || (i === 1 && x.pontos >= todas[0].pontos * 0.75))
    .map((x) => x.s);
}

async function respostaClima() {
  const d = await ferramentas.clima.execute({ dias: 3 });
  const dias = d.previsao.map((p) => `- ${p.dia.split('-').reverse().slice(0, 2).join('/')}: ${p.condicao}, ${Math.round(p.min_c)}–${Math.round(p.max_c)} °C, chance de chuva ${p.chance_chuva_pct}%`);
  return [`Agora no **${d.local}**: ${d.agora.condicao}, **${Math.round(d.agora.temperatura_c)} °C** (sensação de ${Math.round(d.agora.sensacao_c)} °C).`, '', 'Próximos dias:', ...dias].join('\n');
}

async function respostaTransito() {
  const d = await ferramentas.transito.execute({});
  const hora = d.consultado_em ? new Date(d.consultado_em).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : null;
  const linhas = d.trajetos.map((t) => `- ${t.aeroporto}: **${t.minutos_agora} min** (trânsito ${t.transito}${t.atraso_por_transito_min ? `, +${t.atraso_por_transito_min} min` : ''})`);
  return [`Tempo de carro agora até o **${d.destino}**${hora ? ` (consulta às ${hora})` : ''}:`, ...linhas, '', 'Horários de transfer: menu **Mais › Logística do Evento**.'].join('\n');
}

async function respostaContagem() {
  const c = await ferramentas.data_e_contagem.execute({});
  if (c.dias_para_o_evento > 0) return `Faltam **${c.dias_para_o_evento} dias** para o Encontro Infield 2026, de ${c.periodo_evento}.`;
  if (c.dias_para_o_evento === 0) return `É hoje! O Encontro Infield 2026 começa hoje e vai de ${c.periodo_evento}.`;
  return `O Encontro Infield 2026 já começou: ${c.periodo_evento}.`;
}

const SUGESTAO = 'Posso ajudar com agenda, hotel, refeições, voo, transfer, vacinação, segurança, app, clima e trânsito.';

// Conversas do dia a dia: respostas da seção "Regras para o assistente".
// Só casa a mensagem inteira (sem pontuação), para não engolir perguntas reais.
const CONVERSA = [
  [['oi', 'ola', 'oii', 'e ai', 'hey', 'opa'], 'Olá! Como posso ajudar?'],
  [['bom dia'], 'Bom dia! Como posso ajudar?'],
  [['boa tarde'], 'Boa tarde! Como posso ajudar?'],
  [['boa noite'], 'Boa noite! Como posso ajudar?'],
  [['tudo bem', 'como vai', 'tudo bem como vai'], 'Tudo ótimo por aqui, obrigado por perguntar! E com você? Em que posso ajudar sobre o Encontro?'],
  [['obrigado', 'obrigada', 'valeu', 'brigado', 'show', 'perfeito'], 'Imagina! Se precisar de mais alguma coisa, é só chamar.'],
  [['tchau', 'ate mais', 'ate logo', 'falou'], 'Até mais! Aproveite o Encontro Infield.'],
  [['ok', 'certo', 'entendi', 'beleza'], 'Combinado! Precisa de mais alguma coisa?'],
  [['quem e voce', 'o que voce faz', 'como funciona'], 'Sou o Assistente Infield, o help desk do Encontro Infield 2026 aqui no app. Posso tirar dúvidas sobre agenda, salas, voo, transfer, hospedagem, refeições, segurança e uso do app. Como posso ajudar?'],
  [['ajuda', 'menu', 'o que posso perguntar'], 'Pode me perguntar, por exemplo: Onde é a minha sala? Que horas começa a plenária? Como chego ao hotel? Qual o horário de check-in? Onde é a vacinação?'],
  [['voce e otimo', 'voce ajudou muito', 'ajudou muito'], 'Que bom que ajudei! Estou por aqui se precisar.'],
  [['quero falar com uma pessoa', 'falar com alguem', 'falar com uma pessoa'], 'Claro! Você pode falar com a agência pelo menu Mais › Suporte da Agência ou procurar a equipe do evento, identificada em todos os ambientes do hotel.'],
];

// Mensagem inteira sem pontuação (ex.: "Oi!" → "oi")
const semPontuacao = (s) => normaliza(s).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

export async function responderPelaBase(pergunta) {
  const q = ` ${normaliza(pergunta)} `;
  const simples = semPontuacao(pergunta);

  const conversa = CONVERSA.find(([frases]) => frases.includes(simples));
  if (conversa) return conversa[1];
  if (simples.replace(/ /g, '').length < 2) {
    return 'Não entendi bem. Pode me contar com um pouco mais de detalhe o que você precisa?';
  }

  if (tem(q, FORA_DO_ESCOPO) && !tem(q, ['vacina'])) {
    return `Esse tema não é tratado por este assistente. Para esse assunto, procure a área responsável da Takeda.\n\n${SUGESTAO}`;
  }

  const partes = [];
  const ao_vivo = [
    [INTENCOES.clima, respostaClima, 'A previsão do tempo está indisponível no momento.'],
    [INTENCOES.transito, respostaTransito, 'O trânsito ao vivo está indisponível no momento. Consulte Mais › Logística do Evento.'],
    [INTENCOES.contagem, respostaContagem, null],
  ];
  for (const [termos, fn, falha] of ao_vivo) {
    if (!tem(q, termos)) continue;
    try {
      partes.push(await fn());
    } catch (e) {
      console.error('[agente:base]', e);
      if (falha) partes.push(falha);
    }
  }

  // Pergunta sobre o evento (não ao vivo): responde com a seção mais próxima da base
  if (!partes.length) partes.push(...escolherSecoes(pergunta).map(formataSecao));

  if (!partes.length) {
    return `Essa informação ainda não está comigo. Acompanhe o Feed e as Notificações do app, ou fale com a agência em **Mais › Suporte da Agência**. ${SUGESTAO}`;
  }
  return partes.join('\n\n');
}

// Mesmo contrato do modo Claude: resposta em texto simples
export async function responderSemModelo(conversa) {
  const texto = await responderPelaBase(conversa.at(-1).content);
  return new Response(texto, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
