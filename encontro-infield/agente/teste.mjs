// Teste local do agente, sem chave e sem rede: simula a API da Anthropic, o Open-Meteo e o trânsito.
// Rodar: npm test (na pasta encontro-infield)
import { createAnthropic } from '@ai-sdk/anthropic';
import { validarConversa, responder, MODELO } from './agente.mjs';
import { POST } from '../api/agente.mjs';

const sse = (events) => new Response(events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } });
const start = { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: MODELO, content: [], stop_reason: null, usage: { input_tokens: 10, output_tokens: 1 } } };
const toolTurn = (name, input) => sse([start,
  { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'toolu_1', name, input: {} } },
  { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 5 } },
  { type: 'message_stop' }]);
const textTurn = (t) => sse([start,
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } },
  { type: 'message_stop' }]);

// APIs externas simuladas (este ambiente não alcança Open-Meteo/Netlify)
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  url = String(url);
  if (url.includes('open-meteo')) return Response.json({ current: { temperature_2m: 27.1, apparent_temperature: 29, weather_code: 2 }, daily: { time: ['2026-10-05', '2026-10-06'], weather_code: [61, 0], temperature_2m_max: [29, 31], temperature_2m_min: [22, 23], precipitation_probability_max: [80, 5] } });
  if (url.includes('/api/transito')) return Response.json({ updated: '2026-10-05T10:40:00Z', routes: [{ code: 'GIG', minutes: 52, normalMin: 40, delayMin: 12, level: 'mid' }, { code: 'SDU', minutes: 41, normalMin: 38, delayMin: 3, level: 'ok' }] });
  return realFetch(url, opts);
};

const assert = (c, m) => { if (!c) { console.error('FALHOU:', m); process.exitCode = 1; } else console.log('ok -', m); };

// 1. Validação
assert(validarConversa({}).erro, 'rejeita corpo sem mensagens');
assert(validarConversa({ mensagens: [{ role: 'system', content: 'x' }] }).erro, 'rejeita role system');
assert(validarConversa({ mensagens: [{ role: 'user', content: 'x'.repeat(2001) }] }).erro, 'rejeita mensagem longa');
assert(validarConversa({ mensagens: [{ role: 'user', content: 'oi' }, { role: 'assistant', content: 'olá' }] }).erro, 'exige pergunta no fim');
const longa = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
const v = validarConversa({ mensagens: longa });
assert(v.conversa && v.conversa[0].role === 'user' && v.conversa.length <= 20, 'corta histórico e começa pelo participante');

// 2. Rota: JSON inválido
const r400 = await POST(new Request('http://x/api/agente', { method: 'POST', body: '{' }));
assert(r400.status === 400, 'rota responde 400 a JSON inválido');

// 3. Loop com ferramentas, via provider real e fetch simulado da Anthropic
for (const [nome, entrada, esperado] of [['clima', { dias: 2 }, 'chance_chuva_pct'], ['transito', {}, 'Galeão (GIG)'], ['data_e_contagem', {}, 'dias_para_o_evento']]) {
  const chamadas = [];
  const anthropicFetch = async (url, opts) => {
    const body = JSON.parse(opts.body); chamadas.push({ body, headers: opts.headers });
    return chamadas.length === 1 ? toolTurn(nome, entrada) : textTurn(`Resposta final ${nome}`);
  };
  const model = createAnthropic({ apiKey: 'teste', fetch: anthropicFetch })(MODELO);
  const res = responder([{ role: 'user', content: 'pergunta' }], { model });
  const texto = await res.text();
  const [p1, p2] = chamadas.map((c) => c.body);
  const hdr = JSON.stringify(chamadas[0].headers);
  assert(texto.includes(`Resposta final ${nome}`), `${nome}: texto final no stream`);
  assert(p1.model === MODELO && p1.output_config?.effort === 'low', `${nome}: modelo ${p1.model} e effort ${p1.output_config?.effort}`);
  assert(p1.fallbacks === 'default' && hdr.includes('server-side-fallback-2026-07-01'), `${nome}: fallbacks default + beta header`);
  assert(JSON.stringify(p1.system).includes('Encontro Infield 2026') && !JSON.stringify(p1.system).includes('FONTE ÚNICA'), `${nome}: base de conhecimento no system, sem comentários`);
  assert(p1.tools.map((t) => t.name).sort().join() === 'clima,data_e_contagem,transito', `${nome}: 3 ferramentas declaradas`);
  const resultado = JSON.stringify(p2?.messages?.at(-1));
  assert(resultado.includes('tool_result') && resultado.includes(esperado), `${nome}: resultado da ferramenta volta ao modelo (${esperado})`);
  if (nome === 'clima') console.log('   amostra:', resultado.slice(0, 260));
}

// 4. Modo base de conhecimento (sem ANTHROPIC_API_KEY): responde da SSOT e das ferramentas ao vivo
const { responderPelaBase, responderSemModelo } = await import('./faq.mjs');
const casosBase = [
  ['Como está o trânsito do Galeão até o hotel?', '52 min'],
  ['Vai chover nos próximos dias?', 'chance de chuva 80%'],
  ['Quantos dias faltam para o evento?', 'Faltam **'],
  ['Qual o horário do check-in?', 'Check-in a partir das 15h'],
  ['Qual o dress code?', 'ainda não divulgado'],
  ['Onde vai ser a vacinação?', 'Lagoa 4'],
  ['Qual o endereço do hotel?', 'Av. Lúcio Costa'],
  ['Posso jantar fora do hotel?', 'reembolso'],
  ['Qual a franquia de bagagem?', '23 kg'],
  ['Como pego o transfer no aeroporto?', 'receptivo'],
  ['Qual a dose do remédio X?', 'não é tratado por este assistente'],
  ['Qual a cor do céu em Marte?', 'Não encontrei essa informação'],
];
for (const [pergunta, esperado] of casosBase) {
  const r = await responderPelaBase(pergunta);
  assert(r.includes(esperado), `base: "${pergunta}" → contém "${esperado}"`);
}
const agenda = await responderPelaBase('Qual a agenda?');
assert(agenda.includes('- 16/11 (segunda):') && !agenda.includes('|'), 'base: tabela da Agenda vira lista, sem "|"');
assert(!(await responderPelaBase('Quais as regras para o assistente?')).includes('Nunca deduza'), 'base: seção "Regras para o assistente" não aparece ao participante');
const rBase = await responderSemModelo([{ role: 'user', content: 'Qual o dress code?' }]);
assert(rBase.status === 200 && (await rBase.text()).includes('Traje'), 'base: rota responde 200 em texto');
