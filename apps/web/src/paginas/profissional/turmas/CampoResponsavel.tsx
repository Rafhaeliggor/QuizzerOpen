import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/cliente'
import { ROTULO_PAPEL, type ProfessorOpcao } from '../../../api/tipos'
import { useAuth } from '../../../auth/contexto'
import { ehGestor } from '../../../auth/papeis'
import { SelectField } from '../../../design-system'

/**
 * Professor responsável pela turma (UC2 do doc 009). Só Administrador e Coordenador escolhem;
 * para o professor, a API sempre usa ele mesmo — o campo nem aparece.
 */
export function CampoResponsavel({
  valor,
  aoMudar,
  atual,
}: {
  valor: string
  aoMudar: (id: string) => void
  /** Responsável atual (edição): continua na lista mesmo se estiver desativado. */
  atual?: { id: string; nome: string }
}) {
  const { usuario } = useAuth()
  const gestor = !!usuario && ehGestor(usuario.papel)
  const opcoes = useQuery({
    queryKey: ['professores'],
    queryFn: () => api<ProfessorOpcao[]>('/usuarios/professores'),
    enabled: gestor,
  })
  if (!gestor) return null
  const lista = opcoes.data ?? []
  const foraDaLista = atual && !lista.some((p) => p.id === atual.id) ? [{ valor: atual.id, rotulo: `${atual.nome} (inativo)` }] : []
  return (
    <SelectField
      rotulo="Professor responsável"
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      disabled={!opcoes.data}
      ajuda={opcoes.error ? 'Não foi possível carregar a lista de professores.' : undefined}
      opcoes={[
        ...(valor ? [] : [{ valor: '', rotulo: 'Eu mesmo(a)' }]),
        ...foraDaLista,
        ...lista.map((p) => ({ valor: p.id, rotulo: `${p.nome} (${ROTULO_PAPEL[p.papel]})` })),
      ]}
    />
  )
}
