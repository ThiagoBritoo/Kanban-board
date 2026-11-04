// Aplica o tema salvo antes da página pintar (evita "piscar" no tema padrão).
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('kb-prefs') || '{}');
    var r = document.documentElement;
    var mode = p.mode || 'system';
    if (mode === 'system') mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    r.dataset.theme = p.theme || 'minimal';
    r.dataset.mode = mode;
  } catch (e) {}
})();
