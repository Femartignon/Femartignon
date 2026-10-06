// Rota POST /api/agente, compartilhada pelo Netlify (netlify/functions/agente.mjs)
// e pelo Vercel (api/agente.mjs): os dois só repassam a requisição para cá.
// Corpo: { "mensagens": [{ "role": "user" | "assistant", "content": "..." }, ...] }
// Resposta: texto (text/plain). Com ANTHROPIC_API_KEY na plataforma, responde com o Claude;
// sem a chave, responde direto da base de conhecimento (agente/conhecimento.md) e das ferramentas ao vivo.

import { validarConversa, responder } from './agente.mjs';
import { responderSemModelo } from './faq.mjs';

export async function atender(request) {
  if (request.method !== 'POST') return Response.json({ erro: 'Use POST.' }, { status: 405 });
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
