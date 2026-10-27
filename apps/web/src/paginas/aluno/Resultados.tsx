import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type MouseEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { api, mensagemDeErro } from '../../api/cliente'
import {
  ROTULO_APROVACAO,
  ROTULO_NOTA,
  ROTULO_RECURSO,
  type Recurso,
  type ResultadoAluno,
  type ResultadoAlunoResumo, alternativaCorreta, descreverNumerico } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, DataTable, Dialog, Icone, Spinner, StatusBadge, Tabs, TextArea, type TomStatus } from '../../design-system'
import { formatarDataHora, formatarDuracao, formatarNota, resumir } from '../../util/formato'
import { ListaMidias } from '../../componentes/Midias'
import { TextoRico } from '../../componentes/TextoRico'
import { RespostaEstruturada } from '../../componentes/QuestaoEstruturada'
import './aluno.css'

type QuestaoResultado = ResultadoAluno['questoes'][number]

/** Situação da questão na correção: tom do selo, rótulo curto (navegação) e completo (cartão). */
function situacaoDa(q: QuestaoResultado): { tom: TomStatus; curto: string; longo: string } {
  if (q.anulacao) return { tom: 'neutro', curto: 'Anulada', longo: 'Anulada' }
  if (q.fracao == null) return { tom: 'alerta', curto: 'Pendente', longo: 'Aguardando correção' }
  const f = Number(q.fracao)
  if (f >= 1) return { tom: 'sucesso', curto: 'Correta', longo: 'Correta' }
  if (f > 0) return { tom: 'alerta', curto: 'Parcial', longo: `Parcialmente correta (${Math.round(f * 100)}%)` }
  return { tom: 'erro', curto: 'Incorreta', longo: 'Incorreta' }
}

/** Resposta do aluno em uma linha ("B) texto"), para o cartão da questão contestada. */
function descreverResposta(q: QuestaoResultado): string {
  if (!q.resposta) return '—'
  if (q.alternativas && (q.resposta.alternativaId || q.resposta.alternativaIds?.length)) {
    const ids = q.resposta.alternativaId ? [q.resposta.alternativaId] : (q.resposta.alternativaIds ?? [])
    return ids.map((id) => `${id}) ${resumir(q.alternativas?.find((a) => a.id === id)?.texto ?? '', 60)}`).join(' · ')
  }
  return q.resposta.texto?.trim() ? resumir(q.resposta.texto.trim(), 120) : '—'
}

export function ResultadosAluno() {
  const consulta = useQuery({ queryKey: ['aluno', 'resultados'], queryFn: () => api<ResultadoAlunoResumo[]>('/aluno/resultados') })
  return (
    <>
      <CabecalhoPagina titulo="Meus resultados" descricao="Notas publicadas, correção das suas respostas e pedidos de revisão." />
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <DataTable
        rotulo="Resultados"
        carregando={consulta.isPending}
        linhas={consulta.data ?? []}
        chaveLinha={(r) => r.id}
        vazio="Você ainda não enviou nenhuma prova."
        rotuloItens="resultados"
        colunas={[
          { chave: 'p', titulo: 'Prova', render: (r) => <Link to={`/aluno/resultados/${r.id}`}>{r.provaTitulo}</Link> },
          { chave: 't', titulo: 'Tentativa', render: (r) => r.tentativaNumero },
          { chave: 'e', titulo: 'Enviada em', render: (r) => formatarDataHora(r.fimEm) },
          { chave: 's', titulo: 'Situação', render: (r) => <StatusBadge status={r.status} rotulo={ROTULO_NOTA[r.status]} /> },
          { chave: 'n', titulo: 'Nota', render: (r) => (r.status === 'CONSOLIDADA' ? <strong>{formatarNota(r.notaFinal)}</strong> : '—') },
          { chave: 'a', titulo: 'Resultado', render: (r) => (r.statusAprovacao ? <StatusBadge status={r.statusAprovacao} rotulo={ROTULO_APROVACAO[r.statusAprovacao]} /> : '—') },
        ]}
      />
    </>
  )
}

type AbaResultado = 'revisao' | 'feedback' | 'dados'

export function ResultadoDetalheAluno() {
  const { id } = useParams()
  const consulta = useQuery({ queryKey: ['aluno', 'resultado', id], queryFn: () => api<ResultadoAluno>(`/aluno/resultados/${id}`) })
  const recursos = useQuery({ queryKey: ['aluno', 'recursos'], queryFn: () => api<Recurso[]>('/aluno/recursos') })
  const [contestando, setContestando] = useState<{ versaoQuestaoId: string; ordem: number } | null>(null)
  const [aba, setAba] = useState<AbaResultado>('revisao')
  const recursoDe = (vq: string) => recursos.data?.find((r) => r.notaId === id && r.versaoQuestaoId === vq)
  const recursosDaNota = recursos.data?.filter((r) => r.notaId === id) ?? []

  function irParaQuestao(e: MouseEvent, ordem: number) {
    e.preventDefault()
    setAba('revisao')
    requestAnimationFrame(() => document.getElementById(`questao-${ordem}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <EstadoConsulta consulta={consulta}>
      {(r) => {
        const situacoes = r.questoes.map(situacaoDa)
        const conta = (curto: string) => situacoes.filter((s) => s.curto === curto).length
        const fechadas = r.questoes.filter((q) => q.natureza === 'FECHADA').length
        const abertas = r.questoes.length - fechadas
        const comFeedback = r.questoes.filter((q) => q.feedback)
        const minutos = (new Date(r.fimEm).getTime() - new Date(r.inicioEm).getTime()) / 60_000
        const notaMinima = r.criterioAprovacao?.tipo === 'NOTA_MINIMA' ? r.criterioAprovacao.valor : undefined
        const questoesVisiveis = aba === 'feedback' ? r.questoes.filter((q) => q.feedback) : r.questoes
        return (
          <>
            <CabecalhoPagina
              voltar={{ para: '/aluno/resultados', rotulo: 'Voltar para resultados' }}
              titulo={r.provaTitulo}
              descricao={`Enviada em ${formatarDataHora(r.fimEm)} · Tentativa ${r.tentativaNumero}`}
              acoes={<StatusBadge status={r.status} rotulo={ROTULO_NOTA[r.status]} />}
            />

            <div className="qz-al-resultado__topo">
              <Card className="qz-cartao--destaque">
                <h2 className="qz-al-titulo-cartao">Seu resultado</h2>
                {r.status === 'CONSOLIDADA' ? (
                  <p className="qz-al-nota">
                    <strong>{formatarNota(r.notaFinal)}</strong>
                    <span>/ 10</span>
                  </p>
                ) : (
                  <p className="qz-al-nota qz-al-nota--pendente">
                    <strong>{r.notaProvisoria != null ? formatarNota(r.notaProvisoria) : '—'}</strong>
                    <span>{r.notaProvisoria != null ? 'provisória' : '/ 10'}</span>
                  </p>
                )}
                {r.statusAprovacao && (
                  <div className="qz-al-resultado__selo">
                    <StatusBadge status={r.statusAprovacao} rotulo={ROTULO_APROVACAO[r.statusAprovacao]} />
                  </div>
                )}
                <dl className="qz-al-linhas">
                  {notaMinima != null && (
                    <div>
                      <dt>Nota mínima</dt>
                      <dd>{formatarNota(notaMinima)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Tempo utilizado</dt>
                    <dd>{formatarDuracao(minutos)}</dd>
                  </div>
                </dl>
                {r.status !== 'CONSOLIDADA' && (
                  <p className="qz-pequeno" style={{ marginBottom: 0 }}>
                    Há questões dissertativas aguardando correção. Você será notificado quando a nota for publicada.
                  </p>
                )}
              </Card>

              <Card>
                <h2 className="qz-al-titulo-cartao">Resumo da avaliação</h2>
                <div className="qz-al-contagens">
                  <div>
                    <strong className="qz-al-tom--sucesso">{String(conta('Correta')).padStart(2, '0')}</strong>
                    {conta('Correta') === 1 ? 'Correta' : 'Corretas'}
                  </div>
                  <div>
                    <strong className="qz-al-tom--alerta">{String(conta('Parcial')).padStart(2, '0')}</strong>
                    {conta('Parcial') === 1 ? 'Parcialmente correta' : 'Parcialmente corretas'}
                  </div>
                  <div>
                    <strong className="qz-al-tom--erro">{String(conta('Incorreta')).padStart(2, '0')}</strong>
                    {conta('Incorreta') === 1 ? 'Incorreta' : 'Incorretas'}
                  </div>
                  {conta('Pendente') > 0 && (
                    <div>
                      <strong className="qz-al-tom--neutro">{String(conta('Pendente')).padStart(2, '0')}</strong>
                      Aguardando correção
                    </div>
                  )}
                  {conta('Anulada') > 0 && (
                    <div>
                      <strong className="qz-al-tom--neutro">{String(conta('Anulada')).padStart(2, '0')}</strong>
                      {conta('Anulada') === 1 ? 'Anulada' : 'Anuladas'}
                    </div>
                  )}
                </div>
                <p className="qz-al-resumo__notas">
                  {fechadas} {fechadas === 1 ? 'questão objetiva' : 'questões objetivas'} e {abertas}{' '}
                  {abertas === 1 ? 'discursiva' : 'discursivas'} · Nota de 0 a 10
                </p>
                {r.gabaritoDisponivelEm && (
                  <p className="qz-al-resumo__notas">O gabarito fica disponível depois de {formatarDataHora(r.gabaritoDisponivelEm)}.</p>
                )}
                {r.notasSecao && r.notasSecao.length > 0 && (
                  <div className="qz-pilha" style={{ gap: 4, marginTop: 8 }}>
                    <strong className="qz-pequeno">Nota por seção</strong>
                    {r.notasSecao.map((sec) => (
                      <span key={sec.id} className="qz-linha qz-pequeno">
                        {sec.titulo}: <strong>{formatarNota(sec.nota)}</strong>
                        {sec.notaMinima != null && (
                          <StatusBadge
                            status="SECAO"
                            tom={sec.atingiu ? 'sucesso' : sec.atingiu === false ? 'erro' : 'neutro'}
                            rotulo={`mínimo ${formatarNota(sec.notaMinima)}`}
                          />
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Tabs
              rotulo="Seções do resultado"
              ativa={aba}
              aoMudar={setAba}
              abas={[
                { valor: 'revisao', rotulo: 'Revisão de respostas' },
                { valor: 'feedback', rotulo: 'Feedback do professor', contador: comFeedback.length },
                { valor: 'dados', rotulo: 'Dados da tentativa' },
              ]}
            />

            <div className="qz-duas-colunas">
              <div className="qz-pilha">
                {aba === 'dados' ? (
                  <Card>
                    <dl className="qz-al-linhas">
                      <div>
                        <dt>Prova</dt>
                        <dd>{r.provaTitulo}</dd>
                      </div>
                      <div>
                        <dt>Tentativa</dt>
                        <dd>{r.tentativaNumero}</dd>
                      </div>
                      <div>
                        <dt>Início</dt>
                        <dd>{formatarDataHora(r.inicioEm)}</dd>
                      </div>
                      <div>
                        <dt>Envio</dt>
                        <dd>{formatarDataHora(r.fimEm)}</dd>
                      </div>
                      <div>
                        <dt>Tempo utilizado</dt>
                        <dd>{formatarDuracao(minutos)}</dd>
                      </div>
                      <div>
                        <dt>Situação da correção</dt>
                        <dd>{ROTULO_NOTA[r.status]}</dd>
                      </div>
                      <div>
                        <dt>Critério de aprovação</dt>
                        <dd>{notaMinima != null ? `Nota mínima ${formatarNota(notaMinima)}` : 'Sem nota mínima'}</dd>
                      </div>
                      {r.prazoRecursoAte && (
                        <div>
                          <dt>Prazo para pedir revisão</dt>
                          <dd>{formatarDataHora(r.prazoRecursoAte)}</dd>
                        </div>
                      )}
                    </dl>
                  </Card>
                ) : questoesVisiveis.length === 0 ? (
                  <Card>
                    <p className="qz-suave" style={{ margin: 0 }}>
                      Nenhuma questão recebeu feedback do professor.
                    </p>
                  </Card>
                ) : (
                  questoesVisiveis.map((q) => {
                    const recurso = recursoDe(q.versaoQuestaoId)
                    const sit = situacaoDa(q)
                    return (
                      <Card key={q.versaoQuestaoId} id={`questao-${q.ordem}`} className="qz-al-revisao-questao">
                        <div className="qz-al-questao__topo">
                          <StatusBadge status="SITUACAO" tom={sit.tom} rotulo={`Questão ${q.ordem} · ${sit.longo}`} />
                          <span className={`qz-pequeno qz-al-tom--${sit.tom}`}>Peso {Number(q.peso)}%</span>
                        </div>
                        <p className="qz-pre qz-al-enunciado">
                          <TextoRico texto={q.enunciado} />
                        </p>
                        <ListaMidias midias={q.midias ?? undefined} />
                        {q.formato === 'ASSOCIACAO' || q.formato === 'ORDENACAO' ? (
                          <RespostaEstruturada formato={q.formato} alternativas={q.alternativas} resposta={q.resposta} gabarito={r.gabaritoVisivel ? q.gabarito : null} />
                        ) : q.alternativas ? (
                          <ul className="qz-alternativas">
                            {q.alternativas.map((a) => {
                              const correta = r.gabaritoVisivel && alternativaCorreta(q.gabarito, a.id)
                              const marcada = a.id === q.resposta?.alternativaId || !!q.resposta?.alternativaIds?.includes(a.id)
                              return (
                                <li
                                  key={a.id}
                                  className={`qz-alternativa${marcada ? ' qz-alternativa--marcada' : ''}${correta ? ' qz-alternativa--correta' : ''}`}
                                >
                                  <span className="qz-alternativa__letra">{a.id}</span>
                                  <span className="qz-alternativa__texto">
                                    <TextoRico texto={a.texto} />
                                  </span>
                                  {marcada && <StatusBadge status="MARCADA" tom="info" rotulo="sua resposta" />}
                                  {correta && <StatusBadge status="CORRETA" tom="sucesso" rotulo="resposta correta" />}
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <div className="qz-resposta-aberta">
                            <div className="qz-suave qz-pequeno">Sua resposta</div>
                            <p className="qz-pre">{q.resposta?.texto?.trim() || '—'}</p>
                          </div>
                        )}
                        {r.gabaritoVisivel && descreverNumerico(q.gabarito) && (
                          <p className="qz-gabarito">Resposta esperada: {descreverNumerico(q.gabarito)}</p>
                        )}
                        {r.gabaritoVisivel && q.gabarito?.respostasAceitas && (
                          <p className="qz-gabarito">Respostas aceitas: {q.gabarito.respostasAceitas.join(' · ')}</p>
                        )}
                        {r.gabaritoVisivel && q.rubrica?.criterios && (
                          <p className="qz-gabarito qz-pre">Critérios de correção: {q.rubrica.criterios}</p>
                        )}
                        {q.feedback && (
                          <AlertBanner tipo="info" titulo="Feedback do professor">
                            {q.feedback}
                          </AlertBanner>
                        )}
                        {q.anulacao && <p className="qz-suave qz-pequeno">Questão anulada: {q.anulacao.justificativa}</p>}
                        <div className="qz-al-revisao-questao__acoes">
                          {recurso ? (
                            <span className="qz-pequeno">
                              Recurso: <StatusBadge status={recurso.status} rotulo={ROTULO_RECURSO[recurso.status]} />
                              {recurso.decisao && <span className="qz-suave"> — {resumir(recurso.decisao, 120)}</span>}
                            </span>
                          ) : (
                            !q.anulacao &&
                            !r.recursoEncerrado && (
                              <Button variante="secundario" onClick={() => setContestando({ versaoQuestaoId: q.versaoQuestaoId, ordem: q.ordem })}>
                                <Icone nome="mensagem" />
                                Contestar esta questão
                              </Button>
                            )
                          )}
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>

              <div className="qz-al-lateral">
                <Card>
                  <h2 className="qz-al-titulo-cartao">Navegar pela revisão</h2>
                  <ul className="qz-al-indice">
                    {r.questoes.map((q, i) => (
                      <li key={q.versaoQuestaoId}>
                        <a href={`#questao-${q.ordem}`} onClick={(e) => irParaQuestao(e, q.ordem)}>
                          Questão {q.ordem}
                          <StatusBadge status="SITUACAO" tom={situacoes[i]!.tom} rotulo={situacoes[i]!.curto} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
                {(recursosDaNota.length > 0 || r.prazoRecursoAte) && (
                  <Card>
                    <h2 className="qz-al-titulo-cartao">Contestações</h2>
                    {recursosDaNota.map((rec) => (
                      <p key={rec.id} className="qz-pequeno">
                        <strong>Questão {rec.questaoOrdem ?? '—'}</strong>
                        <br />
                        <span className="qz-suave">Pedido enviado em {formatarDataHora(rec.criadoEm)}</span>
                      </p>
                    ))}
                    {r.prazoRecursoAte && (
                      <p className="qz-suave qz-pequeno">
                        {r.recursoEncerrado
                          ? `O prazo para pedir revisão terminou em ${formatarDataHora(r.prazoRecursoAte)}.`
                          : `Se algo não ficou claro no enunciado ou na correção, você pode pedir uma revisão até ${formatarDataHora(r.prazoRecursoAte)}.`}
                      </p>
                    )}
                    {recursosDaNota.length > 0 && (
                      <Link to={`/aluno/recursos?id=${recursosDaNota[0]!.id}`} className="qz-botao qz-botao--secundario qz-botao--largo">
                        <Icone nome="mensagem" />
                        {recursosDaNota.length === 1 ? 'Ver contestação' : 'Ver contestações'}
                      </Link>
                    )}
                  </Card>
                )}
              </div>
            </div>
            {contestando && <DialogRecurso notaId={r.id} {...contestando} aoFechar={() => setContestando(null)} />}
          </>
        )
      }}
    </EstadoConsulta>
  )
}

function DialogRecurso({ notaId, versaoQuestaoId, ordem, aoFechar }: { notaId: string; versaoQuestaoId: string; ordem: number; aoFechar: () => void }) {
  const cliente = useQueryClient()
  const [justificativa, setJustificativa] = useState('')
  const abrir = useMutation({
    mutationFn: () => api('/aluno/recursos', { method: 'POST', body: { notaId, versaoQuestaoId, justificativa } }),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['aluno', 'recursos'] })
      aoFechar()
    },
  })
  return (
    <Dialog
      aberto
      titulo={`Contestar a questão ${ordem}`}
      aoFechar={aoFechar}
      acoes={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button carregando={abrir.isPending} disabled={!justificativa.trim()} onClick={() => abrir.mutate()}>
            Enviar recurso
          </Button>
        </>
      }
    >
      {abrir.error && <AlertBanner tipo="erro">{mensagemDeErro(abrir.error)}</AlertBanner>}
      <TextArea
        rotulo="Explique por que a correção deve ser revista"
        required
        rows={5}
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
      />
      <p className="qz-suave qz-pequeno" style={{ margin: 0 }}>
        Descreva o problema e como ele afetou sua resposta. Depois de enviado, o pedido não pode ser editado.
      </p>
    </Dialog>
  )
}

/** Etapas do pedido: recebido → em análise → decisão. */
function etapasDo(rec: Recurso): { rotulo: string; detalhe?: string; estado: 'feita' | 'atual' | 'pendente' }[] {
  const decidido = rec.status === 'DEFERIDO' || rec.status === 'INDEFERIDO'
  return [
    { rotulo: 'Pedido recebido', detalhe: formatarDataHora(rec.criadoEm), estado: 'feita' },
    {
      rotulo: rec.encaminhadoEm ? 'Em análise pela coordenação' : 'Em análise pelo professor',
      detalhe: rec.encaminhadoEm ? `Encaminhado à coordenação em ${formatarDataHora(rec.encaminhadoEm)}` : undefined,
      estado: decidido ? 'feita' : rec.status === 'ABERTO' && !rec.encaminhadoEm ? 'pendente' : 'atual',
    },
    {
      rotulo: decidido ? `Decisão: ${ROTULO_RECURSO[rec.status].toLowerCase()}` : 'Decisão e justificativa',
      detalhe: rec.decididoEm ? formatarDataHora(rec.decididoEm) : undefined,
      estado: decidido ? 'feita' : 'pendente',
    },
  ]
}

export function RecursosAluno() {
  const consulta = useQuery({ queryKey: ['aluno', 'recursos'], queryFn: () => api<Recurso[]>('/aluno/recursos') })
  const [parametros, setParametros] = useSearchParams()
  const lista = consulta.data ?? []
  const selecionado = lista.find((r) => r.id === parametros.get('id')) ?? lista[0]
  const resultado = useQuery({
    queryKey: ['aluno', 'resultado', selecionado?.notaId],
    queryFn: () => api<ResultadoAluno>(`/aluno/resultados/${selecionado!.notaId}`),
    enabled: !!selecionado,
  })
  const questao = resultado.data?.questoes.find((q) => q.versaoQuestaoId === selecionado?.versaoQuestaoId)
  const situacao = questao ? situacaoDa(questao) : null
  const gabarito =
    resultado.data?.gabaritoVisivel && questao
      ? [
          ...(questao.alternativas ?? [])
            .filter((a) => alternativaCorreta(questao.gabarito, a.id))
            .map((a) => `${a.id}) ${resumir(a.texto, 60)}`),
          ...(descreverNumerico(questao.gabarito) ? [descreverNumerico(questao.gabarito)!] : []),
          ...(questao.gabarito?.respostasAceitas ?? []),
        ]
      : []

  return (
    <>
      <CabecalhoPagina
        titulo="Contestações"
        descricao="Acompanhe seus pedidos de revisão. Para contestar uma questão, abra o resultado da prova e clique em “Contestar esta questão”."
      />
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      {consulta.isPending && <Spinner />}
      {consulta.data && lista.length === 0 && (
        <Card>
          <p className="qz-suave" style={{ margin: 0 }}>
            Você não abriu nenhum recurso.
          </p>
        </Card>
      )}
      {selecionado && (
        <div className="qz-duas-colunas">
          <div className="qz-pilha">
            <Card>
              <h2 className="qz-al-titulo-cartao">Questão contestada</h2>
              <div className="qz-al-contestada__topo">
                <strong>
                  {selecionado.provaTitulo} · Questão {selecionado.questaoOrdem ?? '—'}
                </strong>
                {situacao && <StatusBadge status="SITUACAO" tom={situacao.tom} rotulo={situacao.longo} />}
              </div>
              <p className="qz-pre" style={{ fontWeight: 600 }}>
                <TextoRico texto={questao?.enunciado ?? selecionado.questaoEnunciado} />
              </p>
              <ListaMidias midias={questao?.midias ?? undefined} />
              {questao && (
                <div className="qz-al-contestada__respostas">
                  <span>Sua resposta: {descreverResposta(questao)}</span>
                  {gabarito.length > 0 && <span className="qz-al-tom--sucesso">Gabarito publicado: {gabarito.join(' · ')}</span>}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="qz-al-titulo-cartao">Seu pedido de revisão</h2>
              <span className="qz-al-rotulo">Argumentação</span>
              <p className="qz-pre qz-al-texto-enviado">{selecionado.justificativa}</p>
              {selecionado.decisao && (
                <>
                  <span className="qz-al-rotulo">Decisão do professor</span>
                  <p className="qz-pre qz-al-texto-enviado">{selecionado.decisao}</p>
                </>
              )}
              <p className="qz-suave qz-pequeno" style={{ margin: 0 }}>
                Pedido enviado em {formatarDataHora(selecionado.criadoEm)} · não pode ser editado
              </p>
            </Card>
            {lista.length > 1 && (
              <Card>
                <h2 className="qz-al-titulo-cartao">Todos os seus pedidos</h2>
                <ul className="qz-al-pedidos">
                  {lista.map((rec) => (
                    <li key={rec.id}>
                      <button type="button" aria-pressed={rec.id === selecionado.id} onClick={() => setParametros({ id: rec.id }, { replace: true })}>
                        <span>
                          {rec.provaTitulo} · Questão {rec.questaoOrdem ?? '—'}
                          <small>Enviado em {formatarDataHora(rec.criadoEm)}</small>
                        </span>
                        <StatusBadge status={rec.status} rotulo={ROTULO_RECURSO[rec.status]} />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

          </div>

          <div className="qz-al-lateral">
            <Card className="qz-cartao--destaque">
              <h2 className="qz-al-titulo-cartao">Acompanhe seu pedido</h2>
              <StatusBadge status={selecionado.status} rotulo={ROTULO_RECURSO[selecionado.status]} />
              <p className="qz-al-destaque-codigo">Questão {selecionado.questaoOrdem ?? '—'}</p>
              <span className="qz-pequeno qz-al-tom--info">Enviado em {formatarDataHora(selecionado.criadoEm)}</span>
              <ol className="qz-al-etapas">
                {etapasDo(selecionado).map((e) => (
                  <li key={e.rotulo} className={`qz-al-etapa--${e.estado}`}>
                    <span className="qz-al-etapas__marca" aria-hidden>
                      {e.estado === 'feita' && <Icone nome="check" tamanho={14} />}
                    </span>
                    <span>
                      {e.rotulo}
                      <span className="qz-sr">{e.estado === 'feita' ? ' (concluída)' : e.estado === 'atual' ? ' (etapa atual)' : ' (pendente)'}</span>
                      {e.detalhe && <small>{e.detalhe}</small>}
                    </span>
                  </li>
                ))}
              </ol>
              {selecionado.status !== 'DEFERIDO' && selecionado.status !== 'INDEFERIDO' && (
                <p className="qz-pequeno">
                  Você será avisado quando houver uma decisão.
                  {resultado.data?.status === 'CONSOLIDADA' && ` Sua nota atual continua sendo ${formatarNota(resultado.data.notaFinal)}.`}
                </p>
              )}
              <Link to={`/aluno/resultados/${selecionado.notaId}`} className="qz-botao qz-botao--secundario qz-botao--largo">
                Voltar para o resultado
              </Link>
            </Card>
            {resultado.data?.prazoRecursoAte && (
              <Card>
                <h2 className="qz-al-titulo-cartao">Prazo de contestação</h2>
                <strong>Até {formatarDataHora(resultado.data.prazoRecursoAte)}</strong>
                <p className="qz-suave qz-pequeno" style={{ marginBottom: 0 }}>
                  {resultado.data.recursoEncerrado ? 'O prazo desta prova já terminou. ' : ''}
                  Cada questão permite um pedido por aluno.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  )
}
