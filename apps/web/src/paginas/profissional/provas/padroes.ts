import type { ParametrosProva } from '../../../api/tipos'

export const PARAMETROS_PADRAO: ParametrosProva = {
  titulo: '',
  descricao: '',
  visibilidade: 'PRIVADA',
  criterioAprovacao: { tipo: 'NOTA_MINIMA', valor: 6 },
  tempoLimiteMin: 60,
  tentativasPermitidas: 1,
  modoNavegacao: 'LIVRE',
  ordemQuestoes: 'FIXA',
  exigeMfa: false,
  exibirGabarito: 'NUNCA',
  prazoRecursoDias: 7,
  correcaoAsCegas: false,
}

const CAMPOS_PARAMETROS: (keyof ParametrosProva)[] = [
  'titulo',
  'descricao',
  'visibilidade',
  'criterioAprovacao',
  'tempoLimiteMin',
  'tentativasPermitidas',
  'modoNavegacao',
  'ordemQuestoes',
  'exigeMfa',
  'exibirGabarito',
  'prazoRecursoDias',
  'correcaoAsCegas',
  'correcaoDupla',
  'limiarDivergencia',
  'sugestaoIa',
  'tempoPorQuestaoSeg',
]

/** Só os campos aceitos por `PUT /provas/:id` — a API recusa propriedades extras (id, status, itens…). */
export function somenteParametros(p: ParametrosProva): ParametrosProva {
  const r: Record<string, unknown> = {}
  for (const c of CAMPOS_PARAMETROS) if (p[c] !== undefined) r[c] = p[c]
  return r as unknown as ParametrosProva
}
