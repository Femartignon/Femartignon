// Modo base de conhecimento do Assistente Infield: responde sem modelo de IA.
// Lê a mesma SSOT (conhecimento.md) e as mesmas ferramentas ao vivo do modo Claude,
// escolhendo a resposta por palavras-chave. Usado quando não há ANTHROPIC_API_KEY.

import { readFileSync } from 'node:fs';
import { ferramentas } from './ferramentas.mjs';

// Linhas de tabela markdown viram itens: "| 16/11 | Plenária |" → "- 16/11: Plenária".
// O cabeçalho (linha antes do separador |---|) e o próprio separador são descartados.
const SEPARADOR = /^\|[\s:|-]+\|$/;
function tabelaParaLista(linhas) {
  return linhas.flatMap((linha, i) => {
    if (!linha.startsWith('|')) return [linha];
    if (SEPARADOR.test(linha) || SEPARADOR.test(linhas[i + 1] ?? '')) return [];
    const [chave, ...resto] = linha.split('|').map((c) => c.trim()).filter(Boolean);
    return [resto.length ? `- ${chave}: ${resto.join(' — ')}` : `- ${chave}`];
  });
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
      atual.linhas.push(linha.trim());
    }
  }
  return secoes
    .filter((s) => !INTERNAS.some((t) => normaliza(s.titulo).startsWith(t)))
    .map((s) => ({ ...s, linhas: tabelaParaLista(s.linhas) }));
}

const normaliza = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const BASE = lerBase(readFileSync(new URL('./conhecimento.md', import.meta.url), 'utf8'));

// Palavras-chave por seção (sem acento), ligadas pelo início do título da seção.
// Casam por palavra inteira (com plural simples); termo terminado em "*" casa por prefixo.
// O título também conta, então uma seção nova na base já é encontrada pelas palavras do próprio título.
const PALAVRAS = {
  'Evento': ['evento', 'endereco', 'onde fica o hotel', 'tema', 'datas', 'quando e o encontro', 'quem participa', 'participantes', 'estagiario', 'terceiro', 'cep', 'encontro infield'],
  'Programação': ['programacao', 'cronograma', 'programa', 'agenda geral do evento', 'o que vai ter', 'resumo'],
  'Segunda': ['segunda', 'segunda-feira', '16/11', 'dia 16', 'primeiro dia'],
  'Terça': ['terca', 'terca-feira', '17/11', 'dia 17'],
  'Quarta': ['quarta', 'quarta-feira', '18/11', 'dia 18'],
  'Quinta': ['quinta', 'quinta-feira', '19/11', 'dia 19', 'ultimo dia'],
  'Plenária': ['plenaria', 'abertura oficial', 'abertura do evento'],
  'Festa': ['festa', 'encerramento', 'abada', 'balada', 'show', 'atracao'],
  'World Café': ['world cafe', 'worldcafe', 'world coffee', 'rodada', 'dupla'],
  'Jantar dos Jubilandos': ['jubil*', 'jantar de celebracao', 'homenage*', 'tempo de casa', 'anos de takeda'],
  'Reunião de Liderança': ['lideranca', 'reuniao gerencial', 'gerencial', 'almoco com o presidente', 'presidente'],
  'Agenda no app': ['agenda', 'minha agenda', 'trilha', 'meu time', 'estrela', 'fixar', 'palestrante', 'agenda de produtos', 'agenda geral'],
  'Salas': ['sala', 'planta', 'mapa', 'lagoa', 'grand ballroom', 'ballroom', 'onde fica a sala', 'andar'],
  'Credenciamento': ['credenciamento', 'cracha', 'credencial', 'registro'],
  'Traje': ['traje', 'roupa', 'dress code', 'dress', 'vestir', 'vestimenta', 'look', 'agasalho', 'casaco', 'blusa', 'ar condicionado', 'o que levar', 'o que usar'],
  'Hospedagem': ['hospedagem', 'check-in', 'checkin', 'check in', 'check-out', 'checkout', 'check out', 'quarto', 'apartamento', 'early', 'late', 'guarda-volumes', 'guarda volumes', 'diaria', 'frigobar', 'cafe da manha', 'recepcao'],
  'Refeições': ['refeicao', 'refeicoes', 'jantar', 'almoco', 'almocar', 'comida', 'restaurante', 'comer', 'tano', 'reembolso', 'cartao corporativo', 'jantar fora', 'fora do hotel', 'sair do hotel'],
  'Restrição alimentar': ['restricao alimentar', 'restricao', 'vegetarian*', 'vegan*', 'alergi*', 'intoleran*', 'gluten', 'lactose', 'dieta'],
  'Wi-Fi': ['wifi', 'wi-fi', 'wi fi', 'internet', 'rede', 'senha'],
  'Vacinação': ['vacina', 'vacinacao', 'vacinar', 'dengue', 'dose', 'qdenga'],
  'Voluntariado': ['voluntariado', 'voluntario', 'natal', 'cartao de natal', 'totem', 'campanha'],
  'Segurança': ['seguranca', 'emergencia', 'saida de emergencia', 'perigo', 'roubo', 'assalto', 'hospital', 'samu', 'policia', 'bombeiro', 'medico', 'passando mal', 'passei mal', 'ambulancia', 'cofre'],
  'Meu Voo': ['meu voo', 'voo', 'aereo', 'aerea', 'passagem', 'bilhete', 'embarque', 'localizador', 'assento', 'cartao de embarque'],
  'Alteração de voo': ['alterar', 'alteracao', 'mudar', 'mudanca', 'trocar', 'troca', 'remarcar', 'cancelar', 'antecipar', 'adiar', 'outro voo', 'alterar meu voo', 'alterar o voo', 'mudar meu voo', 'mudar o voo', 'trocar meu voo', 'trocar o voo', 'alteracao de voo', 'perdi meu voo', 'perdi o voo'],
  'Bagagem': ['bagagem', 'mala', 'franquia', 'quantos kg', 'kg', 'peso', 'mochila', 'check-in online', 'antecedencia', 'documento'],
  'Transfer': ['transfer', 'traslado', 'receptivo', 'van', 'onibus', 'saida do hotel', 'me buscar', 'buscar no aeroporto', 'uber', 'taxi'],
  'App': ['app', 'aplicativo', 'login', 'logar', 'entrar no app', 'baixar', 'takeda meetings', 'sso', 'notificacao', 'notificacoes', 'menu', 'pagina', 'funcoes', 'funcionalidade'],
  'Fundo de tela': ['fundo de tela', 'wallpaper', 'papel de parede', 'tela de bloqueio'],
  'Avaliação': ['avaliacao', 'avaliar', 'avalio', 'avaliei', 'opiniao', 'opinar', 'pesquisa', 'satisfacao', 'feedback', 'formulario de avaliacao'],
  'Ajuda': ['contato', 'suporte', 'ajuda', 'help desk', 'helpdesk', 'falar com', 'telefone', 'organizacao', 'agencia', 'quem procuro', 'com quem eu falo', 'com quem falo', 'com quem falar', 'quem pode me ajudar'],
};

const INTENCOES = {
  clima: ['clima', 'chuva', 'chover', 'previsao do tempo', 'como esta o tempo', 'temperatura', 'calor', 'frio', 'previsao', 'guarda-chuva', 'ensolarado', 'sol'],
  transito: ['transito', 'trajeto', 'quanto tempo leva', 'demora', 'engarrafamento', 'galeao', 'gig', 'sdu', 'santos dumont'],
  contagem: ['quantos dias', 'falta', 'faltam', 'quando comeca', 'contagem'],
  hoje: ['hoje', 'amanha', 'o que tem agora', 'o que esta acontecendo', 'proxima atividade', 'o que vem agora'],
};

// Palavras de título genéricas demais para indicar uma seção sozinhas
const GENERICAS = ['hotel', 'evento', 'acao', 'interna', 'chegada', 'previsto', 'contra', 'jantar', 'almoco', 'reuniao', 'abertura', 'fundo', 'tela', 'aeroporto', 'contatos'];

const FORA_DO_ESCOPO = ['medicamento', 'remedio', 'doenca', 'tratamento', 'estudo clinico', 'bula', 'posologia', 'dosagem', 'concorrente', 'meta comercial', 'preco'];

const SAUDACOES = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'e ai', 'hello', 'hi'];
const AGRADECIMENTOS = ['obrigad*', 'valeu', 'brigad*', 'agradec*'];

// Casa o termo como palavra inteira (plural simples aceito); "termo*" casa por prefixo
const expressoes = new Map();
function casa(texto, termo) {
  let re = expressoes.get(termo);
  if (!re) {
    const prefixo = termo.endsWith('*');
    const base = (prefixo ? termo.slice(0, -1) : termo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(?<![a-z0-9])${base}${prefixo ? '' : '(?:s|es)?(?![a-z0-9])'}`);
    expressoes.set(termo, re);
  }
  return re.test(texto);
}
const tem = (texto, termos) => termos.some((t) => casa(texto, t));

// "A CONFIRMAR" vira uma frase clara para o participante
const linhaParaTexto = (linha) => linha.replace(/\bA CONFIRMAR\b/g, '**ainda não divulgado**');

function formataSecao(secao) {
  return `**${secao.titulo}**\n${secao.linhas.map(linhaParaTexto).join('\n')}`;
}

const TERMOS = BASE.map((s) => {
  const doTitulo = normaliza(s.titulo).split(/[^a-z]+/).filter((p) => p.length > 3 && !GENERICAS.includes(p));
  const chave = Object.keys(PALAVRAS).find((k) => normaliza(s.titulo).startsWith(normaliza(k)));
  return [...new Set([...(PALAVRAS[chave] ?? []), ...doTitulo])];
});

// Seção mais próxima de um trecho da pergunta (pontos = soma do tamanho dos termos casados)
const NO_APP = /(?<![a-z0-9])(no|do|pelo|neste|nesse|dentro do) (app|aplicativo)(?![a-z0-9])/g;
function melhorSecao(texto) {
  // "no app" só diz onde procurar: não deve puxar a seção do app quando há outro assunto no trecho
  const semApp = texto.replace(NO_APP, ' ').trim();
  return (semApp && semApp !== texto && pontuar(semApp)) || pontuar(texto);
}
function pontuar(q) {
  let melhor = null;
  BASE.forEach((s, i) => {
    const pontos = TERMOS[i].reduce((n, t) => n + (casa(q, t) ? t.length : 0), 0);
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { s, pontos };
  });
  return melhor?.s ?? null;
}

// Uma pergunta pode trazer mais de um assunto ("Wi-Fi e crachá?"): cada trecho escolhe a sua seção.
const trechos = (pergunta) => pergunta.toLowerCase().split(/[?!.;,]|\s+e\s+|\s+ou\s+/).map(normaliza).map((t) => t.trim()).filter(Boolean);

const MAX_SECOES = 3;
export function escolherSecoes(pergunta) {
  const achadas = trechos(pergunta).map(melhorSecao).filter(Boolean);
  const inteira = achadas.length ? [] : [melhorSecao(normaliza(pergunta))].filter(Boolean);
  return [...new Set([...achadas, ...inteira])].slice(0, MAX_SECOES);
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
  return [`Tempo de carro agora até o **${d.destino}**${hora ? ` (consulta às ${hora})` : ''}:`, ...linhas, '', 'Mapa de trânsito ao vivo: página **Logística do Evento**. Horário do seu transfer: página **Meu Voo**.'].join('\n');
}

async function respostaContagem() {
  const c = await ferramentas.data_e_contagem.execute({});
  if (c.dias_para_o_evento > 0) return `Faltam **${c.dias_para_o_evento} dias** para o Encontro Infield 2026, de ${c.periodo_evento}.`;
  if (c.dias_para_o_evento === 0) return `É hoje! O Encontro Infield 2026 começa hoje e vai de ${c.periodo_evento}.`;
  return `O Encontro Infield 2026 já começou: ${c.periodo_evento}.`;
}

// Dia do encontro em Brasília → seção do dia ("Segunda, 16/11")
const DIAS = { '2026-11-16': 'Segunda', '2026-11-17': 'Terça', '2026-11-18': 'Quarta', '2026-11-19': 'Quinta' };
export function respostaDoDia(q, agora = new Date()) {
  const amanha = casa(q, 'amanha');
  const data = new Date(agora.getTime() + (amanha ? 86400000 : 0)).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const secao = DIAS[data] && BASE.find((s) => s.titulo.startsWith(DIAS[data]));
  if (secao) return `${amanha ? 'Amanhã' : 'Hoje'}: ${formataSecao(secao)}`;
  if (data < '2026-11-16') return `O Encontro Infield 2026 começa na segunda, **16/11**, com credenciamento a partir das 8h e plenária às 14h30. A programação completa está na página **Agenda**.`;
  return 'O Encontro Infield 2026 aconteceu de 16 a 19/11. A pesquisa de satisfação está na página **Avaliação do App**.';
}

const SUGESTAO = 'Posso ajudar com programação, salas, refeições, hotel, voo, transfer, vacinação, segurança, o app, clima e trânsito.';
const HUMANO = 'Para questões pessoais (voo, transfer, hospedagem), procure o time da agência no Help Desk.';

export async function responderPelaBase(pergunta, agora = new Date()) {
  const q = normaliza(pergunta);

  if (tem(q, FORA_DO_ESCOPO) && !tem(q, ['vacina', 'vacinacao'])) {
    return `Esse tema não é tratado por este assistente. Para esse assunto, procure a área responsável da Takeda.\n\n${SUGESTAO}`;
  }

  const partes = [];
  const ao_vivo = [
    [INTENCOES.clima, respostaClima, 'A previsão do tempo está indisponível no momento.'],
    [INTENCOES.transito, respostaTransito, 'O tempo de trajeto ao vivo está indisponível no momento. Veja o mapa de trânsito ao vivo na página **Logística do Evento**.'],
    [INTENCOES.contagem, respostaContagem, null],
  ];
  for (const [termos, fn, falha] of ao_vivo) {
    if (!tem(q, termos)) continue;
    try {
      partes.push(await fn());
    } catch (e) {
      console.error('[agente:base]', e.message ?? e);
      if (falha) partes.push(falha);
    }
  }

  // Assuntos do evento: uma seção curta da base por trecho da pergunta
  const secoes = escolherSecoes(pergunta);
  if (!partes.length && !secoes.length && tem(q, INTENCOES.hoje)) partes.push(respostaDoDia(q, agora));
  // Clima/trânsito/contagem já respondem perguntas como "vai chover no evento?": só soma seção específica
  const genericas = ['Evento', 'Programação', 'Bagagem'];
  partes.push(...secoes.filter((s) => !partes.length || !genericas.some((g) => s.titulo.startsWith(g))).map(formataSecao));

  if (!partes.length) {
    if (tem(q, AGRADECIMENTOS)) return 'Por nada! Se precisar, é só perguntar. Bom encontro!';
    if (tem(q, SAUDACOES)) return `Olá! Sou o Agente Infield, o assistente do Encontro Infield 2026. ${SUGESTAO}`;
    return `Não encontrei essa informação na base do evento. ${SUGESTAO}\n\n${HUMANO}`;
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
