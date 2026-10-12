// Leitura da base de conhecimento (SSOT) para as duas rotas: Claude e modo sem chave.
// Lida só quando a primeira pergunta chega (não ao carregar o módulo), e testa mais de um
// caminho, porque cada plataforma (Vercel, Netlify) empacota os arquivos de um jeito.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CAMINHOS = [
  resolve(process.cwd(), 'agente/conhecimento.md'),
  resolve(process.cwd(), 'encontro-infield/agente/conhecimento.md'),
];

let cache;

export function lerConhecimento() {
  if (cache !== undefined) return cache;
  const candidatos = [...CAMINHOS];
  try {
    candidatos.unshift(new URL('./conhecimento.md', import.meta.url).pathname);
  } catch {
    // Algumas plataformas não expõem import.meta.url; os caminhos acima bastam
  }
  const achado = candidatos.find((c) => existsSync(c));
  if (!achado) throw new Error(`Base de conhecimento não encontrada. Caminhos testados: ${candidatos.join(', ')}`);
  cache = readFileSync(achado, 'utf8');
  return cache;
}
