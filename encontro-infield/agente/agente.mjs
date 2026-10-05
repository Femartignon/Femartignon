// Núcleo do Assistente Infield: instruções, validação da conversa e chamada ao Claude.
// A rota (api/agente.mjs) só repassa a requisição; o modelo é injetável para testes.

import { readFileSync } from 'node:fs';
import { streamText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { ferramentas } from './ferramentas.mjs';

export const MODELO = 'claude-opus-5-5';

const CONHECIMENTO = readFileSync(new URL('./conhecimento.md', import.meta.url), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '')
  .trim();

const INSTRUCOES = `Você é o Assistente Infield, o assistente virtual dos participantes do Encontro Infield 2026 da Takeda. Ele aparece no menu Mais do app do evento e é usado pelo celular, muitas vezes em trânsito.

Como responder:
- Responda em português do Brasil, em tom cordial e direto, com no máximo 3 parágrafos curtos ou uma lista curta. Use **negrito** só para o dado principal (horário, local, menu do app).
- Sobre o evento, use apenas a base de conhecimento abaixo. Se a informação não estiver lá, ou estiver marcada como "A CONFIRMAR", diga que ainda não foi divulgada e indique onde procurar (o menu do app ou a organização). Não deduza nem invente horários, locais, nomes ou regras.
- Para clima, trânsito e datas use as ferramentas, que trazem dados ao vivo. Diga a hora da consulta quando citar trânsito. Se uma ferramenta falhar, diga que o dado está indisponível no momento.
- Você não tem acesso aos dados pessoais do participante (voo, assento, quarto, transfer). Para isso, oriente o menu indicado na base de conhecimento.

Limites (evento da indústria farmacêutica):
- Não fale sobre medicamentos, doenças, tratamentos, estudos clínicos ou produtos, nem dê orientação médica. Se perguntarem, diga que esse tema não é tratado por este assistente e oriente a área responsável da Takeda. A exceção é a ação de vacinação do evento: informe apenas local e horários que estão na base de conhecimento.
- Não comente concorrentes, preços, metas comerciais nem assuntos fora do evento. Recuse com gentileza e volte ao que você pode ajudar.
- Nunca peça nem registre dados pessoais ou sensíveis.

<base_de_conhecimento>
${CONHECIMENTO}
</base_de_conhecimento>`;

// Limites de entrada: protegem custo e evitam abuso do endpoint público
const MAX_MENSAGENS = 20;
const MAX_CARACTERES = 2000;

export function validarConversa(corpo) {
  const mensagens = corpo?.mensagens;
  if (!Array.isArray(mensagens) || mensagens.length === 0) return { erro: 'Conversa vazia.' };
  const recentes = mensagens.slice(-MAX_MENSAGENS);
  for (const m of recentes) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim()) {
      return { erro: 'Mensagem inválida.' };
    }
    if (m.content.length > MAX_CARACTERES) return { erro: `Mensagem acima de ${MAX_CARACTERES} caracteres.` };
  }
  // A API exige que a conversa comece pelo participante e termine com a pergunta dele
  const inicio = recentes.findIndex((m) => m.role === 'user');
  const conversa = recentes.slice(inicio).map(({ role, content }) => ({ role, content: content.trim() }));
  if (inicio < 0 || conversa.at(-1).role !== 'user') return { erro: 'A última mensagem deve ser do participante.' };
  return { conversa };
}

export function responder(conversa, { model = anthropic(MODELO) } = {}) {
  const resultado = streamText({
    model,
    instructions: INSTRUCOES,
    messages: conversa,
    tools: ferramentas,
    stopWhen: stepCountIs(5),
    maxOutputTokens: 4000,
    providerOptions: {
      anthropic: {
        effort: 'low', // conversa curta: respostas rápidas e baratas
        fallbacks: 'default', // recusa de classificador → servidor tenta o modelo de fallback
        cacheControl: { type: 'ephemeral' }, // reaproveita instruções + ferramentas entre perguntas
      },
    },
    onError: ({ error }) => console.error('[agente]', error),
  });
  return resultado.toTextStreamResponse({
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
