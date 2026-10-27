import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, ErroApi, mensagemDeErro } from '../../../api/cliente'
import {
  formatoDaQuestao,
  ROTULO_DIFICULDADE,
  ROTULO_FORMATO,
  ROTULO_STATUS_QUESTAO,
  type Dificuldade,
  type QuestaoDetalhe,
  type VersaoQuestao, alternativaCorreta, descreverNumerico } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { ListaMidias } from '../../../componentes/Midias'
import { AlertBanner, Button, Card, Dialog, Icone, StatusBadge, TextArea, type TomStatus } from '../../../design-system'
import { formatarDataHora, resumir } from '../../../util/formato'
import { TextoRico } from '../../../componentes/TextoRico'
import { RespostaEstruturada } from '../../../componentes/QuestaoEstruturada'
import './questoes.css'

const TOM_DIFICULDADE: Record<Dificuldade, TomStatus> = { FACIL: 'sucesso', MEDIO: 'alerta', DIFICIL: 'erro' }

export function ConteudoVersao({
  versao,
}: {
  versao: Pick<VersaoQuestao, 'enunciado' | 'alternativas' | 'gabarito' | 'rubrica'> & Partial<Pick<VersaoQuestao, 'midias'>>
}) {
  return (
    <>
      <p className="qz-pre"><TextoRico texto={versao.enunciado} /></p>
      <ListaMidias midias={versao.midias} />
      {(versao.gabarito?.pares || versao.gabarito?.ordem) && (
        <RespostaEstruturada formato={versao.gabarito.pares ? 'ASSOCIACAO' : 'ORDENACAO'} alternativas={versao.alternativas} gabarito={versao.gabarito} />
      )}
      {versao.alternativas && !versao.gabarito?.pares && !versao.gabarito?.ordem && (
        <ul className="qz-alternativas">
          {versao.alternativas.map((a) => (
            <li key={a.id} className={`qz-alternativa${alternativaCorreta(versao.gabarito, a.id) ? ' qz-alternativa--correta' : ''}`}>
              <span className="qz-alternativa__letra">{a.id})</span>
              <span><TextoRico texto={a.texto} /></span>
              {alternativaCorreta(versao.gabarito, a.id) && <StatusBadge status="CORRETA" tom="sucesso" rotulo="correta" />}
            </li>
          ))}
        </ul>
      )}
      {descreverNumerico(versao.gabarito) && (
        <div className="qz-gabarito">
          <strong className="qz-pequeno">Resposta esperada</strong>
          <p>{descreverNumerico(versao.gabarito)}</p>
        </div>
      )}
      {versao.gabarito?.respostasAceitas && (
        <div className="qz-gabarito">
          <strong className="qz-pequeno">Respostas aceitas</strong>
          <p>{versao.gabarito.respostasAceitas.join(' · ')}</p>
        </div>
      )}
      {versao.rubrica?.itens?.length ? (
        <div style={{ marginTop: 12 }}>
          <strong className="qz-pequeno">Critérios de correção</strong>
          <ul>
            {versao.rubrica.itens.map((i, k) => (
              <li key={k}>
                {i.descricao} — <strong>{i.pontos} pts</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {versao.rubrica && (
        <div style={{ marginTop: 12 }}>
          <strong className="qz-pequeno">Rubrica</strong>
          <p className="qz-pre qz-suave">{versao.rubrica.criterios || '—'}</p>
        </div>
      )}
    </>
  )
}

export function DetalheQuestao() {
  const { id } = useParams()
  const cliente = useQueryClient()
  const consulta = useQuery({ queryKey: ['questao', id], queryFn: () => api<QuestaoDetalhe>(`/questoes/${id}`) })
  const [rejeitando, setRejeitando] = useState<'questao' | 'versao' | false>(false)
  const [comentario, setComentario] = useState('')
  const [arquivando, setArquivando] = useState(false)
  const [similares, setSimilares] = useState<{ id: string; enunciado: string; similaridade: number }[] | null>(null)

  const acao = useMutation({
    mutationFn: ({ caminho, corpo }: { caminho: string; corpo?: unknown }) =>
      api(`/questoes/${id}/${caminho}`, { method: 'POST', body: corpo ?? {} }),
    onSuccess: () => {
      setRejeitando(false)
      setArquivando(false)
      setComentario('')
      setSimilares(null)
      void cliente.invalidateQueries({ queryKey: ['questao', id] })
      void cliente.invalidateQueries({ queryKey: ['questoes'] })
    },
    onError: (erro) => {
      if (erro instanceof ErroApi && erro.codigo === 'POSSIVEL_DUPLICIDADE') {
        setSimilares((erro.detalhes as { similares: { id: string; enunciado: string; similaridade: number }[] }).similares)
      }
    },
  })

  return (
    <EstadoConsulta consulta={consulta}>
      {(q) => (
        <>
          <CabecalhoPagina
            voltar={{ para: '/app/questoes', rotulo: 'Voltar para o banco de questões' }}
            sobretitulo={
              <span className="qz-qst-badges">
                <StatusBadge status={q.statusAtual} rotulo={ROTULO_STATUS_QUESTAO[q.statusAtual]} />
                {q.altoRisco && <StatusBadge status="ALTO_RISCO" tom="neutro" rotulo="alto risco" />}
              </span>
            }
            titulo="Questão"
            descricao={`${q.disciplina}${q.topico ? ` · ${q.topico}` : ''} · autoria de ${q.autorNome}`}
            acoes={
              <>
                {q.podeEditar && (
                  <Link to={`/app/questoes/${q.id}/editar`} className="qz-botao qz-botao--secundario">
                    <Icone nome="lapis" /> Editar
                  </Link>
                )}
                {q.statusAtual === 'RASCUNHO' && q.podeEditar && (
                  <Button carregando={acao.isPending} onClick={() => acao.mutate({ caminho: 'enviar-revisao' })}>
                    Enviar para revisão
                  </Button>
                )}
                {q.podeRevisar && (
                  <>
                    <Button carregando={acao.isPending} onClick={() => acao.mutate({ caminho: 'aprovar' })}>
                      Aprovar e publicar
                    </Button>
                    <Button variante="secundario" onClick={() => (acao.reset(), setRejeitando('questao'))}>
                      Devolver para ajustes
                    </Button>
                  </>
                )}
                {q.podeEditar && q.statusAtual !== 'ARQUIVADA' && q.statusAtual !== 'EM_REVISAO' && (
                  <Button variante="fantasma" onClick={() => (acao.reset(), setArquivando(true))}>
                    Arquivar
                  </Button>
                )}
              </>
            }
          />
          {acao.error && !similares && !rejeitando && !arquivando && <AlertBanner tipo="erro">{mensagemDeErro(acao.error)}</AlertBanner>}
          {q.statusAtual === 'RASCUNHO' && q.comentarioRevisao && (
            <AlertBanner tipo="alerta" titulo={`Devolvida por ${q.revisadoPorNome ?? 'revisor'}`}>
              {q.comentarioRevisao}
            </AlertBanner>
          )}
          {q.statusAtual === 'EM_REVISAO' && !q.podeRevisar && (
            <AlertBanner tipo="info">Aguardando revisão de outro professor (dupla checagem).</AlertBanner>
          )}
          {q.versaoPendenteId && (
            <AlertBanner tipo="alerta" titulo="Nova versão aguardando aprovação">
              <p>
                Esta questão é de alto risco: a versão mais recente só passa a valer depois de aprovada por outra
                pessoa. As provas continuam usando a versão vigente.
              </p>
              {q.podeAprovarVersao && (
                <div className="qz-linha">
                  <Button carregando={acao.isPending} onClick={() => acao.mutate({ caminho: `versoes/${q.versaoPendenteId}/aprovar` })}>
                    Aprovar nova versão
                  </Button>
                  <Button variante="secundario" onClick={() => (acao.reset(), setRejeitando('versao'))}>
                    Recusar nova versão
                  </Button>
                </div>
              )}
            </AlertBanner>
          )}
          {q.statusAtual === 'PUBLICADA' && !q.versaoPendenteId && q.comentarioRevisao && (
            <AlertBanner tipo="alerta" titulo={`Última alteração recusada por ${q.revisadoPorNome ?? 'revisor'}`}>
              {q.comentarioRevisao}
            </AlertBanner>
          )}

          <div className="qz-duas-colunas">
            <div className="qz-qst-principal">
              {q.versoes.map((v) => (
                <Card key={v.id} className="qz-qst-cartao">
                  <div className="qz-qst-versao__topo">
                    <h2>
                      Versão {v.numeroVersao}
                      {v.pendente && <StatusBadge status="PENDENTE" tom="alerta" rotulo="aguardando aprovação" />}
                      {v.id === q.versoes.find((x) => !x.pendente)?.id && <StatusBadge status="VIGENTE" tom="info" rotulo="vigente" />}
                    </h2>
                    <span className="qz-suave qz-pequeno">
                      {formatarDataHora(v.criadoEm)} · {v.criadoPorNome}
                    </span>
                  </div>
                  <div>
                    <ConteudoVersao versao={v} />
                  </div>
                </Card>
              ))}
            </div>
            <aside className="qz-qst-lateral">
              <Card className="qz-qst-cartao">
                <h2>Metadados</h2>
                <dl className="qz-qst-meta">
                  <div>
                    <dt>Formato</dt>
                    <dd>{ROTULO_FORMATO[formatoDaQuestao(q)]}</dd>
                  </div>
                  <div>
                    <dt>Disciplina</dt>
                    <dd>{q.disciplina}</dd>
                  </div>
                  {q.topico && (
                    <div>
                      <dt>Tópico</dt>
                      <dd>{q.topico}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Dificuldade</dt>
                    <dd>
                      <StatusBadge status={q.dificuldade} tom={TOM_DIFICULDADE[q.dificuldade]} rotulo={ROTULO_DIFICULDADE[q.dificuldade]} />
                    </dd>
                  </div>
                  <div>
                    <dt>Alto risco / certificação</dt>
                    <dd>{q.altoRisco ? 'Sim' : 'Não'}</dd>
                  </div>
                  <div>
                    <dt>Autoria</dt>
                    <dd>{q.autorNome}</dd>
                  </div>
                  {q.revisadoPorNome && (
                    <div>
                      <dt>Revisão</dt>
                      <dd>{q.revisadoPorNome}</dd>
                    </div>
                  )}
                  {q.publicadaEm && (
                    <div>
                      <dt>Publicada em</dt>
                      <dd>{formatarDataHora(q.publicadaEm)}</dd>
                    </div>
                  )}
                </dl>
              </Card>
            </aside>
          </div>

          <Dialog
            aberto={!!rejeitando}
            titulo={rejeitando === 'versao' ? 'Recusar nova versão' : 'Devolver para ajustes'}
            aoFechar={() => setRejeitando(false)}
            acoes={
              <>
                <Button variante="secundario" onClick={() => setRejeitando(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!comentario.trim()}
                  carregando={acao.isPending}
                  onClick={() =>
                    acao.mutate({
                      caminho: rejeitando === 'versao' ? `versoes/${q.versaoPendenteId}/rejeitar` : 'rejeitar',
                      corpo: { comentario },
                    })
                  }
                >
                  {rejeitando === 'versao' ? 'Recusar' : 'Devolver'}
                </Button>
              </>
            }
          >
            <TextArea rotulo="O que precisa ser ajustado?" required value={comentario} onChange={(e) => setComentario(e.target.value)} />
            {acao.error && <AlertBanner tipo="erro">{mensagemDeErro(acao.error)}</AlertBanner>}
          </Dialog>

          <Dialog
            aberto={arquivando}
            titulo="Arquivar esta questão?"
            aoFechar={() => setArquivando(false)}
            acoes={
              <>
                <Button variante="secundario" onClick={() => setArquivando(false)}>
                  Cancelar
                </Button>
                <Button carregando={acao.isPending} onClick={() => acao.mutate({ caminho: 'arquivar' })}>
                  Arquivar
                </Button>
              </>
            }
          >
            <p>A questão deixa de aparecer para novas provas. As provas que já a usam não mudam.</p>
            {acao.error && <AlertBanner tipo="erro">{mensagemDeErro(acao.error)}</AlertBanner>}
          </Dialog>

          <Dialog
            aberto={!!similares}
            titulo="Possível questão duplicada"
            aoFechar={() => setSimilares(null)}
            acoes={
              <>
                <Button variante="secundario" onClick={() => setSimilares(null)}>
                  Revisar antes
                </Button>
                <Button carregando={acao.isPending} onClick={() => acao.mutate({ caminho: 'enviar-revisao', corpo: { confirmarDuplicidade: true } })}>
                  Não é duplicada — enviar
                </Button>
              </>
            }
          >
            <p>Encontramos questões muito parecidas na mesma disciplina:</p>
            <ul>
              {similares?.map((s) => (
                <li key={s.id}>
                  <Link to={`/app/questoes/${s.id}`} target="_blank">
                    {resumir(s.enunciado, 100)}
                  </Link>{' '}
                  <span className="qz-suave">({Math.round(s.similaridade * 100)}% parecida)</span>
                </li>
              ))}
            </ul>
          </Dialog>
        </>
      )}
    </EstadoConsulta>
  )
}
