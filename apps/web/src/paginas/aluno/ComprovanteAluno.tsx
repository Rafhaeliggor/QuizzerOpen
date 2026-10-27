import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import { api } from '../../api/cliente'
import type { Comprovante } from '../../api/tipos'
import { EstadoConsulta } from '../../componentes/EstadoConsulta'
import { VisaoComprovante } from '../../componentes/execucao/VisaoComprovante'
import { Button } from '../../design-system'

export function ComprovanteAluno() {
  const { id } = useParams()
  const inicial = useLocation().state as Comprovante | null
  const consulta = useQuery({
    queryKey: ['comprovante', id],
    queryFn: () => api<Comprovante>(`/aluno/tentativas/${id}/comprovante`),
    initialData: inicial ?? undefined,
  })
  return (
    <EstadoConsulta consulta={consulta}>
      {(c) => (
        <VisaoComprovante
          c={c}
          acoes={
            <>
              <Link to="/aluno" className="qz-botao qz-botao--primario">
                Voltar às minhas provas
              </Link>
              {c.resultado && 'notaId' in c.resultado && (
                <Link to={`/aluno/resultados/${c.resultado.notaId}`} className="qz-botao qz-botao--secundario">
                  Ver resultado
                </Link>
              )}
              <Button variante="fantasma" onClick={() => window.print()}>
                Imprimir
              </Button>
            </>
          }
        />
      )}
    </EstadoConsulta>
  )
}
