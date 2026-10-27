import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import {
  ROTULO_APROVACAO,
  ROTULO_JANELA,
  ROTULO_TENTATIVA,
  type AplicacaoDetalhe,
  type EventosTentativa,
  type TentativaAcompanhamento,
} from '../../../api/tipos'
import { podeDelegado } from '../../../auth/papeis'
import { useAuth } from '../../../auth/contexto'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, DataTable, Dialog, Icone, Metrica, StatusBadge, TextArea, TextField } from '../../../design-system'
import { formatarDataHora, formatarNota } from '../../../util/formato'
import './aplicacoes.css'

/** Acompanhamento da aplicação (participantes, situação e notas), atualizado a cada 15 s. */
export function AcompanhamentoAplicacao() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const cliente = useQueryClient()
  const consulta = useQuery({
    queryKey: ['aplicacao', id],
    queryFn: () => api<AplicacaoDetalhe>(`/aplicacoes/${id}`),
    refetchInterval: 15_000,
  })
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)
  const [reabrindo, setReabrindo] = useState<{ tentativa: TentativaAcompanhamento; nome: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [eventosDe, setEventosDe] = useState<{ tentativaId: string; nome: string } | null>(null)

  const encerrar = useMutation({
    mutationFn: () => api(`/aplicacoes/${id}/encerrar`, { method: 'POST' }),
    onSuccess: () => {
      setConfirmandoEncerrar(false)
      void cliente.invalidateQueries({ queryKey: ['aplicacao', id] })
    },
  })

  return (
    <EstadoConsulta consulta={consulta}>
      {(a) => {
        const link = a.pinAcesso ? `${window.location.origin}/p/${a.pinAcesso}` : null
        const ultimas = a.participantes.map((p) => p.tentativas.at(-1))
        const contagem = {
          emAndamento: ultimas.filter((t) => t?.status === 'EM_ANDAMENTO' || t?.status === 'REABERTA').length,
          enviadas: ultimas.filter((t) => t?.status === 'ENVIADA' || t?.status === 'EXPIRADA').length,
          aguardando: ultimas.filter((t) => t?.nota?.status === 'PENDENTE_CORRECAO_MANUAL').length,
          naoIniciaram: ultimas.filter((t) => !t).length,
        }
        return (
          <>
            <CabecalhoPagina
              voltar={{ para: `/app/provas/${a.provaId}`, rotulo: `Voltar para ${a.provaTitulo}` }}
              sobretitulo={<StatusBadge status={a.situacao} rotulo={ROTULO_JANELA[a.situacao]} />}
              titulo={
                a.destinoTipo === 'TURMA' ? `Turma ${a.turmaNome}` : a.destinoTipo === 'ALUNO_AVULSO' ? 'Alunos escolhidos' : 'Aplicação pública'
              }
              descricao={`${a.provaTitulo} · ${formatarDataHora(a.janelaInicio)} → ${formatarDataHora(a.janelaFim)}`}
              acoes={
                <>
                  <Link to={`/app/relatorios/provas/${a.provaId}?aplicacaoId=${a.id}`} className="qz-botao qz-botao--secundario">
                    <Icone nome="grafico" /> Relatório
                  </Link>
                  {a.situacao !== 'ENCERRADA' && (
                    <Button variante="secundario" onClick={() => setConfirmandoEncerrar(true)}>
                      Encerrar agora
                    </Button>
                  )}
                </>
              }
            />
            <div className="qz-metricas qz-apl-metricas">
              <Metrica rotulo="Participantes" icone="usuarios" valor={a.participantes.length} />
              <Metrica rotulo="Em andamento" icone="play" valor={contagem.emAndamento} />
              <Metrica rotulo="Enviadas" icone="check-circulo" tom="sucesso" valor={contagem.enviadas} />
              <Metrica
                rotulo="Aguardando correção"
                icone="relogio"
                tom="alerta"
                valor={contagem.aguardando}
                detalhe={contagem.naoIniciaram > 0 ? `${contagem.naoIniciaram} ainda não iniciaram` : undefined}
              />
            </div>
            {link && (
              <Card className="qz-cartao--destaque qz-apl-acesso">
                <div>
                  <div className="qz-suave qz-pequeno">Código de acesso</div>
                  <div className="qz-pin">{a.pinAcesso}</div>
                </div>
                <div className="qz-apl-acesso__link">
                  <div className="qz-suave qz-pequeno">Link para os participantes</div>
                  <code className="qz-codigo">{link}</code>
                </div>
                <Button
                  variante="secundario"
                  onClick={() => {
                    void navigator.clipboard?.writeText(link).then(() => setCopiado(true))
                  }}
                >
                  {copiado ? 'Copiado!' : 'Copiar link'}
                </Button>
              </Card>
            )}
            <h2 className="qz-apl-secao">Participantes</h2>
            <DataTable
              rotulo="Participantes"
              chaveLinha={(p) => p.chave}
              linhas={a.participantes}
              vazio={a.destinoTipo === 'PUBLICO' ? 'Ninguém iniciou a prova ainda.' : 'A turma não tem alunos.'}
              colunas={[
                {
                  chave: 'nome',
                  titulo: 'Participante',
                  render: (p) => (
                    <>
                      <strong>{p.nome}</strong>
                      <span className="qz-tabela__sub">
                        {p.email}
                        {p.matriculaAtiva === false && ' · desvinculado da turma'}
                      </span>
                    </>
                  ),
                },
                {
                  chave: 'tent',
                  titulo: 'Tentativas',
                  render: (p) =>
                    p.tentativas.length === 0 ? (
                      <span className="qz-suave">Não iniciou</span>
                    ) : (
                      <div className="qz-pilha" style={{ gap: 6 }}>
                        {p.tentativas.map((t) => (
                          <div key={t.id} className="qz-linha">
                            <span className="qz-pequeno">#{t.numero}</span>
                            <StatusBadge status={t.status} rotulo={ROTULO_TENTATIVA[t.status]} />
                            <span className="qz-suave qz-pequeno">
                              {formatarDataHora(t.inicioEm)}
                              {t.fimEm && ` → ${formatarDataHora(t.fimEm)}`}
                            </span>
                            {t.trocasSessao > 0 && (
                              <StatusBadge
                                status="TROCA"
                                tom="alerta"
                                rotulo={`aberta em outro dispositivo ${t.trocasSessao}×`}
                              />
                            )}
                            {t.saidasDeFoco > 0 && (
                              <button
                                type="button"
                                className="qz-link qz-pequeno"
                                onClick={() => setEventosDe({ tentativaId: t.id, nome: p.nome })}
                                aria-label={`Ver saídas da prova de ${p.nome}`}
                              >
                                <StatusBadge status="FOCO" tom="alerta" rotulo={`saiu da prova ${t.saidasDeFoco}×`} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ),
                },
                {
                  chave: 'nota',
                  titulo: 'Nota',
                  render: (p) => {
                    const t = p.tentativas.at(-1)
                    if (!t?.nota) return '—'
                    return t.nota.status === 'CONSOLIDADA' ? (
                      <span className="qz-linha">
                        <strong>{formatarNota(t.nota.notaFinal)}</strong>
                        {t.nota.statusAprovacao && (
                          <StatusBadge status={t.nota.statusAprovacao} rotulo={ROTULO_APROVACAO[t.nota.statusAprovacao]} />
                        )}
                      </span>
                    ) : (
                      <Link to={`/app/correcoes/${t.nota.id}`}>Corrigir (provisória {formatarNota(t.nota.notaProvisoria)})</Link>
                    )
                  },
                },
                {
                  chave: 'acoes',
                  titulo: 'Ações',
                  render: (p) => {
                    const t = p.tentativas.at(-1)
                    return (
                      <div className="qz-linha">
                        {t?.nota && (
                          <Link to={`/app/correcoes/${t.nota.id}`} className="qz-pequeno">
                            Ver correção
                          </Link>
                        )}
                        {t && usuario && podeDelegado(usuario, 'REABRIR_TENTATIVAS') && (t.status === 'ENVIADA' || t.status === 'EXPIRADA') && (
                          <Button variante="fantasma" onClick={() => setReabrindo({ tentativa: t, nome: p.nome })}>
                            Reabrir
                          </Button>
                        )}
                      </div>
                    )
                  },
                },
              ]}
            />

            <Dialog
              aberto={confirmandoEncerrar}
              titulo="Encerrar a aplicação agora?"
              aoFechar={() => setConfirmandoEncerrar(false)}
              acoes={
                <>
                  <Button variante="secundario" onClick={() => setConfirmandoEncerrar(false)}>
                    Cancelar
                  </Button>
                  <Button carregando={encerrar.isPending} onClick={() => encerrar.mutate()}>
                    Encerrar
                  </Button>
                </>
              }
            >
              <p>Ninguém mais poderá iniciar a prova. Tentativas em andamento serão enviadas automaticamente com as respostas já salvas.</p>
              {encerrar.error && <AlertBanner tipo="erro">{mensagemDeErro(encerrar.error)}</AlertBanner>}
            </Dialog>

            {eventosDe && <DialogEventos {...eventosDe} aoFechar={() => setEventosDe(null)} />}

            {reabrindo && (
              <DialogReabrir
                tentativaId={reabrindo.tentativa.id}
                nome={reabrindo.nome}
                aoFechar={() => setReabrindo(null)}
                aoReabrir={() => {
                  setReabrindo(null)
                  void cliente.invalidateQueries({ queryKey: ['aplicacao', id] })
                }}
              />
            )}
          </>
        )
      }}
    </EstadoConsulta>
  )
}

function DialogReabrir({ tentativaId, nome, aoFechar, aoReabrir }: { tentativaId: string; nome: string; aoFechar: () => void; aoReabrir: () => void }) {
  const [justificativa, setJustificativa] = useState('')
  const [minutos, setMinutos] = useState(15)
  const reabrir = useMutation({
    mutationFn: () => api(`/aplicacoes/tentativas/${tentativaId}/reabrir`, { method: 'POST', body: { justificativa, minutos } }),
    onSuccess: aoReabrir,
  })
  return (
    <Dialog
      aberto
      titulo={`Reabrir tentativa de ${nome}`}
      aoFechar={aoFechar}
      acoes={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button carregando={reabrir.isPending} disabled={!justificativa.trim() || minutos < 1} onClick={() => reabrir.mutate()}>
            Reabrir
          </Button>
        </>
      }
    >
      <AlertBanner tipo="alerta">Ação administrativa registrada na auditoria. A nota atual é descartada e recalculada no novo envio.</AlertBanner>
      {reabrir.error && <AlertBanner tipo="erro">{mensagemDeErro(reabrir.error)}</AlertBanner>}
      <TextArea rotulo="Justificativa (obrigatória)" required value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
      {/* Fora de <form> o navegador não aplica min/max: limita aqui (a API aceita inteiro de 1 a 600). */}
      <TextField
        rotulo="Minutos adicionais"
        ajuda="De 1 a 600"
        type="number"
        min={1}
        max={600}
        step={1}
        value={minutos}
        onChange={(e) => setMinutos(Math.max(0, Math.min(600, Math.round(Number(e.target.value)))))}
      />
    </Dialog>
  )
}

/** Linha do tempo das saídas/voltas da aba da prova (só registro — não é prova de fraude). */
function DialogEventos({ tentativaId, nome, aoFechar }: { tentativaId: string; nome: string; aoFechar: () => void }) {
  const consulta = useQuery({
    queryKey: ['eventos-tentativa', tentativaId],
    queryFn: () => api<EventosTentativa>(`/aplicacoes/tentativas/${tentativaId}/eventos`),
  })
  return (
    <Dialog aberto titulo={`Saídas da prova — ${nome}`} aoFechar={aoFechar} acoes={<Button onClick={aoFechar}>Fechar</Button>}>
      <EstadoConsulta consulta={consulta}>
        {(e) => (
          <>
            <p className="qz-suave qz-pequeno">
              Registro de quando a aba da prova deixou de estar visível (troca de aba, outro programa, tela bloqueada).
              Serve de contexto para o professor; não indica fraude por si só.
            </p>
            <ul>
              {e.eventos.map((ev, i) => (
                <li key={i}>
                  {formatarDataHora(ev.ocorridoEm)} — {ev.tipo === 'SAIU_DA_PROVA' ? 'saiu da prova' : 'voltou à prova'}
                </li>
              ))}
            </ul>
          </>
        )}
      </EstadoConsulta>
    </Dialog>
  )
}
