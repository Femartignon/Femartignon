// POST /api/agente no Vercel. A lógica fica em agente/rota.mjs (a mesma do Netlify).
import { atender } from '../agente/rota.mjs';

export const maxDuration = 60;
export const POST = atender;
