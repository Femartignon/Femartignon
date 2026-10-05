// POST /api/agente — Assistente Infield (Vercel Function, Node.js).
// Corpo: { "mensagens": [{ "role": "user" | "assistant", "content": "..." }, ...] }
// Resposta: texto em streaming (text/plain). Requer ANTHROPIC_API_KEY no projeto Vercel.

import { validarConversa, responder } from '../agente/agente.mjs';

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
  return responder(conversa);
}
