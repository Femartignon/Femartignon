// Vercel Function · GET /api/transito (ativa com a variável de ambiente TOMTOM_KEY)
import { trafficResponse } from './_lib/live.mjs';

export default {
  fetch() {
    return trafficResponse(process.env);
  },
};
