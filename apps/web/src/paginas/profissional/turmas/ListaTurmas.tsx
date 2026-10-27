import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import type { Turma } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { AlertBanner, Button, Card, Icone, Spinner, TextField } from '../../../design-system'
import { formatarData } from '../../../util/formato'
import { CampoResponsavel } from './CampoResponsavel'
import './turmas.css'

/** RF03 — Turmas. */
export function ListaTurmas() {
  const consulta = useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/turmas') })
  const [criando, setCriando] = useState(false)
  const turmas = consulta.data ?? []
  return (
    <>
      <CabecalhoPagina
        titulo="Turmas"
        descricao="Turmas definem quem pode fazer cada prova aplicada."
        acoes={
          !criando && (
            <Button onClick={() => setCriando(true)}>
              <Icone nome="mais" /> Nova turma
            </Button>
          )
        }
      />
      {criando && <FormNovaTurma aoFechar={() => setCriando(false)} />}
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      {consulta.isPending ? (
        <Spinner />
      ) : turmas.length === 0 ? (
        !consulta.error && <Card className="qz-trm-vazio">Nenhuma turma ainda.</Card>
      ) : (
        <ul className="qz-trm-cartoes" aria-label="Turmas">
          {turmas.map((t) => (
            <li key={t.id}>
              <Link to={`/app/turmas/${t.id}`} className="qz-trm-cartao">
                <span className="qz-trm-cartao__topo">
                  <Icone nome="formatura" className="qz-trm-cartao__icone" />
                  {t.souResponsavel && <span className="qz-trm-cartao__marca">Responsável</span>}
                </span>
                <strong className="qz-trm-cartao__nome">{t.nome}</strong>
                <span className="qz-trm-cartao__info">
                  {t.totalAlunos} {t.totalAlunos === 1 ? 'aluno' : 'alunos'} · {t.professorNome}
                  {t.coProfessores.length > 0 && ` + ${t.coProfessores.join(', ')}`}
                </span>
                <span className="qz-trm-cartao__periodo">
                  {formatarData(t.periodoInicio)} a {formatarData(t.periodoFim)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function FormNovaTurma({ aoFechar }: { aoFechar: () => void }) {
  const navegar = useNavigate()
  const cliente = useQueryClient()
  const [nome, setNome] = useState('')
  const [inicio, setInicio] = useState(() => `${new Date().getFullYear()}-08-01`)
  const [fim, setFim] = useState(() => `${new Date().getFullYear()}-12-20`)
  const [responsavel, setResponsavel] = useState('')
  const criar = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/turmas', {
        method: 'POST',
        body: { nome, periodoInicio: inicio, periodoFim: fim, ...(responsavel ? { professorResponsavelId: responsavel } : {}) },
      }),
    onSuccess: (r) => {
      void cliente.invalidateQueries({ queryKey: ['turmas'] })
      navegar(`/app/turmas/${r.id}`)
    },
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    criar.mutate()
  }
  return (
    <Card className="qz-trm-form">
      <h2>Nova turma</h2>
      <form onSubmit={enviar}>
        {criar.error && <AlertBanner tipo="erro">{mensagemDeErro(criar.error)}</AlertBanner>}
        <div className="qz-grade-campos">
          <TextField rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField rotulo="Início do período" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <TextField rotulo="Fim do período" type="date" required value={fim} onChange={(e) => setFim(e.target.value)} />
          <CampoResponsavel valor={responsavel} aoMudar={setResponsavel} />
        </div>
        <div className="qz-linha">
          <Button type="submit" carregando={criar.isPending} disabled={!nome}>
            Criar turma
          </Button>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
