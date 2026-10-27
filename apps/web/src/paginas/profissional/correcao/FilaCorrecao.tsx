import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import type { PendenteCorrecao } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { AlertBanner, DataTable, Icone, StatusBadge } from '../../../design-system'
import { formatarDataHora } from '../../../util/formato'
import './correcao.css'

/** Resumo da fila: "3 alunos · 5 respostas". */
function resumoPendentes(pendentes: PendenteCorrecao[]): string {
  const envios = pendentes.length
  const respostas = pendentes.reduce((t, p) => t + p.questoesPendentes, 0)
  return `${envios} ${envios === 1 ? 'envio' : 'envios'} · ${respostas} ${respostas === 1 ? 'resposta' : 'respostas'}`
}

/** RF07 passo 5 — fila de correção manual (questões abertas). */
export function FilaCorrecao() {
  const [prova, setProva] = useState('')
  const consulta = useQuery({ queryKey: ['correcao', 'pendentes'], queryFn: () => api<PendenteCorrecao[]>('/correcao/pendentes') })
  const todos = consulta.data ?? []
  const provas = [...new Map(todos.map((p) => [p.provaId, p.provaTitulo])).entries()]
  const linhas = prova ? todos.filter((p) => p.provaId === prova) : todos
  return (
    <>
      <CabecalhoPagina
        titulo="Correções"
        descricao="Questões fechadas são corrigidas automaticamente. A nota final só é publicada quando todas as abertas forem corrigidas."
      />
      {provas.length > 1 && (
        <div className="qz-barra-filtros">
          <select className="qz-seletor qz-correcao__filtro" aria-label="Avaliação" value={prova} onChange={(e) => setProva(e.target.value)}>
            <option value="">Todas as avaliações</option>
            {provas.map(([id, titulo]) => (
              <option key={id} value={id}>
                {titulo}
              </option>
            ))}
          </select>
        </div>
      )}
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <section className="qz-cartao qz-correcao__fila">
        <div className="qz-correcao__fila-topo">
          <h2>Respostas pendentes</h2>
          {consulta.data && <p className="qz-suave">{resumoPendentes(linhas)}</p>}
        </div>
        <DataTable
          rotulo="Fila de correção"
          carregando={consulta.isPending}
          linhas={linhas}
          chaveLinha={(p) => p.notaId}
          vazio="Nenhuma correção pendente. 🎉"
          colunas={[
            {
              chave: 'part',
              titulo: 'Participante',
              render: (p) => (
                <>
                  <strong>{p.participanteNome}</strong>
                  <span className="qz-tabela__sub">Tentativa {p.tentativaNumero}</span>
                </>
              ),
            },
            { chave: 'prova', titulo: 'Avaliação', render: (p) => p.provaTitulo },
            { chave: 'envio', titulo: 'Enviada em', render: (p) => formatarDataHora(p.fimEm) },
            {
              chave: 'pend',
              titulo: 'Situação',
              render: (p) => (
                <StatusBadge
                  status="PENDENTE"
                  rotulo={`${p.questoesPendentes} ${p.questoesPendentes === 1 ? 'questão a corrigir' : 'questões a corrigir'}`}
                />
              ),
            },
            {
              chave: 'acao',
              titulo: '',
              render: (p) => (
                <Link to={`/app/correcoes/${p.notaId}`} className="qz-botao qz-botao--primario">
                  Corrigir <Icone nome="seta-direita" tamanho={16} />
                </Link>
              ),
            },
          ]}
        />
      </section>
    </>
  )
}
