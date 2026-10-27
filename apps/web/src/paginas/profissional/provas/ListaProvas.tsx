import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import { ROTULO_STATUS_PROVA, type ProvaResumo, type StatusProva } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { AlertBanner, DataTable, Icone, Metrica, StatusBadge, Tabs, type Coluna } from '../../../design-system'
import { formatarDataHora } from '../../../util/formato'
import { linkProva } from './links'
import './provas.css'

type Aba = 'TODAS' | StatusProva

const COLUNAS: Coluna<ProvaResumo>[] = [
  {
    chave: 'titulo',
    titulo: 'Prova',
    render: (p) => (
      <>
        <Link to={linkProva(p)} className="qz-prv-titulo-link">
          {p.titulo}
        </Link>
        <span className="qz-tabela__sub">
          {p.autorNome} · {p.visibilidade === 'PUBLICA' ? 'Pública' : 'Privada'}
        </span>
      </>
    ),
  },
  {
    chave: 'questoes',
    titulo: 'Questões / pesos',
    render: (p) => `${p.totalQuestoes} ${p.totalQuestoes === 1 ? 'questão' : 'questões'} · ${p.somaPesos}%`,
  },
  { chave: 'tempo', titulo: 'Tempo', render: (p) => (p.tempoLimiteMin ? `${p.tempoLimiteMin} min` : 'Livre') },
  { chave: 'atualizada', titulo: 'Atualizada', render: (p) => formatarDataHora(p.atualizadoEm) },
  { chave: 'status', titulo: 'Estado', render: (p) => <StatusBadge status={p.status} rotulo={ROTULO_STATUS_PROVA[p.status]} /> },
  {
    chave: 'acoes',
    titulo: 'Ações',
    render: (p) => (
      <Link to={linkProva(p)} className="qz-botao qz-botao--secundario">
        {p.status === 'RASCUNHO' ? 'Continuar' : 'Gerenciar'}
      </Link>
    ),
  },
]

/** RF05 — Provas. */
export function ListaProvas() {
  const consulta = useQuery({ queryKey: ['provas'], queryFn: () => api<ProvaResumo[]>('/provas') })
  const [aba, setAba] = useState<Aba>('TODAS')
  const [busca, setBusca] = useState('')
  const [visibilidade, setVisibilidade] = useState('')

  const provas = useMemo(() => consulta.data ?? [], [consulta.data])
  const contar = (s: StatusProva) => provas.filter((p) => p.status === s).length
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return provas.filter(
      (p) =>
        (aba === 'TODAS' || p.status === aba) &&
        (!visibilidade || p.visibilidade === visibilidade) &&
        (!termo || p.titulo.toLocaleLowerCase('pt-BR').includes(termo)),
    )
  }, [provas, aba, busca, visibilidade])
  const valor = (n: number) => (consulta.data ? String(n).padStart(2, '0') : '—')

  return (
    <>
      <CabecalhoPagina
        titulo="Provas"
        acoes={
          <Link to="/app/provas/nova" className="qz-botao qz-botao--primario">
            <Icone nome="mais" /> Criar prova
          </Link>
        }
      />
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <div className="qz-metricas qz-prv-metricas">
        <Metrica rotulo="Total de provas" icone="documentos" valor={valor(provas.length)} />
        <Metrica rotulo="Publicadas" icone="play" valor={valor(contar('PUBLICADA'))} />
        <Metrica rotulo="Rascunhos" icone="lapis" valor={valor(contar('RASCUNHO'))} />
        <Metrica rotulo="Arquivadas" icone="check-circulo" tom="sucesso" valor={valor(contar('ARQUIVADA'))} />
      </div>
      <Tabs<Aba>
        rotulo="Situação das provas"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { valor: 'TODAS', rotulo: 'Todas', contador: provas.length },
          { valor: 'PUBLICADA', rotulo: 'Publicadas', contador: contar('PUBLICADA') },
          { valor: 'RASCUNHO', rotulo: 'Rascunhos', contador: contar('RASCUNHO') },
          { valor: 'ARQUIVADA', rotulo: 'Arquivadas', contador: contar('ARQUIVADA') },
        ]}
      />
      <div className="qz-barra-filtros">
        <label className="qz-busca">
          <Icone nome="busca" />
          <input type="search" placeholder="Buscar prova" aria-label="Buscar prova" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <select className="qz-seletor qz-prv-seletor" aria-label="Visibilidade" value={visibilidade} onChange={(e) => setVisibilidade(e.target.value)}>
          <option value="">Todas as visibilidades</option>
          <option value="PRIVADA">Privadas</option>
          <option value="PUBLICA">Públicas</option>
        </select>
      </div>
      <DataTable
        rotulo="Provas"
        colunas={COLUNAS}
        linhas={filtradas}
        chaveLinha={(p) => p.id}
        carregando={consulta.isPending}
        vazio={provas.length ? 'Nenhuma prova com esses filtros.' : 'Nenhuma prova ainda.'}
      />
    </>
  )
}
