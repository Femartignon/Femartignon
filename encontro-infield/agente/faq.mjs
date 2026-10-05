// Modo base de conhecimento do Assistente Infield: responde sem modelo de IA.
// Lê a mesma SSOT (conhecimento.md) e as mesmas ferramentas ao vivo do modo Claude,
// escolhendo a resposta por palavras-chave. Usado quando não há ANTHROPIC_API_KEY.

import { readFileSync } from 'node:fs';
import { ferramentas } from './ferramentas.mjs';

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
      atual.linhas.push(linha.trim());
    }
  }
  return secoes.filter((s) => s.titulo !== 'Como ler esta base');
}

const BASE = lerBase(readFileSync(new URL('./conhecimento.md', import.meta.url), 'utf8'));

const normaliza = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Palavras-chave por seção (sem acento). O título da seção também conta,
// então uma seção nova na base já é encontrada pelas palavras do próprio título.
const PALAVRAS = {
  'Evento': ['evento', 'endereco', 'onde fica', 'local', 'tema', 'datas', 'quando e', 'quem participa', 'participantes', 'estagiario', 'terceiro', 'hotel fica'],
  'Agenda': ['agenda', 'programacao', 'cronograma', 'abertura', 'plenaria', 'festa', 'encerramento', 'lideranca', 'treinamento', 'atividade', 'que horas', 'horario', 'programa'],
  'Credenciamento': ['credenciamento', 'cracha', 'credencial', 'registro'],
  'Traje (dress code)': ['traje', 'roupa', 'dress', 'vestir', 'vestimenta', 'look'],
  'Hospedagem': ['hospedagem', 'check-in', 'checkin', 'check in', 'check-out', 'checkout', 'check out', 'quarto', 'apartamento', 'early', 'late', 'bagagem', 'mala'],
  'Refeições': ['refeicao', 'refeicoes', 'jantar', 'almoco', 'cafe', 'comida', 'restaurante', 'comer', 'reembolso', 'cartao corporativo'],
  'Vacinação (ação interna)': ['vacina', 'vacinacao', 'dengue', 'dose'],
  'Segurança': ['seguranca', 'emergencia', 'saida de emergencia', 'perigo', 'roubo'],
  'Viagem aérea': ['voo', 'aereo', 'aerea', 'passagem', 'embarque', 'companhia', 'localizador', 'assento', 'aeroporto'],
  'Chegada ao Rio, transfer e hotel': ['transfer', 'traslado', 'chegada', 'buscar', ' van', 'onibus'],
  'App do evento': ['app', 'aplicativo', 'login', 'senha', 'sso', 'menu'],
  'Contatos': ['contato', 'suporte', 'ajuda', 'falar com', 'telefone', 'organizacao'],
};

const INTENCOES = {
  clima: ['clima', 'chuva', 'chover', 'previsao do tempo', 'como esta o tempo', 'temperatura', 'calor', 'frio', 'previsao', 'guarda-chuva', 'ensolarado'],
  transito: ['transito', 'trajeto', 'quanto tempo leva', 'demora', 'engarrafamento', 'galeao', 'gig', 'sdu', 'santos dumont'],
  contagem: ['quantos dias', 'falta', 'faltam', 'quando comeca', 'contagem'],
};

// Palavras de título genéricas demais para indicar uma seção sozinhas
const GENERICAS = ['hotel', 'evento', 'acao', 'interna', 'chegada'];

const FORA_DO_ESCOPO = ['medicamento', 'remedio', 'doenca', 'tratamento', 'estudo clinico', 'bula', 'posologia', 'dosagem', 'concorrente', 'meta comercial', 'preco'];

const tem = (texto, termos) => termos.some((t) => texto.includes(t));

// "A CONFIRMAR" vira uma frase clara para o participante
const linhaParaTexto = (linha) => linha.replace(/\bA CONFIRMAR\b/g, '**ainda não divulgado**');

function formataSecao(secao) {
  return `**${secao.titulo}**\n${secao.linhas.map(linhaParaTexto).join('\n')}`;
}

export function escolherSecoes(pergunta) {
  const q = normaliza(pergunta);
  return BASE.map((s) => {
    const doTitulo = normaliza(s.titulo).split(/[^a-z]+/).filter((p) => p.length > 3 && !GENERICAS.includes(p));
    const termos = [...(PALAVRAS[s.titulo] ?? []), ...doTitulo];
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

export async function responderPelaBase(pergunta) {
  const q = normaliza(pergunta);

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
    return `Não encontrei essa informação na base do evento. ${SUGESTAO}\n\nPara outras dúvidas, fale com a organização pelo menu **Mais › Suporte da Agência**.`;
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
