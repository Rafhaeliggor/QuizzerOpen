import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import { ROTULO_RECURSO, type Recurso } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { AlertBanner, DataTable, StatusBadge, Tabs } from '../../../design-system'
import { formatarDataHora, resumir } from '../../../util/formato'
import './recursos.css'

type Filtro = 'pendentes' | 'analise' | 'concluidos' | 'todos'

const FILTROS: Record<Filtro, (r: Recurso) => boolean> = {
  pendentes: (r) => r.status === 'ABERTO',
  analise: (r) => r.status === 'EM_ANALISE',
  concluidos: (r) => r.status === 'DEFERIDO' || r.status === 'INDEFERIDO',
  todos: () => true,
}

/** RF08 — Recursos recebidos. */
export function ListaRecursos() {
  const [filtro, setFiltro] = useState<Filtro>('pendentes')
  const consulta = useQuery({ queryKey: ['recursos'], queryFn: () => api<Recurso[]>('/recursos') })
  const todos = consulta.data ?? []
  const linhas = todos.filter(FILTROS[filtro])
  const contar = (f: Filtro) => (consulta.data ? todos.filter(FILTROS[f]).length : undefined)
  return (
    <>
      <CabecalhoPagina titulo="Recursos" descricao="Contestações de questões feitas pelos alunos." />
      <Tabs<Filtro>
        rotulo="Filtro"
        ativa={filtro}
        aoMudar={setFiltro}
        abas={[
          { valor: 'pendentes', rotulo: 'Pendentes', contador: contar('pendentes') },
          { valor: 'analise', rotulo: 'Em análise', contador: contar('analise') },
          { valor: 'concluidos', rotulo: 'Concluídos', contador: contar('concluidos') },
          { valor: 'todos', rotulo: 'Todos', contador: contar('todos') },
        ]}
      />
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <section className="qz-cartao qz-recursos__fila">
        <h2>Fila de análise</h2>
        <DataTable
          rotulo="Recursos"
          carregando={consulta.isPending}
          linhas={linhas}
          chaveLinha={(r) => r.id}
          vazio="Nenhum recurso."
          colunas={[
            {
              chave: 'aluno',
              titulo: 'Aluno',
              render: (r) => (
                <>
                  <Link to={`/app/recursos/${r.id}`} className="qz-recursos__link">
                    {r.participanteNome}
                  </Link>
                  <span className="qz-tabela__sub">Aberto em {formatarDataHora(r.criadoEm)}</span>
                </>
              ),
            },
            {
              chave: 'prova',
              titulo: 'Avaliação',
              render: (r) => (
                <>
                  {r.provaTitulo}
                  <span className="qz-tabela__sub">Questão {r.questaoOrdem ?? '?'}</span>
                </>
              ),
            },
            { chave: 'just', titulo: 'Argumentação', render: (r) => <span className="qz-suave">{resumir(r.justificativa, 90)}</span> },
            {
              chave: 'status',
              titulo: 'Status',
              render: (r) => (
                <span className="qz-linha">
                  <StatusBadge status={r.status} rotulo={ROTULO_RECURSO[r.status]} />
                  {r.encaminhadoEm && <StatusBadge status="ENCAMINHADO" tom="alerta" rotulo="com a coordenação" />}
                </span>
              ),
            },
          ]}
        />
      </section>
    </>
  )
}
