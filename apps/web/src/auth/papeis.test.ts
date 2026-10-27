import { podeDelegado } from './papeis'

describe('podeDelegado (RF02 — ADR-0033)', () => {
  it('gestão já tem as permissões do próprio papel', () => {
    expect(podeDelegado({ papel: 'COORDENADOR' }, 'REABRIR_TENTATIVAS')).toBe(true)
    expect(podeDelegado({ papel: 'COORDENADOR' }, 'CONSULTAR_AUDITORIA')).toBe(false)
    expect(podeDelegado({ papel: 'ADMINISTRADOR' }, 'CONSULTAR_AUDITORIA')).toBe(true)
  })

  it('professor só com a permissão delegada', () => {
    expect(podeDelegado({ papel: 'PROFESSOR' }, 'REABRIR_TENTATIVAS')).toBe(false)
    expect(podeDelegado({ papel: 'PROFESSOR', permissoes: ['REABRIR_TENTATIVAS'] }, 'REABRIR_TENTATIVAS')).toBe(true)
    expect(podeDelegado({ papel: 'PROFESSOR', permissoes: ['REABRIR_TENTATIVAS'] }, 'DESBLOQUEAR_CONTAS')).toBe(false)
  })
})
