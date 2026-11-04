/* Encontro Infield 2026 · tema antes da primeira pintura (evita piscar entre claro e escuro). */
(function () {
  try {
    var t = JSON.parse(localStorage.getItem('infield26:theme'));
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* armazenamento bloqueado: segue o tema do sistema */ }
})();