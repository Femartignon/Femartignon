/* Encontro Infield 2026 · widget do feed da Home · Fio da História
   O estado vem do relógio do aparelho, comparado com instantes absolutos (janelas em horário de Brasília),
   então o fuso do aparelho não muda o resultado. Sem rede, sem merge tag e sem armazenamento.
   QA: #qa=1&estado=<id> ou #qa=1&now=AAAA-MM-DDTHH:MM (horário de Brasília). */
(function () {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const DATA = JSON.parse(doc.getElementById('fio-data').textContent);
  const card = doc.getElementById('card');
  const el = {
    kicker: doc.getElementById('kicker'),
    titulo: doc.getElementById('titulo'),
    texto: doc.getElementById('texto'),
    progresso: doc.getElementById('progresso'),
    fio: doc.getElementById('fio'),
    contas: Array.prototype.slice.call(doc.querySelectorAll('#fio > li')),
    rotulos: Array.prototype.slice.call(doc.querySelectorAll('#rotulos > li')),
  };
  const ULTIMO = DATA.passos.length - 1;
  // [título, texto, entrelinha do texto] em px, do maior para o menor; o título não desce de 19 px
  // (abaixo disso o vermelho deixa de ser "texto grande" e perde o contraste mínimo de 3:1 no papel).
  const TAMANHOS = [[24, 14, 20], [23, 14, 20], [22, 14, 20], [21, 14, 20], [20, 14, 20], [19, 14, 20], [19, 13, 18]];
  const MAX_TIMER = 2147483647;

  // 'AAAA-MM-DDTHH:MM[:SS]' com fuso (Z ou ±HH:MM); sem fuso = horário de Brasília (UTC-03:00)
  function instante(iso) {
    if (iso === null || iso === undefined || iso === '') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|([+-])(\d{2}):?(\d{2}))?$/.exec(String(iso).trim());
    if (!m) return NaN;
    let fuso = -180;
    if (m[7] === 'Z') fuso = 0;
    else if (m[7]) fuso = (m[8] === '-' ? -1 : 1) * (Number(m[9]) * 60 + Number(m[10]));
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - fuso * 60000;
  }

  const preenchido = (s) => Boolean(s.titulo && s.titulo.trim() && s.texto && s.texto.trim());
  const janela = (s) => ({ s: s, de: instante(s.de), ate: instante(s.ate) });
  const ESTADOS = DATA.estados.map(janela);
  const ESPACOS = DATA.espacos.filter(preenchido).map(janela); // espaço vazio não publica (D06)
  const dentro = (j, t) => (j.de === null || t >= j.de) && (j.ate === null || t < j.ate);

  function escolher(t) {
    for (const j of ESPACOS) if (dentro(j, t)) return j.s;
    for (const j of ESTADOS) if (dentro(j, t)) return j.s;
    return null;
  }

  function proximaFronteira(t) {
    let prox = null;
    for (const j of ESTADOS.concat(ESPACOS)) {
      for (const f of [j.de, j.ate]) if (f !== null && f > t && (prox === null || f < prox)) prox = f;
    }
    return prox;
  }

  function lerQA() {
    const h = new URLSearchParams(location.hash.slice(1));
    return h.get('qa') === '1' ? { now: h.get('now'), estado: h.get('estado') } : null;
  }
  let qa = lerQA();

  function agora() {
    if (qa && qa.now) {
      const t = instante(qa.now);
      if (!Number.isNaN(t) && t !== null) return t;
    }
    return Date.now();
  }

  function estadoAtual() {
    if (qa && qa.estado) {
      const forcado = DATA.estados.concat(DATA.espacos.filter(preenchido)).find((s) => s.id === qa.estado);
      if (forcado) return forcado;
    }
    return escolher(agora());
  }

  // *vermelho* e _conectivo_; o resto em Bold grafite (mesmas classes .r e .c das páginas)
  function tituloEmNos(marcacao) {
    const frag = doc.createDocumentFragment();
    marcacao.split(/(\*[^*]+\*|_[^_]+_)/).forEach((parte) => {
      if (!parte) return;
      const cls = parte[0] === '*' ? 'r' : parte[0] === '_' ? 'c' : '';
      if (cls && parte.length > 2 && parte[parte.length - 1] === parte[0]) {
        const span = doc.createElement('span');
        span.className = cls;
        span.textContent = parte.slice(1, -1);
        frag.appendChild(span);
      } else {
        frag.appendChild(doc.createTextNode(parte));
      }
    });
    return frag;
  }

  function textoProgresso(p) {
    if (p <= 0) return 'Prólogo: antes do primeiro capítulo do Encontro, de 16 a 19/11.';
    if (p >= ULTIMO) return 'Epílogo: depois do último capítulo do Encontro.';
    return `Capítulo ${p} de ${ULTIMO - 1} do Encontro, ${DATA.rotulos[p]}.`;
  }

  // maior tamanho que cabe na altura; se nem o menor couber, tira as datas do fio e tenta de novo
  function ajustar() {
    for (const compacto of [false, true]) {
      card.toggleAttribute('data-compacto', compacto);
      for (const [t, b, bl] of TAMANHOS) {
        root.style.setProperty('--t', `${t}px`);
        root.style.setProperty('--b', `${b}px`);
        root.style.setProperty('--bl', `${bl}px`);
        if (card.scrollHeight <= card.clientHeight + 1) {
          card.dataset.ajuste = `${t}/${b}${compacto ? '/compacto' : ''}`;
          return true;
        }
      }
    }
    card.dataset.ajuste = 'estouro';
    return false;
  }

  function animar() {
    card.removeAttribute('data-anim');
    void card.offsetWidth; // reinicia as animações de entrada
    card.setAttribute('data-anim', '');
  }

  let mostrado = null;
  function desenhar() {
    const st = estadoAtual();
    if (!st) return;
    if (st !== mostrado) {
      mostrado = st;
      el.kicker.textContent = st.kicker;
      el.titulo.replaceChildren(tituloEmNos(st.titulo));
      el.texto.textContent = st.texto;
      const p = Math.max(0, Math.min(ULTIMO, Number(st.passo) || 0));
      const marca = (no, i) => { no.dataset.s = i < p ? 'passada' : i === p ? 'agora' : 'futura'; };
      el.contas.forEach(marca);
      el.rotulos.forEach(marca);
      el.fio.style.setProperty('--p', String(p / ULTIMO));
      el.progresso.textContent = textoProgresso(p);
      card.dataset.estado = st.id;
      animar();
    }
    ajustar();
  }

  let relogio = 0;
  function agendar() {
    clearTimeout(relogio);
    if (qa && (qa.now || qa.estado)) return; // QA congela o horário
    const t = Date.now();
    const prox = proximaFronteira(t);
    if (prox === null) return;
    relogio = setTimeout(() => { desenhar(); agendar(); }, Math.min(prox - t + 500, MAX_TIMER));
  }

  let quadro = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(ajustar);
  });
  doc.addEventListener('visibilitychange', () => {
    if (!doc.hidden) { desenhar(); agendar(); }
  });
  addEventListener('hashchange', () => { qa = lerQA(); desenhar(); agendar(); });
  // timers ficam congelados com o app em segundo plano: confere de novo a cada 5 min
  setInterval(desenhar, 5 * 60 * 1000);

  const iniciar = () => {
    desenhar();
    agendar();
    doc.body.dataset.pronto = '1';
  };
  (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(iniciar, iniciar);
})();
