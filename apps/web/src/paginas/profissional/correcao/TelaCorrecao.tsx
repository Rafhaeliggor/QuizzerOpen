import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import {
  formatoDaQuestao,
  ROTULO_APROVACAO,
  ROTULO_FORMATO,
  ROTULO_NOTA,
  type CorrecaoQuestao,
  type NotaDetalhe,
  type PendenteCorrecao,
  alternativaCorreta,
  descreverNumerico,
} from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, Icone, Metrica, Spinner, StatusBadge, Tabs, TextArea, TextField } from '../../../design-system'
import { formatarDataHora, formatarNota } from '../../../util/formato'
import { ListaMidias } from '../../../componentes/Midias'
import { TextoRico } from '../../../componentes/TextoRico'
import { RespostaEstruturada } from '../../../componentes/QuestaoEstruturada'
import './correcao.css'

const RESUMO = 'resumo'

export function TelaCorrecao() {
  const { notaId } = useParams()
  const consulta = useQuery({ queryKey: ['nota', notaId], queryFn: () => api<NotaDetalhe>(`/correcao/notas/${notaId}`) })
  return (
    <>
      <CabecalhoPagina
        voltar={{ para: '/app/correcoes', rotulo: 'Voltar para correções' }}
        titulo={consulta.data?.provaTitulo ?? 'Correção'}
        descricao="Corrija as questões abertas; a nota final é publicada quando todas estiverem corrigidas."
      />
      <div className="qz-lista-detalhe">
        <FilaLateral notaAtual={notaId} />
        <div className="qz-pilha">
          <EstadoConsulta consulta={consulta}>{(n) => <CorrecaoNota key={n.id} nota={n} />}</EstadoConsulta>
        </div>
      </div>
    </>
  )
}

/** "Respostas pendentes" — mesma consulta da fila de correção. */
function FilaLateral({ notaAtual }: { notaAtual?: string }) {
  const consulta = useQuery({ queryKey: ['correcao', 'pendentes'], queryFn: () => api<PendenteCorrecao[]>('/correcao/pendentes') })
  const pendentes = consulta.data ?? []
  const respostas = pendentes.reduce((t, p) => t + p.questoesPendentes, 0)
  return (
    <Card className="qz-correcao__fila-lateral">
      <h2>Respostas pendentes</h2>
      {consulta.data && (
        <p className="qz-suave qz-pequeno">
          {pendentes.length} {pendentes.length === 1 ? 'envio' : 'envios'} · {respostas} {respostas === 1 ? 'resposta' : 'respostas'}
        </p>
      )}
      {consulta.isPending && <Spinner />}
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      {consulta.data && pendentes.length === 0 && <p className="qz-suave qz-pequeno">Nenhuma outra correção pendente.</p>}
      <nav aria-label="Respostas pendentes" className="qz-correcao__itens">
        {pendentes.map((p) => (
          <Link
            key={p.notaId}
            to={`/app/correcoes/${p.notaId}`}
            className={`qz-correcao__item${p.notaId === notaAtual ? ' qz-correcao__item--ativo' : ''}`}
            aria-current={p.notaId === notaAtual ? 'page' : undefined}
          >
            <span className="qz-correcao__item-nome">{p.participanteNome}</span>
            <span className="qz-correcao__item-sub">{p.provaTitulo}</span>
            <span className="qz-correcao__item-sub">
              {p.questoesPendentes} {p.questoesPendentes === 1 ? 'questão' : 'questões'} · {formatarDataHora(p.fimEm)}
            </span>
          </Link>
        ))}
      </nav>
    </Card>
  )
}

function pendente(q: CorrecaoQuestao) {
  return q.natureza === 'ABERTA' && q.fracao == null && !q.anulacao
}

function CorrecaoNota({ nota: n }: { nota: NotaDetalhe }) {
  const inicial = n.questoes.find(pendente) ?? n.questoes.find((q) => q.natureza === 'ABERTA') ?? n.questoes[0]
  const [aba, setAba] = useState<string>(inicial?.id ?? RESUMO)
  const questao = n.questoes.find((q) => q.id === aba)
  const bloqueada = n.status === 'CONSOLIDADA'
  const cliente = useQueryClient()
  const navegar = useNavigate()

  /**
   * "Salvar e avançar" (Figma — feature 037): próxima questão pendente desta tentativa; sem nenhuma,
   * a próxima tentativa da fila; com a fila vazia, volta para a lista de correções.
   */
  async function avancar(atual: CorrecaoQuestao) {
    const proxima = n.questoes.filter((q) => q.id !== atual.id && pendente(q)).sort((a, b) => a.ordem - b.ordem)
    const depois = proxima.find((q) => q.ordem > atual.ordem) ?? proxima[0]
    if (depois) {
      setAba(depois.id)
      return
    }
    const fila = await cliente.fetchQuery({
      queryKey: ['correcao', 'pendentes'],
      queryFn: () => api<PendenteCorrecao[]>('/correcao/pendentes'),
      staleTime: 0,
    })
    const outra = fila.find((p) => p.notaId !== n.id)
    navegar(outra ? `/app/correcoes/${outra.notaId}` : '/app/correcoes')
  }

  return (
    <>
      {n.asCegas && (
        <AlertBanner tipo="info" titulo="Correção às cegas">
          O nome do participante fica oculto até o resultado ser publicado.
        </AlertBanner>
      )}
      <Card>
        <div className="qz-correcao__aluno">
          <div>
            <h2>{n.participanteNome}</h2>
            <p className="qz-suave qz-pequeno">
              Tentativa {n.tentativaNumero} · Enviada em {formatarDataHora(n.fimEm)}
              {n.certificado ? '' : ' · participante externo (não certificado)'}
            </p>
          </div>
          <div className="qz-linha">
            {n.statusAprovacao && <StatusBadge status={n.statusAprovacao} rotulo={ROTULO_APROVACAO[n.statusAprovacao]} />}
            <StatusBadge status={n.status} rotulo={ROTULO_NOTA[n.status]} />
          </div>
        </div>
        <Tabs<string>
          rotulo="Questões"
          ativa={aba}
          aoMudar={setAba}
          abas={[
            ...n.questoes.map((q) => ({ valor: q.id, rotulo: `Questão ${q.ordem}` })),
            { valor: RESUMO, rotulo: 'Resumo do aluno' },
          ]}
        />
        {questao ? <QuestaoEnunciado questao={questao} /> : <ResumoAluno nota={n} aoAbrir={setAba} />}
      </Card>
      {questao && (
        <PainelCorrecao key={questao.id} notaId={n.id} questao={questao} bloqueada={bloqueada} nota={n} aoAvancar={() => avancar(questao)} />
      )}
    </>
  )
}

function rotuloSituacao(q: CorrecaoQuestao) {
  if (q.anulacao) return <StatusBadge status="ANULADA" tom="neutro" rotulo="Anulada" />
  if (q.fracao != null) {
    const f = Number(q.fracao)
    return (
      <StatusBadge
        status="OK"
        tom={f >= 1 ? 'sucesso' : f > 0 ? 'alerta' : 'erro'}
        rotulo={`${Math.round(f * 100)}%${q.automatica ? ' · automática' : ''}`}
      />
    )
  }
  return <StatusBadge status="PENDENTE" tom="alerta" rotulo="A corrigir" />
}

function QuestaoEnunciado({ questao: q }: { questao: CorrecaoQuestao }) {
  const marcada = (id: string) => id === q.resposta?.alternativaId || !!q.resposta?.alternativaIds?.includes(id)
  const esperada = [
    descreverNumerico(q.gabarito) && `Resposta esperada: ${descreverNumerico(q.gabarito)}`,
    q.gabarito?.respostasAceitas && `Respostas aceitas: ${q.gabarito.respostasAceitas.join(' · ')}`,
  ].filter(Boolean)
  return (
    <div className="qz-correcao__questao">
      <div className="qz-linha qz-correcao__questao-topo">
        <StatusBadge status="FORMATO" tom="info" rotulo={`${ROTULO_FORMATO[formatoDaQuestao(q)]} · peso ${Number(q.peso)}%`} />
        {rotuloSituacao(q)}
      </div>
      <h3 className="qz-pre qz-correcao__enunciado">
        <TextoRico texto={q.enunciado} />
      </h3>
      <ListaMidias midias={q.midias ?? undefined} />
      {q.formato === 'ASSOCIACAO' || q.formato === 'ORDENACAO' ? (
        <RespostaEstruturada formato={q.formato} alternativas={q.alternativas} resposta={q.resposta} gabarito={q.gabarito} />
      ) : q.alternativas ? (
        <ul className="qz-alternativas">
          {q.alternativas.map((a) => (
            <li
              key={a.id}
              className={`qz-alternativa${alternativaCorreta(q.gabarito, a.id) ? ' qz-alternativa--correta' : ''}${marcada(a.id) ? ' qz-alternativa--marcada' : ''}`}
            >
              <span className="qz-alternativa__letra">{a.id})</span>
              <span>
                <TextoRico texto={a.texto} />
              </span>
              {marcada(a.id) && <small className="qz-suave">← marcada</small>}
            </li>
          ))}
          {!q.resposta?.alternativaId && !q.resposta?.alternativaIds?.length && <li className="qz-suave">Sem resposta.</li>}
        </ul>
      ) : (
        <>
          <div className="qz-correcao__resposta">
            <div className="qz-correcao__rotulo">Resposta do aluno</div>
            <p className="qz-pre">{q.resposta?.texto?.trim() || <em className="qz-suave">Sem resposta</em>}</p>
          </div>
          {(esperada.length > 0 || q.rubrica?.criterios) && (
            <AlertBanner tipo="info" titulo="Resposta esperada">
              {esperada.map((t) => (
                <span key={t as string} className="qz-correcao__esperada">
                  {t}
                </span>
              ))}
              {q.rubrica?.criterios && <span className="qz-pre qz-correcao__esperada">{q.rubrica.criterios}</span>}
            </AlertBanner>
          )}
        </>
      )}
    </div>
  )
}

function ResumoAluno({ nota: n, aoAbrir }: { nota: NotaDetalhe; aoAbrir: (id: string) => void }) {
  const corrigidas = n.questoes.filter((q) => !pendente(q)).length
  return (
    <div className="qz-pilha">
      <div className="qz-metricas">
        <Metrica
          rotulo={n.notaFinal != null ? 'Nota final' : 'Nota provisória'}
          icone="alvo"
          valor={formatarNota(n.notaFinal ?? n.notaProvisoria)}
        />
        <Metrica rotulo="Questões corrigidas" icone="check-circulo" valor={`${corrigidas} / ${n.questoes.length}`} />
      </div>
      {n.notasSecao?.length ? (
        <ul className="qz-correcao__lista">
          {n.notasSecao.map((s) => (
            <li key={s.id}>
              <span>{s.titulo}</span>
              <span className="qz-suave">
                {formatarNota(s.nota)}
                {s.notaMinima != null && ` (mínimo ${formatarNota(s.notaMinima)})`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="qz-correcao__lista">
        {n.questoes.map((q) => (
          <li key={q.id}>
            <button type="button" className="qz-link" onClick={() => aoAbrir(q.id)}>
              Questão {q.ordem}
            </button>
            <span className="qz-suave qz-pequeno">{ROTULO_FORMATO[formatoDaQuestao(q)]}</span>
            {rotuloSituacao(q)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PainelCorrecao({
  notaId,
  questao: q,
  bloqueada,
  nota,
  aoAvancar,
}: {
  notaId: string
  questao: CorrecaoQuestao
  bloqueada: boolean
  nota: NotaDetalhe
  aoAvancar?: () => Promise<void> | void
}) {
  const cliente = useQueryClient()
  // Questão ainda não corrigida começa em branco: nada de nota cheia por omissão.
  const [percentual, setPercentual] = useState<number | null>(q.fracao != null ? Math.round(Number(q.fracao) * 100) : null)
  const [feedback, setFeedback] = useState(q.feedback ?? '')
  const criterios = q.rubrica?.itens ?? []
  const [pontos, setPontos] = useState<(number | null)[]>(() => criterios.map((_, i) => q.avaliacaoItens?.[i]?.pontos ?? null))
  const salvar = useMutation({
    mutationFn: () =>
      api(`/correcao/notas/${notaId}/questoes/${q.versaoQuestaoId}`, {
        method: 'POST',
        body: criterios.length ? { pontosItens: pontos, feedback } : { percentual, feedback },
      }),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['nota', notaId] })
      void cliente.invalidateQueries({ queryKey: ['correcao'] })
    },
  })
  const corrigida = q.fracao != null
  const editavel = q.natureza === 'ABERTA' && !bloqueada && !q.anulacao
  const totalPontos = pontos.reduce<number>((t, v) => t + (v ?? 0), 0)
  const preenchida = criterios.length ? pontos.every((v) => v != null) : percentual != null
  const maximoPontos = criterios.reduce((t, c) => t + c.pontos, 0)

  if (!editavel) {
    if (!q.avaliacaoItens?.length && !q.feedback && !q.anulacao) return null
    return (
      <Card>
        <h2>Critérios de pontuação</h2>
        {q.avaliacaoItens?.length ? (
          <ul className="qz-correcao__criterios">
            {q.avaliacaoItens.map((a, i) => (
              <li key={i}>
                <span>{a.descricao}</span>
                <StatusBadge status="PONTOS" tom="alerta" rotulo={`${a.pontos} / ${a.maximo}`} />
              </li>
            ))}
          </ul>
        ) : null}
        {q.feedback && (
          <p className="qz-correcao__feedback">
            <strong>Feedback:</strong> {q.feedback}
          </p>
        )}
        {q.anulacao && <p className="qz-suave qz-pequeno">Anulada: {q.anulacao.justificativa}</p>}
      </Card>
    )
  }

  return (
    <Card>
      <h2>{criterios.length ? 'Critérios de pontuação' : 'Pontuação'}</h2>
      {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
      {criterios.length > 0 && (
        <ul className="qz-correcao__criterios">
          {criterios.map((c, i) => (
            <li key={i}>
              <span>
                {c.descricao}
                <span className="qz-correcao__item-sub">Até {c.pontos} {c.pontos === 1 ? 'ponto' : 'pontos'}</span>
              </span>
              <span className="qz-correcao__pontos">
                <input
                  className="qz-input qz-correcao__pontos-campo"
                  type="number"
                  min={0}
                  max={c.pontos}
                  step={0.25}
                  aria-label={`Pontos para: ${c.descricao}`}
                  value={pontos[i] ?? ''}
                  onChange={(e) =>
                    setPontos((x) =>
                      x.map((v, j) => (j === i ? (e.target.value === '' ? null : Math.max(0, Math.min(c.pontos, Number(e.target.value)))) : v)),
                    )
                  }
                />
                <span className="qz-suave">/ {c.pontos}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="qz-correcao__campos">
        {criterios.length > 0 ? (
          <div className="qz-correcao__total">
            <span className="qz-correcao__rotulo">Nota atribuída</span>
            <strong>
              {totalPontos} de {maximoPontos}
            </strong>
            <span className="qz-suave qz-pequeno">{Math.round((totalPontos / Math.max(0.01, maximoPontos)) * 100)}% da questão</span>
          </div>
        ) : (
          <div>
            <TextField
              rotulo="Pontuação (% da questão)"
              ajuda="Número inteiro de 0 a 100"
              type="number"
              min={0}
              max={100}
              step={1}
              value={percentual ?? ''}
              onChange={(e) =>
                setPercentual(e.target.value === '' ? null : Math.max(0, Math.min(100, Math.round(Number(e.target.value)))))
              }
            />
            <div className="qz-acoes">
              {[0, 50, 100].map((v) => (
                <Button key={v} variante="secundario" onClick={() => setPercentual(v)}>
                  {v}%
                </Button>
              ))}
            </div>
          </div>
        )}
        <TextArea rotulo="Feedback para o aluno (opcional)" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </div>
      <div className="qz-correcao__rodape">
        <span className="qz-suave qz-pequeno">
          {nota.notaFinal != null ? 'Nota final' : 'Nota provisória'}: {formatarNota(nota.notaFinal ?? nota.notaProvisoria)}
        </span>
        {!preenchida && <span className="qz-suave qz-pequeno">Preencha a pontuação para salvar.</span>}
        <Button variante={aoAvancar ? 'secundario' : 'primario'} carregando={salvar.isPending} disabled={!preenchida} onClick={() => salvar.mutate()}>
          <Icone nome="check" /> {corrigida ? 'Atualizar correção' : 'Salvar correção'}
        </Button>
        {aoAvancar && (
          <Button
            carregando={salvar.isPending}
            disabled={!preenchida}
            onClick={() => salvar.mutate(undefined, { onSuccess: () => void aoAvancar() })}
          >
            Salvar e avançar
          </Button>
        )}
      </div>
    </Card>
  )
}
