// POST /api/agente no Netlify. A lógica fica em agente/rota.mjs (a mesma do Vercel).
// A chave ANTHROPIC_API_KEY fica nas variáveis de ambiente do site, nunca no navegador.
import { atender } from '../../agente/rota.mjs';

export default atender;

export const config = { path: '/api/agente' };
