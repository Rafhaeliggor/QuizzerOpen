/**
 * Tema da interface (claro/escuro). "sistema" (padrão) segue o prefers-color-scheme do aparelho;
 * as outras opções gravam data-tema no <html>. A escolha fica no navegador (por aparelho),
 * e public/tema.js a aplica antes do primeiro desenho para não piscar.
 */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro'

const CHAVE = 'qz-tema'

export function lerTema(): PreferenciaTema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo === 'claro' || salvo === 'escuro' ? salvo : 'sistema'
  } catch {
    return 'sistema'
  }
}

export function aplicarTema(tema: PreferenciaTema) {
  if (tema === 'sistema') delete document.documentElement.dataset.tema
  else document.documentElement.dataset.tema = tema
}

export function salvarTema(tema: PreferenciaTema) {
  try {
    if (tema === 'sistema') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, tema)
  } catch {
    // Sem armazenamento (navegação privada etc.): vale só para esta página.
  }
  aplicarTema(tema)
}
