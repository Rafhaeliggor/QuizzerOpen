import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import {
  ROTULO_DIFICULDADE,
  ROTULO_FORMATO,
  formatoDaQuestao,
  ROTULO_STATUS_QUESTAO,
  type Dificuldade,
  type Pagina,
  type QuestaoResumo,
} from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { AlertBanner, DataTable, Icone, StatusBadge, Tabs, type Coluna, type TomStatus } from '../../../design-system'
import { formatarData, resumir } from '../../../util/formato'
import './questoes.css'

type Escopo = 'todas' | 'minhas' | 'revisao' | 'publicadas'

const TOM_DIFICULDADE: Record<Dificuldade, TomStatus> = { FACIL: 'sucesso', MEDIO: 'alerta', DIFICIL: 'erro' }

const COLUNAS: Coluna<QuestaoResumo>[] = [
  {
    chave: 'questao',
    titulo: 'Questão',
    render: (q) => (
      <>
        <Link to={`/app/questoes/${q.id}`} className="qz-qst-enunciado">
          {resumir(q.versaoVigente.enunciado, 110)}
        </Link>
        <span className="qz-tabela__sub">
          {[q.disciplina, q.topico, q.autorNome, `atualizada em ${formatarData(q.atualizadoEm)}`].filter(Boolean).join(' · ')}
        </span>
      </>
    ),
  },
  { chave: 'tipo', titulo: 'Tipo', largura: '170px', render: (q) => ROTULO_FORMATO[formatoDaQuestao(q)] },
  {
    chave: 'dificuldade',
    titulo: 'Dificuldade',
    largura: '130px',
    render: (q) => <StatusBadge status={q.dificuldade} tom={TOM_DIFICULDADE[q.dificuldade]} rotulo={ROTULO_DIFICULDADE[q.dificuldade]} />,
  },
  {
    chave: 'estado',
    titulo: 'Estado',
    largura: '170px',
    render: (q) => (
      <span className="qz-qst-badges">
        <StatusBadge status={q.statusAtual} rotulo={ROTULO_STATUS_QUESTAO[q.statusAtual]} />
        {q.versaoPendente && <StatusBadge status="PENDENTE" tom="alerta" rotulo="nova versão pendente" />}
        {q.altoRisco && <StatusBadge status="ALTO_RISCO" tom="neutro" rotulo="alto risco" />}
      </span>
    ),
  },
  {
    chave: 'acoes',
    titulo: 'Ações',
    largura: '80px',
    render: (q) => (
      <Link to={`/app/questoes/${q.id}`} className="qz-botao qz-botao--fantasma qz-botao--icone" aria-label="Abrir questão" title="Abrir questão">
        <Icone nome="reticencias" />
      </Link>
    ),
  },
]

/** RF04 — Banco de questões. */
export function ListaQuestoes() {
  const [escopo, setEscopo] = useState<Escopo>('todas')
  const [natureza, setNatureza] = useState('')
  const [formato, setFormato] = useState('')
  const [dificuldade, setDificuldade] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)

  const params = new URLSearchParams({ escopo, pagina: String(pagina), tamanho: '20' })
  if (natureza) params.set('natureza', natureza)
  if (formato) params.set('formato', formato)
  if (dificuldade) params.set('dificuldade', dificuldade)
  if (disciplina) params.set('disciplina', disciplina)
  if (busca.trim()) params.set('busca', busca.trim())

  const consulta = useQuery({
    queryKey: ['questoes', params.toString()],
    queryFn: () => api<Pagina<QuestaoResumo>>(`/questoes?${params}`),
  })
  const disciplinas = useQuery({ queryKey: ['questoes', 'disciplinas'], queryFn: () => api<string[]>('/questoes/disciplinas') })
  const filtrar = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPagina(1)
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Banco de Questões"
        acoes={
          <Link to="/app/questoes/nova" className="qz-botao qz-botao--primario">
            <Icone nome="mais" /> Nova questão
          </Link>
        }
      />
      <Tabs<Escopo>
        rotulo="Escopo"
        ativa={escopo}
        aoMudar={filtrar(setEscopo)}
        abas={[
          { valor: 'todas', rotulo: 'Todas' },
          { valor: 'minhas', rotulo: 'Minhas' },
          { valor: 'revisao', rotulo: 'Aguardando minha revisão' },
          { valor: 'publicadas', rotulo: 'Publicadas' },
        ]}
      />
      <div className="qz-barra-filtros">
        <label className="qz-busca">
          <Icone nome="busca" />
          <input
            type="search"
            aria-label="Buscar no enunciado"
            placeholder="Buscar no enunciado"
            value={busca}
            onChange={(e) => filtrar(setBusca)(e.target.value)}
          />
        </label>
        <select className="qz-seletor" aria-label="Disciplina" value={disciplina} onChange={(e) => filtrar(setDisciplina)(e.target.value)}>
          <option value="">Disciplina</option>
          {(disciplinas.data ?? []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select className="qz-seletor" aria-label="Natureza" value={natureza} onChange={(e) => filtrar(setNatureza)(e.target.value)}>
          <option value="">Natureza</option>
          <option value="FECHADA">Fechada</option>
          <option value="ABERTA">Aberta</option>
        </select>
        <select className="qz-seletor" aria-label="Tipo" value={formato} onChange={(e) => filtrar(setFormato)(e.target.value)}>
          <option value="">Tipo</option>
          {(Object.keys(ROTULO_FORMATO) as (keyof typeof ROTULO_FORMATO)[]).map((f) => (
            <option key={f} value={f}>
              {ROTULO_FORMATO[f]}
            </option>
          ))}
        </select>
        <select className="qz-seletor" aria-label="Dificuldade" value={dificuldade} onChange={(e) => filtrar(setDificuldade)(e.target.value)}>
          <option value="">Dificuldade</option>
          {(Object.keys(ROTULO_DIFICULDADE) as Dificuldade[]).map((d) => (
            <option key={d} value={d}>
              {ROTULO_DIFICULDADE[d]}
            </option>
          ))}
        </select>
      </div>
      <div className="qz-qst-resumo-filtros">
        {disciplina && (
          <button type="button" className="qz-qst-chip" onClick={() => filtrar(setDisciplina)('')} aria-label={`Remover filtro ${disciplina}`}>
            {disciplina} ×
          </button>
        )}
        {natureza && (
          <button type="button" className="qz-qst-chip" onClick={() => filtrar(setNatureza)('')} aria-label="Remover filtro de natureza">
            {natureza === 'FECHADA' ? 'Fechada' : 'Aberta'} ×
          </button>
        )}
        {formato && (
          <button type="button" className="qz-qst-chip" onClick={() => filtrar(setFormato)('')} aria-label="Remover filtro de tipo">
            {ROTULO_FORMATO[formato as keyof typeof ROTULO_FORMATO]} ×
          </button>
        )}
        {dificuldade && (
          <button type="button" className="qz-qst-chip" onClick={() => filtrar(setDificuldade)('')} aria-label="Remover filtro de dificuldade">
            {ROTULO_DIFICULDADE[dificuldade as Dificuldade]} ×
          </button>
        )}
        {consulta.data && (
          <span className="qz-suave qz-pequeno">
            {consulta.data.total} {consulta.data.total === 1 ? 'questão encontrada' : 'questões encontradas'}
          </span>
        )}
        <span className="qz-suave qz-pequeno qz-qst-dica">Questões passam por revisão de outra pessoa antes de ficarem disponíveis para provas.</span>
      </div>
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <DataTable
        rotulo="Questões"
        rotuloItens="questões"
        colunas={COLUNAS}
        linhas={consulta.data?.itens ?? []}
        chaveLinha={(q) => q.id}
        carregando={consulta.isPending}
        vazio={escopo === 'revisao' ? 'Nenhuma questão aguardando sua revisão.' : 'Nenhuma questão encontrada.'}
        paginacao={consulta.data && { ...consulta.data, aoMudarPagina: setPagina }}
      />
    </>
  )
}
