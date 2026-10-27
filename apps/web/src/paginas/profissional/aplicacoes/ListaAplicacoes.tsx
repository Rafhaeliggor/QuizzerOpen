import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import { ROTULO_JANELA, type AplicacaoResumo, type SituacaoJanela } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { AlertBanner, DataTable, Icone, Metrica, StatusBadge, Tabs, type Coluna } from '../../../design-system'
import { formatarDataHora } from '../../../util/formato'
import './aplicacoes.css'

function descreverDestino(a: AplicacaoResumo) {
  return a.destinoTipo === 'TURMA'
    ? `Turma ${a.turmaNome}`
    : a.destinoTipo === 'ALUNO_AVULSO'
      ? `${a.alunosSelecionados ?? 0} aluno(s) escolhido(s)`
      : `Pública · PIN ${a.pinAcesso}`
}

export function TabelaAplicacoes({ linhas, carregando, ocultarProva }: { linhas: AplicacaoResumo[]; carregando: boolean; ocultarProva?: boolean }) {
  const colunas: Coluna<AplicacaoResumo>[] = [
    {
      chave: 'destino',
      titulo: ocultarProva ? 'Destino' : 'Prova / destino',
      render: (a) =>
        ocultarProva ? (
          <Link to={`/app/aplicacoes/${a.id}`} className="qz-apl-titulo-link">
            {descreverDestino(a)}
          </Link>
        ) : (
          <>
            <strong className="qz-apl-titulo">{a.provaTitulo}</strong>
            <Link to={`/app/aplicacoes/${a.id}`} className="qz-tabela__sub qz-apl-sub-link">
              {descreverDestino(a)}
            </Link>
          </>
        ),
    },
    {
      chave: 'janela',
      titulo: 'Janela',
      render: (a) => (
        <>
          {formatarDataHora(a.janelaInicio)}
          <span className="qz-tabela__sub">até {formatarDataHora(a.janelaFim)}</span>
        </>
      ),
    },
    {
      chave: 'part',
      titulo: 'Participantes',
      render: (a) => (
        <>
          {a.participantes}
          <span className="qz-tabela__sub">
            {a.emAndamento} em andamento · {a.finalizadas} enviadas
          </span>
        </>
      ),
    },
    { chave: 'situacao', titulo: 'Situação', render: (a) => <StatusBadge status={a.situacao} rotulo={ROTULO_JANELA[a.situacao]} /> },
    {
      chave: 'acoes',
      titulo: 'Ações',
      render: (a) => (
        <Link to={`/app/aplicacoes/${a.id}`} className="qz-botao qz-botao--secundario">
          Acompanhar
        </Link>
      ),
    },
  ]
  return <DataTable rotulo="Aplicações" colunas={colunas} linhas={linhas} chaveLinha={(a) => a.id} carregando={carregando} vazio="Nenhuma aplicação ainda." />
}

type Aba = 'TODAS' | SituacaoJanela

export function ListaAplicacoes() {
  const consulta = useQuery({ queryKey: ['aplicacoes', 'todas'], queryFn: () => api<AplicacaoResumo[]>('/aplicacoes') })
  const [aba, setAba] = useState<Aba>('TODAS')
  const [busca, setBusca] = useState('')
  const [destino, setDestino] = useState('')

  const aplicacoes = useMemo(() => consulta.data ?? [], [consulta.data])
  const contar = (s: SituacaoJanela) => aplicacoes.filter((a) => a.situacao === s).length
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return aplicacoes.filter(
      (a) =>
        (aba === 'TODAS' || a.situacao === aba) &&
        (!destino || a.destinoTipo === destino) &&
        (!termo || `${a.provaTitulo} ${a.turmaNome ?? ''}`.toLocaleLowerCase('pt-BR').includes(termo)),
    )
  }, [aplicacoes, aba, busca, destino])
  const valor = (n: number) => (consulta.data ? String(n).padStart(2, '0') : '—')

  return (
    <>
      <CabecalhoPagina
        titulo="Aplicações"
        descricao="Provas direcionadas a turmas ou ao público. Para criar, abra uma prova publicada e clique em “Aplicar prova”."
      />
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <div className="qz-metricas qz-apl-metricas">
        <Metrica rotulo="Total de aplicações" icone="documentos" valor={valor(aplicacoes.length)} />
        <Metrica rotulo="Disponíveis" icone="play" valor={valor(contar('DISPONIVEL'))} />
        <Metrica rotulo="Agendadas" icone="calendario" tom="alerta" valor={valor(contar('AGENDADA'))} />
        <Metrica rotulo="Encerradas" icone="check-circulo" tom="sucesso" valor={valor(contar('ENCERRADA'))} />
      </div>
      <Tabs<Aba>
        rotulo="Situação das aplicações"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { valor: 'TODAS', rotulo: 'Todas', contador: aplicacoes.length },
          { valor: 'DISPONIVEL', rotulo: 'Disponíveis', contador: contar('DISPONIVEL') },
          { valor: 'AGENDADA', rotulo: 'Agendadas', contador: contar('AGENDADA') },
          { valor: 'ENCERRADA', rotulo: 'Encerradas', contador: contar('ENCERRADA') },
        ]}
      />
      <div className="qz-barra-filtros">
        <label className="qz-busca">
          <Icone nome="busca" />
          <input type="search" placeholder="Buscar por prova ou turma" aria-label="Buscar por prova ou turma" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <select className="qz-seletor qz-apl-seletor" aria-label="Destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">Todos os destinos</option>
          <option value="TURMA">Turmas</option>
          <option value="ALUNO_AVULSO">Alunos escolhidos</option>
          <option value="PUBLICO">Públicas (PIN)</option>
        </select>
      </div>
      <TabelaAplicacoes linhas={filtradas} carregando={consulta.isPending} />
    </>
  )
}
