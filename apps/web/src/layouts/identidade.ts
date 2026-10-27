import { createContext, useContext } from 'react'

/** Nome da instituição (build: VITE_NOME_INSTITUICAO) — o sistema é de instituição única. */
export const NOME_INSTITUICAO = import.meta.env.VITE_NOME_INSTITUICAO || 'Unima'
/** Central de ajuda externa (build: VITE_URL_AJUDA); vazio oculta o cartão de ajuda. */
export const URL_AJUDA = import.meta.env.VITE_URL_AJUDA || ''
/** Contato do encarregado de dados (DPO) citado nos Termos e na Política (build: VITE_CONTATO_ENCARREGADO). */
export const CONTATO_ENCARREGADO =
  import.meta.env.VITE_CONTATO_ENCARREGADO || `canais oficiais de atendimento da ${NOME_INSTITUICAO}`
/** Ano letivo exibido no cartão da instituição (ano corrente; não há calendário acadêmico no sistema). */
export const ANO_LETIVO = new Date().getFullYear()

/**
 * Título da página atual, informado pelo CabecalhoPagina para completar a trilha
 * de navegação do topo ("Unima / Banco de Questões / MAT-001").
 */
export const ContextoTituloPagina = createContext<(titulo: string | null) => void>(() => {})
export const useDefinirTituloPagina = () => useContext(ContextoTituloPagina)
