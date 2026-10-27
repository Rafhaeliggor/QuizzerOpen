import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api, mensagemDeErro } from '../../api/cliente'
import { ROTULO_JANELA, type ExecucaoPayload, type ProvaDoAluno, type ResultadoAlunoResumo, type ValorResposta } from '../../api/tipos'
import { useAuth } from '../../auth/contexto'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { AlertBanner, Button, Card, Dialog, Icone, Spinner, StatusBadge, Tabs } from '../../design-system'
import { formatarDataHora, formatarNota } from '../../util/formato'
import './aluno.css'

type Aba = 'todas' | 'disponiveis' | 'andamento' | 'agendadas' | 'concluidas'

const ORDEM = { DISPONIVEL: 0, AGENDADA: 1, ENCERRADA: 2 }

function categoria(p: ProvaDoAluno): Exclude<Aba, 'todas'> {
  if (p.tentativaEmAndamentoId) return 'andamento'
  if (p.podeIniciar) return 'disponiveis'
  if (p.situacao === 'AGENDADA') return 'agendadas'
  return 'concluidas'
}

function temResposta(v: ValorResposta | undefined): boolean {
  return !!v && (!!v.alternativaId || !!v.alternativaIds?.length || !!v.texto?.trim() || !!v.ordem?.length || Object.keys(v.pares ?? {}).length > 0)
}

function tempoRestante(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(min / 60)
  return h ? `${h}h${String(min % 60).padStart(2, '0')}min restantes` : `${min}min restantes`
}

const formatoHoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

/** Ambiente do aluno: prova em andamento em destaque, provas por situação e resultados recentes. */
export function PainelAluno() {
  const { usuario } = useAuth()
  const navegar = useNavigate()
  const provas = useQuery({ queryKey: ['aluno', 'aplicacoes'], queryFn: () => api<ProvaDoAluno[]>('/aluno/aplicacoes'), refetchInterval: 60_000 })
  const resultados = useQuery({ queryKey: ['aluno', 'resultados'], queryFn: () => api<ResultadoAlunoResumo[]>('/aluno/resultados') })
  const [confirmar, setConfirmar] = useState<ProvaDoAluno | null>(null)
  const [aba, setAba] = useState<Aba>('todas')
  const [hoje] = useState(() => formatoHoje.format(new Date()))
  const iniciar = useMutation({
    mutationFn: (aplicacaoId: string) => api<{ tentativaId: string }>(`/aluno/aplicacoes/${aplicacaoId}/iniciar`, { method: 'POST' }),
    onSuccess: (r) => navegar(`/aluno/prova/${r.tentativaId}`),
  })
  const lista = [...(provas.data ?? [])].sort((a, b) => ORDEM[a.situacao] - ORDEM[b.situacao])
  const emAndamento = lista.find((p) => p.tentativaEmAndamentoId)
  // Progresso e tempo da tentativa em andamento (só leitura: não abre sessão de execução).
  const andamento = useQuery({
    queryKey: ['aluno', 'tentativa-resumo', emAndamento?.tentativaEmAndamentoId],
    queryFn: () => api<ExecucaoPayload>(`/aluno/tentativas/${emAndamento!.tentativaEmAndamentoId}`),
    enabled: !!emAndamento,
    refetchInterval: 60_000,
    select: (d) => ({
      ativa: d.tentativa.status === 'EM_ANDAMENTO' || d.tentativa.status === 'REABERTA',
      respondidas: d.questoes.filter((q) => temResposta(d.respostas[q.versaoQuestaoId])).length,
      total: d.questoes.length,
      restanteMs: new Date(d.tentativa.prazoEm).getTime() - new Date(d.agora).getTime(),
    }),
  })
  if (!usuario) return null

  const contagem = (c: Exclude<Aba, 'todas'>) => lista.filter((p) => categoria(p) === c).length
  const visiveis = aba === 'todas' ? lista : lista.filter((p) => categoria(p) === aba)
  const abas: { valor: Aba; rotulo: string; contador: number }[] = [
    { valor: 'todas', rotulo: 'Todas', contador: lista.length },
    { valor: 'disponiveis', rotulo: 'Disponíveis', contador: contagem('disponiveis') },
    { valor: 'andamento', rotulo: 'Em andamento', contador: contagem('andamento') },
    { valor: 'agendadas', rotulo: 'Agendadas', contador: contagem('agendadas') },
    { valor: 'concluidas', rotulo: 'Concluídas', contador: contagem('concluidas') },
  ]
  const progresso = andamento.data && andamento.data.ativa ? andamento.data : null

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Olá, {usuario.nome.split(' ')[0]}
            <span className="qz-al-aceno" aria-hidden>
              👋
            </span>
          </>
        }
        acoes={<span className="qz-al-data">{hoje.charAt(0).toUpperCase() + hoje.slice(1)}</span>}
      />

      {emAndamento && (!andamento.data || progresso) && (
        <Card className="qz-cartao--destaque qz-al-destaque">
          <div className="qz-al-destaque__icone" aria-hidden>
            <Icone nome="caderno" tamanho={40} />
          </div>
          <div className="qz-al-destaque__textos">
            <StatusBadge status="EM_ANDAMENTO" rotulo="Em andamento" />
            <p className="qz-al-destaque__titulo">{emAndamento.provaTitulo}</p>
            <span className="qz-al-destaque__meta">
              {emAndamento.turmaNome} · {emAndamento.totalQuestoes} questões
            </span>
            {progresso && (
              <>
                <span className="qz-suave qz-pequeno">
                  {progresso.respondidas} de {progresso.total} questões respondidas · Seu progresso está salvo
                </span>
                <div className="qz-al-barra" aria-hidden>
                  <div
                    className="qz-al-barra__preenchida"
                    style={{ width: `${progresso.total ? (progresso.respondidas / progresso.total) * 100 : 0}%` }}
                  />
                </div>
              </>
            )}
          </div>
          <div className="qz-al-destaque__acao">
            {progresso && <strong>{tempoRestante(progresso.restanteMs)}</strong>}
            <Link to={`/aluno/prova/${emAndamento.tentativaEmAndamentoId}`} className="qz-botao qz-botao--primario">
              <Icone nome="seta-direita" />
              Continuar avaliação
            </Link>
            <span className="qz-pequeno">O tempo continua contando.</span>
          </div>
        </Card>
      )}

      <h2 className="qz-al-secao">Minhas provas</h2>
      {provas.isPending && <Spinner />}
      {provas.error && <AlertBanner tipo="erro">{mensagemDeErro(provas.error)}</AlertBanner>}
      {iniciar.error && <AlertBanner tipo="erro">{mensagemDeErro(iniciar.error)}</AlertBanner>}
      {provas.data && lista.length === 0 && (
        <Card>
          <p className="qz-suave" style={{ margin: 0 }}>
            Nenhuma prova para você no momento. Quando um professor liberar uma prova para sua turma, ela aparecerá aqui.
          </p>
        </Card>
      )}
      {lista.length > 0 && (
        <>
          <Tabs rotulo="Filtrar provas" abas={abas.filter((a) => a.valor !== 'agendadas' || a.contador > 0)} ativa={aba} aoMudar={setAba} />
          {visiveis.length === 0 && <p className="qz-suave">Nenhuma prova nesta situação.</p>}
          <div className="qz-al-provas">
            {visiveis.map((p) => (
              <Card key={p.aplicacaoId} className="qz-cartao-prova">
                <h3 className="qz-al-prova__titulo">{p.provaTitulo}</h3>
                <div className="qz-al-prova__info">
                  <StatusBadge
                    status={p.situacao}
                    rotulo={p.tentativaEmAndamentoId ? 'Em andamento' : ROTULO_JANELA[p.situacao]}
                    tom={p.tentativaEmAndamentoId ? 'info' : undefined}
                  />
                  <span className="qz-suave">{p.turmaNome}</span>
                  <span>
                    {p.totalQuestoes} questões · {p.tempoLimiteMin ? `${p.tempoLimiteMin} minutos` : 'sem limite de tempo'}
                  </span>
                  <span className="qz-suave qz-pequeno">
                    {p.situacao === 'AGENDADA' ? 'Abre em ' : p.situacao === 'ENCERRADA' ? 'Encerrada em ' : 'Disponível até '}
                    {formatarDataHora(p.situacao === 'AGENDADA' ? p.janelaInicio : p.janelaFim)} · tentativas {p.tentativasUsadas}/
                    {p.tentativasPermitidas}
                  </span>
                </div>
                <div className="qz-al-prova__acao">
                  {p.tentativaEmAndamentoId ? (
                    <Link to={`/aluno/prova/${p.tentativaEmAndamentoId}`} className="qz-botao qz-botao--primario">
                      Continuar prova
                    </Link>
                  ) : p.podeIniciar ? (
                    <Button variante="secundario" onClick={() => setConfirmar(p)}>
                      Iniciar prova
                    </Button>
                  ) : p.ultimaTentativaId ? (
                    <Link to={`/aluno/comprovante/${p.ultimaTentativaId}`} className="qz-botao qz-botao--secundario">
                      Ver comprovante
                    </Link>
                  ) : (
                    <Button variante="secundario" disabled>
                      {p.situacao === 'AGENDADA' ? 'Ainda não disponível' : 'Encerrada'}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="qz-al-secao" style={{ marginTop: 40 }}>
        Resultados recentes
      </h2>
      <Card>
        {resultados.data?.length ? (
          <ul className="qz-al-recentes">
            {resultados.data.slice(0, 5).map((r) => (
              <li key={r.id}>
                <span>
                  <Link to={`/aluno/resultados/${r.id}`}>{r.provaTitulo}</Link>
                  <span className="qz-suave qz-pequeno"> · enviada em {formatarDataHora(r.fimEm)}</span>
                </span>
                {r.status === 'CONSOLIDADA' ? (
                  <strong className="qz-al-tom--sucesso">{formatarNota(r.notaFinal)} / 10</strong>
                ) : (
                  <StatusBadge status="PENDENTE" tom="alerta" rotulo="Aguardando correção" />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="qz-suave" style={{ margin: 0 }}>
            Nenhum resultado ainda.
          </p>
        )}
      </Card>

      <Dialog
        aberto={!!confirmar}
        titulo={`Iniciar "${confirmar?.provaTitulo}"?`}
        aoFechar={() => setConfirmar(null)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setConfirmar(null)}>
              Agora não
            </Button>
            <Button carregando={iniciar.isPending} onClick={() => confirmar && iniciar.mutate(confirmar.aplicacaoId)}>
              <Icone nome="seta-direita" />
              Iniciar agora
            </Button>
          </>
        }
      >
        {confirmar && (
          <div className="qz-al-orientacoes">
            {confirmar.provaDescricao && <p className="qz-pre qz-suave">{confirmar.provaDescricao}</p>}
            <div className="qz-al-numeros">
              <div>
                <Icone nome="documentos" />
                <span>Questões</span>
                <strong>{confirmar.totalQuestoes} questões</strong>
              </div>
              <div>
                <Icone nome="relogio" />
                <span>Duração</span>
                <strong>{confirmar.tempoLimiteMin ? `${confirmar.tempoLimiteMin} minutos` : 'Sem limite'}</strong>
              </div>
              <div>
                <Icone nome="alvo" />
                <span>Tentativa</span>
                <strong>
                  {confirmar.tentativasUsadas + 1} de {confirmar.tentativasPermitidas}
                </strong>
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Orientações da avaliação</h3>
            <ol className="qz-al-passos">
              <li>{confirmar.tempoLimiteMin ? `Você terá ${confirmar.tempoLimiteMin} minutos.` : 'Sem limite de tempo além da janela da prova.'}</li>
              <li>O cronômetro corre no servidor e não pausa se você fechar a página ou perder a conexão.</li>
              <li>Suas respostas são salvas automaticamente.</li>
            </ol>
            <AlertBanner tipo="alerta" titulo="O tempo começa ao iniciar">
              A prova fica disponível até {formatarDataHora(confirmar.janelaFim)}. Se você sair, pode retomar enquanto ainda houver tempo.
            </AlertBanner>
          </div>
        )}
      </Dialog>
    </>
  )
}
