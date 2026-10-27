import { Navigate, useLocation } from 'react-router'
import { rotaInicial, useAuth } from './contexto'

/**
 * Enquanto a versão vigente dos Termos e da Política não foi aceita, os layouts mandam para a
 * página de aceite e guardam a rota de origem (ADR-0060). Retorna null quando não há pendência.
 */
export function useDesvioAceite() {
  const { usuario } = useAuth()
  const local = useLocation()
  if (!usuario?.politicaPendente) return null
  return <Navigate to={`${rotaInicial(usuario.ambiente)}/aceite-termos`} replace state={{ de: local.pathname + local.search }} />
}
