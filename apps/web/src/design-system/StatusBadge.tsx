export type TomStatus = 'neutro' | 'info' | 'sucesso' | 'alerta' | 'erro'

/**
 * Mapeamento padrão de status de domínio → tom visual. Novos status (questão,
 * prova, tentativa, recurso) devem ser adicionados aqui para manter consistência.
 */
const TOM_PADRAO: Record<string, TomStatus> = {
  RASCUNHO: 'neutro',
  EM_REVISAO: 'info',
  PUBLICADA: 'sucesso',
  ARQUIVADA: 'neutro',
  EM_ANDAMENTO: 'info',
  ENVIADA: 'sucesso',
  EXPIRADA: 'alerta',
  REABERTA: 'alerta',
  INVALIDADA: 'erro',
  PENDENTE_CORRECAO_MANUAL: 'alerta',
  CONSOLIDADA: 'sucesso',
  APROVADO: 'sucesso',
  REPROVADO: 'erro',
  SEM_CRITERIO: 'neutro',
  ABERTO: 'info',
  EM_ANALISE: 'alerta',
  DEFERIDO: 'sucesso',
  INDEFERIDO: 'erro',
  AGENDADA: 'neutro',
  DISPONIVEL: 'sucesso',
  ENCERRADA: 'neutro',
  PENDENTE: 'alerta',
  CONCLUIDA: 'sucesso',
  RECUSADA: 'erro',
  ATIVO: 'sucesso',
  INATIVO: 'neutro',
  BLOQUEADO: 'erro',
}

interface Props {
  status: string
  rotulo?: string
  tom?: TomStatus
}

export function StatusBadge({ status, rotulo, tom }: Props) {
  const tomFinal = tom ?? TOM_PADRAO[status] ?? 'neutro'
  return <span className={`qz-badge qz-badge--${tomFinal}`}>{rotulo ?? status.replaceAll('_', ' ').toLowerCase()}</span>
}
