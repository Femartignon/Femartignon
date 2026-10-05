// Ferramentas do Assistente Infield: dados ao vivo que a base de conhecimento não tem.
// Reaproveita as mesmas fontes do widget (Open-Meteo e a função de trânsito do Netlify),
// para que app, widget e agente mostrem sempre o mesmo número.

import { tool } from 'ai';
import { z } from 'zod';

export const HOTEL = { lat: -23.0045, lon: -43.3187, nome: 'Grand Hyatt Rio de Janeiro' };
export const EVENT_START = '2026-11-16T08:00:00-03:00';
const TZ = 'America/Sao_Paulo';

// Função de trânsito já publicada (netlify/functions/transito.mjs). A chave TomTom fica só lá.
const TRANSITO_URL = process.env.TRANSITO_URL || 'https://infield2026-widgets.netlify.app/api/transito';

// Códigos WMO do Open-Meteo → descrição em português
const WMO = [
  [[0], 'céu limpo'],
  [[1, 2], 'parcialmente nublado'],
  [[3], 'nublado'],
  [[45, 48], 'neblina'],
  [[51, 53, 55, 56, 57], 'garoa'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'chuva'],
  [[71, 73, 75, 77, 85, 86], 'neve'],
  [[95, 96, 99], 'tempestade'],
];
const descreve = (code) => WMO.find(([codes]) => codes.includes(code))?.[1] ?? 'condição desconhecida';

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Dia de calendário em Brasília (YYYY-MM-DD), base da contagem de dias — mesma regra do widget
const diaBrasilia = (date) => date.toLocaleDateString('en-CA', { timeZone: TZ });

export function contagem(agora = new Date()) {
  const hoje = diaBrasilia(agora);
  const evento = diaBrasilia(new Date(EVENT_START));
  const dias = Math.round((Date.parse(evento) - Date.parse(hoje)) / 86400000);
  return {
    agora_brasilia: agora.toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'full', timeStyle: 'short' }),
    periodo_evento: '16 a 19/11/2026 (segunda a quinta-feira)',
    dias_para_o_evento: dias,
    situacao: dias > 0 ? 'antes do evento' : dias === 0 ? 'hoje é o dia de abertura' : 'evento já iniciado',
  };
}

export const ferramentas = {
  data_e_contagem: tool({
    description:
      'Data e hora atuais em Brasília e quantos dias faltam para a abertura do evento. ' +
      'Use sempre que a resposta depender de "hoje", "amanhã" ou de quanto tempo falta.',
    inputSchema: z.object({}),
    execute: async () => contagem(),
  }),

  clima: tool({
    description:
      'Clima no hotel do evento (Barra da Tijuca, Rio de Janeiro): condição atual e previsão diária ' +
      'para até 14 dias. Use para perguntas sobre tempo, chuva, temperatura ou o que levar na mala.',
    inputSchema: z.object({
      dias: z.number().int().min(1).max(14).describe('Quantos dias de previsão, a partir de hoje.'),
    }),
    execute: async ({ dias }) => {
      const params = new URLSearchParams({
        latitude: HOTEL.lat,
        longitude: HOTEL.lon,
        current: 'temperature_2m,apparent_temperature,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: TZ,
        forecast_days: dias,
      });
      const d = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`);
      return {
        local: HOTEL.nome,
        agora: {
          temperatura_c: d.current.temperature_2m,
          sensacao_c: d.current.apparent_temperature,
          condicao: descreve(d.current.weather_code),
        },
        previsao: d.daily.time.map((dia, i) => ({
          dia,
          condicao: descreve(d.daily.weather_code[i]),
          min_c: d.daily.temperature_2m_min[i],
          max_c: d.daily.temperature_2m_max[i],
          chance_chuva_pct: d.daily.precipitation_probability_max[i],
        })),
        observacao: 'A previsão só cobre os próximos 14 dias.',
      };
    },
  }),

  transito: tool({
    description:
      'Tempo de carro agora, com trânsito ao vivo, dos aeroportos Galeão (GIG) e Santos Dumont (SDU) ' +
      'até o hotel do evento. Use para perguntas sobre trajeto, transfer ou quanto tempo leva até o hotel.',
    inputSchema: z.object({}),
    execute: async () => {
      const NIVEL = { ok: 'livre', mid: 'moderado', bad: 'intenso' };
      const d = await getJson(TRANSITO_URL);
      return {
        destino: HOTEL.nome,
        consultado_em: d.updated,
        trajetos: d.routes.map((r) => ({
          aeroporto: r.code === 'GIG' ? 'Galeão (GIG)' : r.code === 'SDU' ? 'Santos Dumont (SDU)' : r.code,
          minutos_agora: r.minutes,
          sem_transito_min: r.normalMin,
          atraso_por_transito_min: r.delayMin,
          transito: NIVEL[r.level] ?? r.level,
        })),
      };
    },
  }),
};
