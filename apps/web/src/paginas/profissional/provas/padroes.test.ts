import type { ProvaDetalhe } from '../../../api/tipos'
import { PARAMETROS_PADRAO, somenteParametros } from './padroes'

describe('somenteParametros', () => {
  it('descarta id, status, itens e demais campos da prova que o PUT /provas/:id recusa', () => {
    const prova = {
      ...PARAMETROS_PADRAO,
      titulo: 'Biologia',
      correcaoDupla: true,
      limiarDivergencia: 15,
      sugestaoIa: true,
      tempoPorQuestaoSeg: 60,
      id: 'p1',
      status: 'RASCUNHO',
      itens: [],
      secoes: [],
      somaPesos: 100,
      autorNome: 'Ana',
    } as unknown as ProvaDetalhe
    const r = somenteParametros(prova)
    for (const extra of ['id', 'status', 'itens', 'secoes', 'somaPesos', 'autorNome']) expect(r).not.toHaveProperty(extra)
    // Campos sem controle no formulário também vão, senão o PUT os devolveria ao padrão
    expect(r).toMatchObject({ titulo: 'Biologia', correcaoDupla: true, limiarDivergencia: 15, sugestaoIa: true, tempoPorQuestaoSeg: 60 })
  })
})
