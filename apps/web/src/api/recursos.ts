import { useQuery } from '@tanstack/react-query'
import { api } from './cliente'

/** Recursos opcionais do servidor (e-mail ligado?). */
export function useRecursos() {
  return useQuery({
    queryKey: ['auth', 'recursos'],
    queryFn: () => api<{ emailHabilitado: boolean }>('/auth/recursos', { semRenovacao: true }),
    staleTime: 5 * 60_000,
  })
}
