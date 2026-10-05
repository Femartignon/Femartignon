// POST /api/agente — Assistente Infield (Vercel Function, Node.js).
// Corpo: { "mensagens": [{ "role": "user" | "assistant", "content": "..." }, ...] }
// Resposta: texto (text/plain). Com ANTHROPIC_API_KEY no projeto, responde com o Claude;
// sem a chave, responde direto da base de conhecimento (agente/conhecimento.md) e das ferramentas ao vivo.

import { validarConversa, responder } from '../agente/agente.mjs';
import { responderSemModelo } from '../agente/faq.mjs';

export const maxDuration = 60;

export async function POST(request) {
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'JSON inválido.' }, { status: 400 });
  }
  const { erro, conversa } = validarConversa(corpo);
  if (erro) return Response.json({ erro }, { status: 400 });
  return process.env.ANTHROPIC_API_KEY ? responder(conversa) : responderSemModelo(conversa);
}
