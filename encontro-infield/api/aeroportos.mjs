// Vercel Function · GET /api/aeroportos (ESM .mjs: funciona com ou sem "type": "module" no package.json do projeto)
import { airportsResponse } from './_lib/live.mjs';

export default {
  fetch() {
    return airportsResponse();
  },
};
