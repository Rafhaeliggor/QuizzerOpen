import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { mensagemDeErro } from '../api/cliente'
import { AlertBanner, Spinner } from '../design-system'

/** Renderiza carregamento/erro de uma consulta e, quando há dados, o conteúdo. */
export function EstadoConsulta<T>({ consulta, children }: { consulta: UseQueryResult<T>; children: (dados: T) => ReactNode }) {
  if (consulta.isPending) return <Spinner />
  if (consulta.isError) return <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>
  return <>{children(consulta.data)}</>
}
