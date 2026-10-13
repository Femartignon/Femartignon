import base64, re
D='/tmp/claude-0/-home-user-Femartignon/cf73b9ee-726c-5906-88f3-bcf44900ebbb/scratchpad/'
p=D+'v6/encontro-infield-clima/index.html'; s=open(p,encoding='utf-8').read()
b64=lambda f: base64.b64encode(open(f,'rb').read()).decode()
M5=b64(D+'fonts/montserrat/files/montserrat-latin-500-normal.woff2')
M6=b64(D+'fonts/montserrat/files/montserrat-latin-600-normal.woff2')
BG=b64(D+'v6/img/fundo-rio.webp'); LOGO=b64(D+'v6/img/takeda-branco.png')
ARR = '<svg class="arr" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8h11M9.5 4l4 4-4 4"/></svg>'
def R(a,b,n=1):
    global s
    assert s.count(a)==n, (s.count(a), a[:70]); s=s.replace(a,b)

# 1. Montserrat (OFL) — textos de apoio; Gotham Bold segue nos números
R("""  :root{
    --takeda-red:#E1242A;""", """  @font-face{font-family:'Montserrat';src:url(data:font/woff2;base64,%s) format('woff2');font-weight:500;font-style:normal;font-display:swap;}
  @font-face{font-family:'Montserrat';src:url(data:font/woff2;base64,%s) format('woff2');font-weight:600;font-style:normal;font-display:swap;}
  :root{
    --takeda-red:#E1242A;""" % (M5, M6))

# 2. Corpo: sem borda vermelha, fundo azul-marinho, espaço para a faixa
R("""    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:linear-gradient(135deg,var(--bg-1) 40%,var(--bg-2) 100%);""",
  """    font-family:'Montserrat',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    font-weight:500;
    background:#0b1730;""")
R("""    padding:11px 0 30px;
    border-top:4px solid var(--takeda-red);""", """    padding:12px 0 34px;""")
R(".pane + .pane{border-left:1px solid rgba(255,255,255,.16);}", ".pane + .pane{border-left:1px solid rgba(255,255,255,.13);}")

# 3. Fundo: azul-marinho + foto da Barra ao entardecer (forte à direita, sutil à esquerda) + rota com avião vermelho
R("""    background:linear-gradient(180deg,#0b1a33 0%,#1b2f57 52%,#5b1f35 84%,#b3141c 100%);}""",
  """    background:linear-gradient(180deg,#0c1834 0%%,#0f1f42 62%%,#14224a 100%%);}
  .sky .photo{position:absolute;inset:0;background:url(data:image/webp;base64,%s) right -12px top/cover no-repeat;}""" % BG)
R("""  .sky svg.jet{inset:auto;left:0;top:0;width:15px;height:15px;color:#fff;filter:drop-shadow(0 0 4px rgba(255,255,255,.75));
    offset-path:path('M -12 34 C 120 4, 280 -2, 415 22');offset-rotate:auto;animation:fly 9s linear infinite;}""",
  """  .sky svg.jet{inset:auto;left:0;top:0;width:14px;height:14px;color:#E1242A;filter:drop-shadow(0 0 4px rgba(225,36,42,.7));
    offset-path:path('M 214 34 C 270 14, 352 6, 412 50');offset-rotate:auto;animation:fly 9s linear infinite;}""")
R(""".route-path{fill:none;stroke:rgba(255,255,255,.4);stroke-width:1.1;stroke-dasharray:3 4;}
  .star{fill:#fff;}""", """.route-path{fill:none;stroke:rgba(255,255,255,.32);stroke-width:.8;}
  .route-dot{fill:#E1242A;filter:drop-shadow(0 0 3px rgba(225,36,42,.9));}""")

# 4. Lado direito: tipografia espaçada, placas escuras, traço vermelho
R(""".cd-eyebrow{font-family:'Gotham',-apple-system,sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.85);}""",
  """.cd-eyebrow{font-family:'Montserrat',sans-serif;font-weight:600;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.88);}""")
R(""".days{display:flex;align-items:center;gap:9px;}
  .flipclock{display:flex;gap:4px;}
  #cdPane .card{--h:54px;width:38px;font-size:50px;box-shadow:0 4px 10px rgba(0,0,0,.45),0 1px 1px rgba(0,0,0,.3);}
  .days-lbl{font-family:'Bebas Neue','Oswald',Impact,sans-serif;font-size:30px;letter-spacing:.06em;line-height:1;color:#fff;}
  .cd-sub{font-family:'Gotham',-apple-system,sans-serif;font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#fff;line-height:1.3;}
  .cd-foot{display:flex;align-items:center;gap:5px;font-size:10px;white-space:nowrap;color:rgba(255,255,255,.82);margin-top:2px;}
  .cd-foot svg{width:12px;height:12px;flex:none;}""",
  """.days{display:flex;align-items:center;gap:9px;}
  .flipclock{display:flex;gap:5px;}
  #cdPane .card{--h:50px;width:38px;font-size:36px;}
  .days-lbl{font-family:'Montserrat',sans-serif;font-weight:600;font-size:24px;letter-spacing:.02em;text-transform:uppercase;line-height:1;color:#fff;}
  .cd-sub{font-family:'Montserrat',sans-serif;font-weight:600;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:#fff;line-height:1.5;}
  .cd-bar{width:26px;height:2.5px;border-radius:2px;background:#E1242A;box-shadow:0 0 6px rgba(225,36,42,.6);}
  .cd-foot{display:flex;align-items:center;gap:4px;font-size:9px;white-space:nowrap;color:rgba(255,255,255,.85);margin-top:3px;}
  .cd-foot b{font-weight:600;color:#fff;}
  .cd-foot svg{width:12px;height:12px;flex:none;}""")

# Placas split-flap em vidro escuro, número branco em Gotham Bold
R("""    border-radius:6px;
    perspective:220px;
    box-shadow:0 3px 6px rgba(0,0,0,.22),0 1px 1px rgba(0,0,0,.12);
    font-family:'Bebas Neue','Oswald',Impact,sans-serif;
    font-size:54px;color:#1a1a1a;""", """    border-radius:6px;
    perspective:220px;
    box-shadow:0 0 0 1px rgba(255,255,255,.14),0 6px 14px rgba(0,0,0,.45);
    font-family:'Gotham',-apple-system,sans-serif;
    font-size:54px;color:#fff;""")
R(""".half b{display:block;height:var(--h);line-height:calc(var(--h) + 3px);text-align:center;font-weight:400;}
  .half.top{top:0;border-radius:6px 6px 0 0;background:linear-gradient(#fbfbfb,#e9e9e9);}
  .half.bottom{bottom:0;border-radius:0 0 6px 6px;background:linear-gradient(#e2e2e2,#d2d2d2);}""",
  """.half b{display:block;height:var(--h);line-height:var(--h);text-align:center;font-weight:700;}
  .half.top{top:0;border-radius:6px 6px 0 0;background:linear-gradient(#3a4c76,#2a3b63);}
  .half.bottom{bottom:0;border-radius:0 0 6px 6px;background:linear-gradient(#223358,#1a284b);}""")
R("""    background:rgba(0,0,0,.35);box-shadow:0 1px 0 rgba(255,255,255,.55);z-index:3;}
  .card::before{content:"";position:absolute;left:-3px;right:-3px;top:50%;height:10px;margin-top:-5px;z-index:4;
    background:
      linear-gradient(90deg,#9a9a9a,#f2f2f2 50%,#9a9a9a) left/4px 100% no-repeat,
      linear-gradient(90deg,#9a9a9a,#f2f2f2 50%,#9a9a9a) right/4px 100% no-repeat;
    border-radius:1px;}""", """    background:rgba(0,0,0,.5);box-shadow:0 1px 0 rgba(255,255,255,.08);z-index:3;}""")

# 5. Lado esquerdo: logo, local espaçado, ícone em vidro, cápsulas com rótulo
R(""".loc{
    font-family:'Gotham',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    font-weight:700;
    font-size:11px;
    color:var(--accent,var(--takeda-red));
    text-transform:uppercase;
    letter-spacing:.05em;""", """.brand{height:21px;width:auto;align-self:flex-start;display:block;}
  .loc{
    font-family:'Montserrat',sans-serif;
    font-weight:500;
    font-size:9.5px;
    color:rgba(255,255,255,.85);
    text-transform:uppercase;
    letter-spacing:.16em;""")
R(""".icon-wrap{flex-shrink:0;width:52px;height:52px;display:flex;align-items:center;justify-content:center;}""",
  """.icon-wrap{flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;padding:5px;border-radius:10px;
    background:linear-gradient(160deg,rgba(255,255,255,.15),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.14);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 4px 12px rgba(0,0,0,.28);}""")
R("""    font-size:12.5px;
    font-weight:500;
    color:var(--muted);""", """    font-size:12px;
    font-weight:500;
    color:#aeb9d6;""")
R("""    border-radius:999px;
    padding:3px 8px 3px 6px;
    font-size:10.5px;""", """    border-radius:999px;
    padding:3px 10px 3px 7px;
    border:1px solid rgba(255,255,255,.12);
    gap:5px;
    font-size:10.5px;
    font-weight:600;
    line-height:1.15;""")
R(""".chip svg{width:11px;height:11px;flex-shrink:0;}
  .updated{font-size:8.5px;color:var(--muted);opacity:.65;margin-top:1px;}""",
  """.chip svg{width:13px;height:13px;flex-shrink:0;}
  .chip small{display:block;font-size:6.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#9fb0d4;}
  .updated{font-size:8.5px;color:#8e9bbd;margin-top:1px;}""")
R("""--chip-bg:rgba(255,255,255,.16);""", """--chip-bg:rgba(255,255,255,.06);""")
R("[data-tone] .updated{opacity:.85;}", "")

# 6. Faixa: vidro azul-marinho com brilho quente no topo, aviões vermelhos e divisórias finas
R(""".ticker{position:absolute;left:0;right:0;bottom:0;height:22px;z-index:2;display:flex;align-items:stretch;
    background:rgba(8,14,28,.82);border-top:1px solid rgba(255,255,255,.14);overflow:hidden;}""",
  """.ticker{position:absolute;left:0;right:0;bottom:0;height:26px;z-index:2;display:flex;align-items:stretch;
    background:linear-gradient(180deg,rgba(16,28,58,.94),rgba(9,18,40,.97));border-top:1px solid rgba(255,128,90,.38);
    box-shadow:0 -6px 14px -6px rgba(255,90,50,.35);overflow:hidden;}""")
R(""".tk-item{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#fff;padding:0 4px;}
  .tk-item b{font-family:'Bebas Neue','Oswald',Impact,sans-serif;font-weight:400;font-size:13.5px;letter-spacing:.06em;color:#FFC93C;}
  .tk-sep{color:#E1242A;padding:0 10px;font-size:9px;}
  .tk-ok{color:#7be0a4;} .tk-warn{color:#FFC93C;} .tk-bad{color:#ff8a8f;}""",
  """.tk-item{display:inline-flex;align-items:center;gap:8px;font-size:10.5px;font-weight:500;color:#fff;}
  .tk-item svg{width:13px;height:13px;color:#E1242A;flex:none;}
  .tk-item b{font-family:'Gotham',-apple-system,sans-serif;font-weight:700;font-size:11px;letter-spacing:.02em;color:#fff;}
  .tk-rota{color:#b9c4e0;display:inline-flex;align-items:center;gap:4px;}
  .tk-item svg.tk-arr{width:10px;height:10px;color:#b9c4e0;}
  .tk-st{color:#c9d2ea;}
  .tk-dot{width:5px;height:5px;border-radius:50%;background:#E1242A;flex:none;}
  .tk-bar{width:1px;height:12px;background:rgba(255,255,255,.2);flex:none;}
  .tk-sep{width:1px;height:14px;background:rgba(255,255,255,.2);margin:0 18px;flex:none;}
  .tk-ok{color:#86e3ad;} .tk-warn{color:#FFC93C;} .tk-bad{color:#ff8a8f;}""")

# Markup
R("""  <div class="loc" id="loc">""", """  <img class="brand" alt="Takeda" src="data:image/png;base64,%s">
  <div class="loc" id="loc">""" % LOGO)
R("""    <span class="chip" id="feelsChip">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm1.5-1.4V5a1.5 1.5 0 0 0-3 0v9.1a4 4 0 1 0 3 0Z" fill="#c0392b"/></svg>
      <span id="feelsVal">--</span>
    </span>
    <span class="chip" id="windChip">
      <svg viewBox="0 0 24 24" fill="none"><path d="M3 8h11a2.5 2.5 0 1 0-2.4-3.2M3 12h15a2.5 2.5 0 1 1-2.4 3.2M3 16h9a2 2 0 1 1-1.8 2.8" stroke="#5b7a99" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>
      <span id="windVal">--</span>
    </span>""", """    <span class="chip" id="maxChip">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 15.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm1.5-1.4V5a1.5 1.5 0 0 0-3 0v9.1a4 4 0 1 0 3 0Z" fill="#E1242A"/></svg>
      <span><span id="maxVal">--</span><small>Máxima</small></span>
    </span>
    <span class="chip" id="windChip">
      <svg viewBox="0 0 24 24" fill="none"><path d="M3 8h11a2.5 2.5 0 1 0-2.4-3.2M3 12h15a2.5 2.5 0 1 1-2.4 3.2M3 16h9a2 2 0 1 1-1.8 2.8" stroke="#8fb4e8" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>
      <span><span id="windVal">--</span><small>Vento</small></span>
    </span>""")
R("""    <span class="cd-sub">para o Encontro Infield 2026</span>
    <span class="cd-foot"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">""",
  """    <span class="cd-sub">para o Encontro<br>Infield 2026</span>
    <span class="cd-bar" aria-hidden="true"></span>
    <span class="cd-foot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">""")
R("""<span>Detalhes do seu voo em <b>Meu voo</b></span></span>""", """<span>Detalhes do seu voo em <b>Meu voo</b></span><svg class="arr" style="width:10px;height:10px" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8h11M9.5 4l4 4-4 4"/></svg></span>""")

# 7. Clima: máxima do dia no lugar da sensação térmica
R("var STORAGE_KEY = 'infield2026_weather_cache_v2';", "var STORAGE_KEY = 'infield2026_weather_cache_v3';")
R("document.getElementById('feelsVal').textContent = Math.round(data.feels) + '°C';", "document.getElementById('maxVal').textContent = Math.round(data.max) + '°C';")
R("document.getElementById('feelsVal').textContent = '--';", "document.getElementById('maxVal').textContent = '--';")
R("""      + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day'""",
  """      + '&current=temperature_2m,weather_code,wind_speed_10m,is_day'
      + '&daily=temperature_2m_max&forecast_days=1'""")
R("""      return { temp:c.temperature_2m, feels:c.apparent_temperature, code:c.weather_code,""",
  """      return { temp:c.temperature_2m, max:json.daily.temperature_2m_max[0], code:c.weather_code,""")

# 8. Faixa: itens no novo estilo
PLANE = """'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)"/></svg>'"""
R("""    var items = tkItems.avisos.map(function(m){ return '<span class="tk-item">' + tkEsc(m) + '</span>'; })
      .concat(tkItems.voos.map(function(v){
        return '<span class="tk-item"><b>' + tkEsc(v.voo) + '</b>' + tkEsc((v.origem || '') + '→' + (v.destino || '')) +
               ' · <span class="' + (TK_CLASS[v.codigo] || '') + '">' + tkEsc(v.texto) + '</span></span>';
      }));""", """    var items = tkItems.avisos.map(function(m){ return '<span class="tk-item"><i class="tk-dot"></i>' + tkEsc(m) + '</span>'; })
      .concat(tkItems.voos.map(function(v){
        return '<span class="tk-item">' + TK_PLANE + '<b>' + tkEsc(v.voo) + '</b><i class="tk-bar"></i>' +
               '<span class="tk-rota">' + tkEsc(v.origem || '') + TK_ARR + tkEsc(v.destino || '') + '</span><i class="tk-bar"></i>' +
               '<span class="tk-st ' + (TK_CLASS[v.codigo] || '') + '">' + tkEsc(v.texto) + '</span></span>';
      }));""")
R("""    var run = items.join('<span class="tk-sep" aria-hidden="true">◆</span>') + '<span class="tk-sep" aria-hidden="true">◆</span>';""",
  """    var run = items.join('<i class="tk-sep" aria-hidden="true"></i>') + '<i class="tk-sep" aria-hidden="true"></i>';""")
R("""  var TK_SPEED = 55;   // px por segundo""", """  var TK_SPEED = 55;   // px por segundo
  var TK_PLANE = %s;
  var TK_ARR = '%s';""" % (PLANE, ARR.replace('class="arr"','class="tk-arr"')))

# 9. Céu: foto + rota curva com ponto vermelho (sem estrelas)
s = re.sub(r"    var stars = '';\n    \[\[.*?\n    \}\);\n", "", s, flags=re.S)
R("""    document.getElementById('sky').innerHTML =
      '<svg viewBox="0 0 403 214" preserveAspectRatio="xMidYMid slice">' + stars +
      '<path class="route-path" d="M -12 34 C 120 4, 280 -2, 415 22"/></svg>' +""",
  """    document.getElementById('sky').innerHTML =
      '<div class="photo"></div>' +
      '<svg viewBox="0 0 403 214" preserveAspectRatio="xMidYMid slice">' +
      '<path class="route-path" id="routePath" d="M 214 34 C 270 14, 352 6, 412 50"/><circle class="route-dot" id="routeDot" r="2.4"/></svg>' +""")
R('''  if (tickCountdown()){''', '''  // Ponto vermelho no fim da rota (sobre a própria curva)
  (function(){
    var path = document.getElementById('routePath'), dot = document.getElementById('routeDot');
    var pt = path.getPointAtLength(path.getTotalLength() * 0.86);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
  })();

  if (tickCountdown()){''')

# Gotham em todo o widget (pedido): remove a Montserrat
import re as _re
s = _re.sub(r"  @font-face\{font-family:'Montserrat';[^\n]*\n", "", s)
s = s.replace("'Montserrat',", "'Gotham',").replace("font-family:'Montserrat',sans-serif", "font-family:'Gotham',sans-serif")
assert "Montserrat" not in s, "sobrou Montserrat"
# Pílulas Máxima e Vento com a mesma largura
R(""".chips{display:flex;gap:6px;flex-wrap:wrap;}""", """.chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;}""")

# Sem logo Takeda (pedido)
s = _re.sub(r'  <img class="brand" alt="Takeda" src="data:image/png;base64,[^"]*">\n', '', s)
R(""".brand{height:21px;width:auto;align-self:flex-start;display:block;}
  """, "")
assert 'class="brand"' not in s
# Modo ao vivo programado: a partir de LIVE_START a faixa mostra só chegadas reais (GIG/SDU) da AviationStack
R("""  function loadTicker(){
    fetch('data/faixa.json').then(function(r){ return r.json(); })
      .then(function(d){ tkItems.avisos = d.mensagens || []; renderTicker(); }).catch(function(){});
    fetch('/api/voos').then(function(r){ return r.json(); })
      .then(function(d){
        if (!d.ok) return;""", """  var LIVE_START = new Date('2026-10-04T11:05:00-03:00');   // troca para o modo ao vivo (Brasília)
  function isLive(){ return new Date() >= LIVE_START; }
  function loadTicker(){
    var live = isLive();
    if (live) tkItems.avisos = [];
    else fetch('data/faixa.json').then(function(r){ return r.json(); })
      .then(function(d){ tkItems.avisos = d.mensagens || []; renderTicker(); }).catch(function(){});
    fetch(live ? '/api/voos?chegadas=1' : '/api/voos').then(function(r){ return r.json(); })
      .then(function(d){
        if (!d.ok){ if (live){ tkItems.voos = []; renderTicker(); } return; }""")
R("""    if (!items.length) return;
""", """    var ticker = document.getElementById('ticker');
    ticker.style.display = items.length ? '' : 'none';   // sem itens, a faixa some
    if (!items.length) return;
""")
R("""  loadTicker();
  setInterval(loadTicker, 15 * 60 * 1000);""", """  loadTicker();
  setInterval(loadTicker, 15 * 60 * 1000);
  if (!isLive()) setTimeout(loadTicker, LIVE_START - new Date() + 1000);""")

# Terminal e portão de desembarque na faixa (quando existirem)
R("""               '<span class="tk-st ' + (TK_CLASS[v.codigo] || '') + '">' + tkEsc(v.texto) + '</span></span>';""",
  """               '<span class="tk-st ' + (TK_CLASS[v.codigo] || '') + '">' + tkEsc(v.texto) + '</span>' + tkLocal(v) + '</span>';""")
R("""  function renderTicker(){""", """  function tkLocal(v){
    var p = [];
    if (v.terminal) p.push('Terminal ' + tkEsc(v.terminal));
    if (v.portao) p.push('Portão ' + tkEsc(v.portao));
    return p.length ? '<i class="tk-bar"></i><span class="tk-local">' + p.join(' · ') + '</span>' : '';
  }
  function renderTicker(){""")
R(""".tk-st{color:#c9d2ea;}""", """.tk-st{color:#c9d2ea;}
  .tk-local{color:#fff;}""")
open(p,'w',encoding='utf-8').write(s)
print('ok', len(s))
