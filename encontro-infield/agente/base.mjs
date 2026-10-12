// Leitura da base de conhecimento (SSOT) para as duas rotas: Claude e modo sem chave.
// O caminho muda conforme a plataforma (Vercel, Netlify), então testamos mais de um local.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function lerConhecimento() {
  const candidatos = [
    new URL('./conhecimento.md', import.meta.url),
    resolve(process.cwd(), 'agente/conhecimento.md'),
    resolve(process.cwd(), 'encontro-infield/agente/conhecimento.md'),
  ];
  const achado = candidatos.find((c) => existsSync(c));
  if (!achado) throw new Error('Base de conhecimento não encontrada (agente/conhecimento.md).');
  return readFileSync(achado, 'utf8');
}
