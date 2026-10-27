import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import {
  formatoDaQuestao,
  ROTULO_FORMATO,
  ROTULO_NOTA,
  ROTULO_RECURSO,
  type Recurso,
  type RecursoDetalhe,
  alternativaCorreta,
  descreverNumerico,
} from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, Dialog, Icone, SelectField, Spinner, StatusBadge, TextArea, TextField } from '../../../design-system'
import { formatarDataHora, formatarNota } from '../../../util/formato'
import { ListaMidias } from '../../../componentes/Midias'
import { TextoRico } from '../../../componentes/TextoRico'
import { RespostaEstruturada } from '../../../componentes/QuestaoEstruturada'
import { useAuth } from '../../../auth/contexto'
import { ehGestor } from '../../../auth/papeis'
import './recursos.css'

const ROTULO_EFEITO: Record<string, string> = {
  AJUSTE_INDIVIDUAL: 'Pontuação ajustada para este aluno',
  ANULACAO_PONTUAR_TODOS: 'Questão anulada — pontuação integral para todos',
  ANULACAO_REMOVER_DO_TOTAL: 'Questão anulada — removida do total para todos',
}

export function DetalheRecurso() {
  const { usuario } = useAuth()
  const [encaminhando, setEncaminhando] = useState(false)
  const { id } = useParams()
  const cliente = useQueryClient()
  const consulta = useQuery({ queryKey: ['recurso', id], queryFn: () => api<RecursoDetalhe>(`/recursos/${id}`) })
  const atualizar = (r: RecursoDetalhe) => {
    cliente.setQueryData(['recurso', id], r)
    void cliente.invalidateQueries({ queryKey: ['recursos'] })
  }
  const analisar = useMutation({ mutationFn: () => api<RecursoDetalhe>(`/recursos/${id}/analisar`, { method: 'POST' }), onSuccess: atualizar })
  const r = consulta.data
  const decidido = r?.status === 'DEFERIDO' || r?.status === 'INDEFERIDO'
  const podeDecidir = !!r && !decidido && !(r.encaminhadoEm && usuario && !ehGestor(usuario.papel))
  const botaoAnalisar =
    r?.status === 'ABERTO' ? (
      <Button variante="secundario" carregando={analisar.isPending} onClick={() => analisar.mutate()}>
        Marcar em análise
      </Button>
    ) : null

  return (
    <>
      <CabecalhoPagina
        voltar={{ para: '/app/recursos', rotulo: 'Voltar para recursos' }}
        titulo={r ? `Recurso de ${r.participanteNome}` : 'Recurso'}
        descricao={r ? `${r.provaTitulo} · questão ${r.questao?.ordem ?? '?'} · aberto em ${formatarDataHora(r.criadoEm)}` : undefined}
        acoes={
          r && (
            <>
              <Link to={`/app/correcoes/${r.notaId}`} className="qz-botao qz-botao--secundario">
                <Icone nome="olho" /> Ver prova corrigida
              </Link>
              {!podeDecidir && botaoAnalisar}
              {!decidido && !r.encaminhadoEm && usuario && !ehGestor(usuario.papel) && (
                <Button variante="secundario" onClick={() => setEncaminhando(true)}>
                  Encaminhar à coordenação
                </Button>
              )}
            </>
          )
        }
      />
      {analisar.error && <AlertBanner tipo="erro">{mensagemDeErro(analisar.error)}</AlertBanner>}
      <div className="qz-lista-detalhe">
        <FilaAnalise atual={id} />
        <EstadoConsulta consulta={consulta}>
          {(r) => (
            <div className="qz-pilha">
              {r.encaminhadoEm && (
                <AlertBanner tipo="info" titulo="Encaminhado à coordenação">
                  {formatarDataHora(r.encaminhadoEm)} — {r.motivoEncaminhamento}. A decisão cabe à coordenação.
                </AlertBanner>
              )}
              {encaminhando && (
                <DialogEncaminhar
                  id={r.id}
                  aoFechar={() => setEncaminhando(false)}
                  aoEncaminhar={(novo) => {
                    setEncaminhando(false)
                    atualizar(novo)
                  }}
                />
              )}
              <Contestacao recurso={r} />
              <ContextoQuestao recurso={r} />
              {decidido ? (
                <Card>
                  <h2>Decisão do recurso</h2>
                  <div className="qz-linha qz-recursos__decidido">
                    <StatusBadge status={r.status} rotulo={ROTULO_RECURSO[r.status]} />
                    <span className="qz-suave qz-pequeno">Decidido em {formatarDataHora(r.decididoEm)}</span>
                  </div>
                  <div className="qz-recursos__rotulo">Justificativa para o aluno</div>
                  <p className="qz-pre qz-recursos__texto">{r.decisao}</p>
                  {r.efeito && (
                    <AlertBanner tipo={r.status === 'DEFERIDO' ? 'sucesso' : 'info'} titulo="Impacto na pontuação">
                      {ROTULO_EFEITO[r.efeito] ?? r.efeito}
                    </AlertBanner>
                  )}
                </Card>
              ) : podeDecidir ? (
                <FormDecisao id={r.id} aoDecidir={atualizar} extra={botaoAnalisar} />
              ) : null}
            </div>
          )}
        </EstadoConsulta>
      </div>
    </>
  )
}

/** Fila à esquerda: recursos ainda não decididos (mesma consulta da lista) + o atual. */
function FilaAnalise({ atual }: { atual?: string }) {
  const consulta = useQuery({ queryKey: ['recursos'], queryFn: () => api<Recurso[]>('/recursos') })
  const fila = (consulta.data ?? []).filter((r) => r.id === atual || r.status === 'ABERTO' || r.status === 'EM_ANALISE')
  return (
    <Card className="qz-recursos__fila-lateral">
      <h2>Fila de análise</h2>
      {consulta.isPending && <Spinner />}
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <nav aria-label="Fila de análise" className="qz-recursos__itens">
        {fila.map((r) => (
          <Link
            key={r.id}
            to={`/app/recursos/${r.id}`}
            className={`qz-recursos__item${r.id === atual ? ' qz-recursos__item--ativo' : ''}`}
            aria-current={r.id === atual ? 'page' : undefined}
          >
            <StatusBadge status={r.status} rotulo={ROTULO_RECURSO[r.status]} />
            <span className="qz-recursos__item-nome">{r.participanteNome}</span>
            <span className="qz-recursos__item-sub">
              {r.provaTitulo} · Questão {r.questaoOrdem ?? '?'}
            </span>
            <span className="qz-recursos__item-sub">{formatarDataHora(r.criadoEm)}</span>
          </Link>
        ))}
      </nav>
      {consulta.data && fila.every((r) => r.id === atual) && <p className="qz-suave qz-pequeno">Nenhum outro recurso pendente.</p>}
    </Card>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="qz-recursos__campo">
      <div className="qz-recursos__rotulo">{rotulo}</div>
      <div className="qz-recursos__valor">{children}</div>
    </div>
  )
}

function Contestacao({ recurso: r }: { recurso: RecursoDetalhe }) {
  return (
    <Card>
      <h2>Contestação do aluno</h2>
      <div className="qz-recursos__aluno">
        <strong>{r.participanteNome}</strong>
        <span className="qz-linha">
          <StatusBadge status={r.status} rotulo={ROTULO_RECURSO[r.status]} />
          {r.encaminhadoEm && <StatusBadge status="ENCAMINHADO" tom="alerta" rotulo="com a coordenação" />}
        </span>
      </div>
      <div className="qz-recursos__campos">
        <Campo rotulo="Avaliação">{r.provaTitulo}</Campo>
        <Campo rotulo="Aberto em">{formatarDataHora(r.criadoEm)}</Campo>
      </div>
      <div className="qz-recursos__rotulo">Argumentação enviada</div>
      <p className="qz-pre qz-recursos__texto">{r.justificativa}</p>
    </Card>
  )
}

function ContextoQuestao({ recurso: r }: { recurso: RecursoDetalhe }) {
  const q = r.questao
  if (!q) return null
  const marcada = (id: string) => id === q.resposta?.alternativaId || !!q.resposta?.alternativaIds?.includes(id)
  return (
    <Card>
      <h2>Contexto da questão</h2>
      <StatusBadge status="QUESTAO" tom="neutro" rotulo={`Questão ${q.ordem} · ${ROTULO_FORMATO[formatoDaQuestao(q)]} · peso ${Number(q.peso)}%`} />
      <p className="qz-pre qz-recursos__enunciado">
        <TextoRico texto={q.enunciado} />
      </p>
      <ListaMidias midias={q.midias ?? undefined} />
      {(q.formato === 'ASSOCIACAO' || q.formato === 'ORDENACAO') && (
        <RespostaEstruturada formato={q.formato} alternativas={q.alternativas} resposta={q.resposta} gabarito={q.gabarito} />
      )}
      {q.alternativas && q.formato !== 'ASSOCIACAO' && q.formato !== 'ORDENACAO' && (
        <ul className="qz-alternativas">
          {q.alternativas.map((a) => (
            <li
              key={a.id}
              className={`qz-alternativa${alternativaCorreta(q.gabarito, a.id) ? ' qz-alternativa--correta' : ''}${marcada(a.id) ? ' qz-alternativa--marcada' : ''}`}
            >
              <span className="qz-alternativa__letra">{a.id})</span> <TextoRico texto={a.texto} />
              {marcada(a.id) && <small className="qz-suave"> ← marcada pelo aluno</small>}
            </li>
          ))}
        </ul>
      )}
      {!q.alternativas && (
        <div className="qz-recursos__resposta">
          <div className="qz-recursos__rotulo">Resposta do aluno</div>
          <p className="qz-pre">{q.resposta?.texto || '—'}</p>
        </div>
      )}
      <ul className="qz-recursos__resumo">
        {descreverNumerico(q.gabarito) && <li className="qz-recursos__gabarito">Resposta esperada: {descreverNumerico(q.gabarito)}</li>}
        {q.gabarito?.respostasAceitas && (
          <li className="qz-recursos__gabarito">Respostas aceitas: {q.gabarito.respostasAceitas.join(' · ')}</li>
        )}
        <li>
          Pontuação atual nesta questão: {q.fracao != null ? `${Math.round(Number(q.fracao) * 100)}%` : 'não corrigida'}
        </li>
        <li className="qz-suave">
          Nota da prova: {formatarNota(r.notaFinal)} ({ROTULO_NOTA[r.notaStatus]})
        </li>
      </ul>
    </Card>
  )
}

function FormDecisao({ id, aoDecidir, extra }: { id: string; aoDecidir: (r: RecursoDetalhe) => void; extra?: ReactNode }) {
  const [resultado, setResultado] = useState<'INDEFERIR' | 'AJUSTE' | 'PONTUAR_TODOS' | 'REMOVER_DO_TOTAL'>('INDEFERIR')
  const [percentual, setPercentual] = useState(100)
  const [decisao, setDecisao] = useState('')
  const decidir = useMutation({
    mutationFn: () =>
      api<RecursoDetalhe>(`/recursos/${id}/decidir`, {
        method: 'POST',
        body:
          resultado === 'INDEFERIR'
            ? { deferido: false, decisao }
            : resultado === 'AJUSTE'
              ? { deferido: true, decisao, efeito: 'AJUSTE_INDIVIDUAL', percentual }
              : { deferido: true, decisao, efeito: 'ANULACAO', politica: resultado },
      }),
    onSuccess: aoDecidir,
  })
  return (
    <Card>
      <h2>Decisão do recurso</h2>
      {decidir.error && <AlertBanner tipo="erro">{mensagemDeErro(decidir.error)}</AlertBanner>}
      <div className="qz-recursos__campos">
        <SelectField
          rotulo="Resultado"
          value={resultado}
          onChange={(e) => setResultado(e.target.value as typeof resultado)}
          opcoes={[
            { valor: 'INDEFERIR', rotulo: 'Indeferir — manter a nota' },
            { valor: 'AJUSTE', rotulo: 'Deferir — ajustar a pontuação deste aluno' },
            { valor: 'PONTUAR_TODOS', rotulo: 'Deferir — anular a questão e pontuar a todos' },
            { valor: 'REMOVER_DO_TOTAL', rotulo: 'Deferir — anular a questão e removê-la do total' },
          ]}
        />
        {resultado === 'AJUSTE' && (
          <TextField
            rotulo="Nova pontuação nesta questão (%)"
            type="number"
            min={0}
            max={100}
            value={percentual}
            step={1}
            onChange={(e) => setPercentual(Math.max(0, Math.min(100, Math.round(Number(e.target.value)))))} // a API só aceita inteiro
          />
        )}
      </div>
      <TextArea rotulo="Justificativa da decisão (enviada ao aluno)" required value={decisao} onChange={(e) => setDecisao(e.target.value)} />
      {(resultado === 'PONTUAR_TODOS' || resultado === 'REMOVER_DO_TOTAL') && (
        <AlertBanner tipo="alerta" titulo="Confirme antes de concluir">
          A anulação vale para <strong>todos</strong> os participantes desta prova: as notas serão recalculadas e cada aluno afetado
          será notificado.
        </AlertBanner>
      )}
      <div className="qz-recursos__rodape">
        <div>{extra}</div>
        <Button carregando={decidir.isPending} disabled={!decisao.trim()} onClick={() => decidir.mutate()}>
          <Icone nome="check" /> Registrar decisão
        </Button>
      </div>
    </Card>
  )
}

/** Encaminha à coordenação (lote 8): a partir daí só a gestão decide. */
function DialogEncaminhar({ id, aoFechar, aoEncaminhar }: { id: string; aoFechar: () => void; aoEncaminhar: (r: RecursoDetalhe) => void }) {
  const [motivo, setMotivo] = useState('')
  const enviar = useMutation({
    mutationFn: () => api<RecursoDetalhe>(`/recursos/${id}/encaminhar`, { method: 'POST', body: { motivo } }),
    onSuccess: aoEncaminhar,
  })
  return (
    <Dialog
      aberto
      titulo="Encaminhar à coordenação"
      aoFechar={aoFechar}
      acoes={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button disabled={!motivo.trim()} carregando={enviar.isPending} onClick={() => enviar.mutate()}>
            Encaminhar
          </Button>
        </>
      }
    >
      {enviar.error && <AlertBanner tipo="erro">{mensagemDeErro(enviar.error)}</AlertBanner>}
      <p>A coordenação é avisada e passa a ser a responsável pela decisão.</p>
      <TextArea rotulo="Motivo (ex.: conflito de interesse, caso sem precedente)" required value={motivo} onChange={(e) => setMotivo(e.target.value)} />
    </Dialog>
  )
}
