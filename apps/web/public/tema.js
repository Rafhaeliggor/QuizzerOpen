// Aplica o tema escolhido em Configurações > Aparência antes do primeiro desenho (ver src/util/tema.ts).
try {
  var tema = localStorage.getItem('qz-tema')
  if (tema === 'claro' || tema === 'escuro') document.documentElement.dataset.tema = tema
} catch {}
