import { aplicarTema, lerTema, salvarTema } from './tema'

describe('tema da interface (claro/escuro)', () => {
  afterEach(() => {
    localStorage.clear()
    aplicarTema('sistema')
  })

  it('padrão é seguir o sistema, sem data-tema no <html>', () => {
    expect(lerTema()).toBe('sistema')
    expect(document.documentElement.dataset.tema).toBeUndefined()
  })

  it('grava a escolha e aplica no <html>', () => {
    salvarTema('escuro')
    expect(lerTema()).toBe('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
    salvarTema('claro')
    expect(document.documentElement.dataset.tema).toBe('claro')
  })

  it('voltar ao padrão do sistema limpa a escolha', () => {
    salvarTema('escuro')
    salvarTema('sistema')
    expect(localStorage.getItem('qz-tema')).toBeNull()
    expect(document.documentElement.dataset.tema).toBeUndefined()
  })

  it('ignora valor desconhecido salvo', () => {
    localStorage.setItem('qz-tema', 'roxo')
    expect(lerTema()).toBe('sistema')
  })
})
