import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import {
  formatoDaQuestao,
  ROTULO_DIFICULDADE,
  ROTULO_FORMATO,
  type Natureza,
  type Pagina,
  type ProvaDetalhe,
  type QuestaoResumo,
} from '../../../api/tipos'
import { AlertBanner, Button, Card, DataTable, Icone, SelectField, StatusBadge, TextField } from '../../../design-system'
import { resumir } from '../../../util/formato'
import './provas.css'

interface ItemLocal {
  versaoQuestaoId: string
  enunciado: string
  formato: string
  natureza: Natureza | null
  peso: number
}

interface SecaoLocal {
  chave: number
  titulo: string
  modo: 'FIXA' | 'SORTEIO'
  sortear: number
  peso: number
  notaMinima: string
  itens: ItemLocal[]
}

let proximaChave = 1
const arred = (n: number) => Math.round(n * 100) / 100

function distribuir(n: number, total: number): number[] {
  if (n === 0) return []
  const base = Math.floor((total / n) * 100) / 100
  const pesos = Array.from({ length: n }, () => base)
  pesos[n - 1] = arred(total - base * (n - 1))
  return pesos
}

function secoesIniciais(prova: ProvaDetalhe): SecaoLocal[] {
  const item = (i: ProvaDetalhe['itens'][number]): ItemLocal => ({
    versaoQuestaoId: i.versaoQuestaoId,
    enunciado: i.enunciado,
    formato: formatoDaQuestao(i),
    natureza: i.natureza,
    peso: i.peso,
  })
  if (!prova.secoes?.length) {
    return [{ chave: proximaChave++, titulo: 'Questões', modo: 'FIXA', sortear: 1, peso: 0, notaMinima: '', itens: prova.itens.map(item) }]
  }
  return prova.secoes.map((s) => ({
    chave: proximaChave++,
    titulo: s.titulo,
    modo: s.modo,
    sortear: s.sortear ?? 1,
    peso: s.peso ?? 0,
    notaMinima: s.notaMinima == null ? '' : String(s.notaMinima).replace('.', ','),
    itens: prova.itens.filter((i) => i.secaoId === s.id).map(item),
  }))
}

/** Conteúdo comparável da montagem (ignora a chave interna e se o peso veio como número ou texto). */
function assinatura(secoes: SecaoLocal[]): string {
  return JSON.stringify(
    secoes.map(({ chave: _chave, ...s }) => ({
      ...s,
      sortear: String(s.sortear),
      peso: String(s.peso),
      itens: s.itens.map((i) => [i.versaoQuestaoId, String(i.peso)]),
    })),
  )
}

/**
 * Passo 2 do assistente (RF05 — ADR-0048): seções com questões fixas ou SORTEIO de N questões
 * de um conjunto por participante, nota mínima opcional por seção. Uma seção única sem nota
 * mínima é uma prova comum.
 */
export function ComposicaoSecoes({
  prova,
  aoSalvar,
  aoEditarInformacoes,
  aoMudarPendencia,
}: {
  prova: ProvaDetalhe
  aoSalvar: () => void
  /** Volta ao passo de dados e parâmetros. */
  aoEditarInformacoes?: () => void
  /** Avisa se há montagem não salva (o assistente pede confirmação antes de trocar de passo). */
  aoMudarPendencia?: (pendente: boolean) => void
}) {
  const cliente = useQueryClient()
  const [secoes, setSecoes] = useState<SecaoLocal[]>(() => secoesIniciais(prova))
  const pendente = useMemo(() => assinatura(secoes) !== assinatura(secoesIniciais(prova)), [secoes, prova])
  useEffect(() => aoMudarPendencia?.(pendente), [pendente, aoMudarPendencia])
  const [alvo, setAlvo] = useState(0)
  const [busca, setBusca] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [pagina, setPagina] = useState(1)

  const soma = useMemo(
    () =>
      arred(
        secoes.reduce((t, s) => t + (s.modo === 'SORTEIO' ? Number(s.peso) || 0 : s.itens.reduce((u, i) => u + (Number(i.peso) || 0), 0)), 0),
      ),
    [secoes],
  )
  const porParticipante = secoes.reduce((t, s) => t + (s.modo === 'SORTEIO' ? Number(s.sortear) || 0 : s.itens.length), 0)
  const naProva = new Set(secoes.flatMap((s) => s.itens.map((i) => i.versaoQuestaoId)))

  const disciplinas = useQuery({ queryKey: ['questoes', 'disciplinas'], queryFn: () => api<string[]>('/questoes/disciplinas') })
  const banco = useQuery({
    queryKey: ['questoes', 'publicadas', busca, disciplina, pagina],
    queryFn: () => {
      // Paginado: a API limita `tamanho` a 100, e o banco pode ter mais questões publicadas.
      const p = new URLSearchParams({ escopo: 'publicadas', pagina: String(pagina), tamanho: '50' })
      if (busca.trim()) p.set('busca', busca.trim())
      if (disciplina) p.set('disciplina', disciplina)
      return api<Pagina<QuestaoResumo>>(`/questoes?${p.toString()}`)
    },
    placeholderData: keepPreviousData, // mantém a tabela e a paginação ao trocar de página
  })
  const salvar = useMutation({
    mutationFn: () =>
      api(`/provas/${prova.id}/composicao`, {
        method: 'PUT',
        body: {
          secoes: secoes.map((s) => ({
            titulo: s.titulo.trim() || 'Seção',
            modo: s.modo,
            ...(s.modo === 'SORTEIO' ? { sortear: Number(s.sortear), peso: Number(s.peso) } : {}),
            ...(s.notaMinima.trim() ? { notaMinima: Number(s.notaMinima.replace(',', '.')) } : {}),
            itens: s.itens.map((i) => ({ versaoQuestaoId: i.versaoQuestaoId, ...(s.modo === 'FIXA' ? { peso: Number(i.peso) } : {}) })),
          })),
        },
      }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['prova', prova.id] })
      aoSalvar()
    },
  })

  const alterar = (k: number, f: (s: SecaoLocal) => SecaoLocal) => setSecoes((x) => x.map((s, j) => (j === k ? f(s) : s)))
  const adicionar = (qs: QuestaoResumo[]) => {
    const novas = qs
      .filter((q) => !naProva.has(q.versaoVigente.id))
      .map((q) => ({ versaoQuestaoId: q.versaoVigente.id, enunciado: q.versaoVigente.enunciado, formato: formatoDaQuestao(q), natureza: q.natureza, peso: 0 }))
    alterar(alvo, (s) => ({ ...s, itens: [...s.itens, ...novas] }))
  }
  const distribuirPesos = () => {
    const fixas = secoes.flatMap((s) => (s.modo === 'FIXA' ? s.itens : []))
    const restante = 100 - secoes.reduce((t, s) => t + (s.modo === 'SORTEIO' ? Number(s.peso) || 0 : 0), 0)
    const pesos = distribuir(fixas.length, Math.max(0, restante))
    let k = 0
    setSecoes((x) => x.map((s) => (s.modo === 'FIXA' ? { ...s, itens: s.itens.map((i) => ({ ...i, peso: pesos[k++]! })) } : s)))
  }
  const mover = (sk: number, i: number, d: -1 | 1) =>
    alterar(sk, (s) => {
      const c = [...s.itens]
      ;[c[i], c[i + d]] = [c[i + d]!, c[i]!]
      return { ...s, itens: c }
    })

  const todosItens = secoes.flatMap((s) => s.itens)
  const fechadas = todosItens.filter((i) => i.natureza === 'FECHADA').length
  const abertas = todosItens.filter((i) => i.natureza === 'ABERTA').length
  const equilibrada = Math.abs(soma - 100) <= 0.01
  const secaoAlvo = secoes[alvo]
  const disponiveis = banco.data?.itens.filter((q) => !naProva.has(q.versaoVigente.id)).length ?? 0
  const irParaBanco = (sk: number) => {
    setAlvo(sk)
    document.getElementById('qz-prv-banco')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div className="qz-duas-colunas">
        <div className="qz-pilha">
          {aoEditarInformacoes && (
            <Card>
              <div className="qz-prv-cabecalho-cartao">
                <h2>Informações da prova</h2>
                <Button variante="secundario" onClick={aoEditarInformacoes}>
                  <Icone nome="lapis" /> Editar informações e regras
                </Button>
              </div>
              <dl className="qz-prv-info">
                <div>
                  <dt>Título</dt>
                  <dd>{prova.titulo}</dd>
                </div>
                <div>
                  <dt>Orientações para o participante</dt>
                  <dd className="qz-pre">{prova.descricao?.trim() || <span className="qz-suave">Sem orientações.</span>}</dd>
                </div>
              </dl>
            </Card>
          )}

          <Card>
            <h2>Questões da prova</h2>
            <p className="qz-suave qz-pequeno qz-prv-ajuda">
              Use as setas para reordenar. Seções organizam a prova: em <strong>Sorteio</strong>, cada participante recebe N
              questões sorteadas do conjunto da seção (o peso da seção é dividido entre elas). <strong>Nota mínima</strong> na seção
              soma-se ao critério geral.
            </p>
            <div className="qz-prv-barra">
              <div className="qz-linha">
                <StatusBadge status="SOMA" tom={equilibrada ? 'sucesso' : 'alerta'} rotulo={`Soma dos pesos: ${soma}%`} />
                <StatusBadge status="QTD" tom="info" rotulo={`${porParticipante} questões por participante`} />
              </div>
              <Button variante="secundario" onClick={distribuirPesos}>
                Distribuir igualmente
              </Button>
            </div>

            {secoes.map((s, sk) => (
              <section key={s.chave} className="qz-prv-secao" aria-label={`Seção ${sk + 1}`}>
                <div className="qz-grade-campos">
                  <TextField rotulo={`Título da seção ${sk + 1}`} value={s.titulo} onChange={(e) => alterar(sk, (x) => ({ ...x, titulo: e.target.value }))} />
                  <SelectField
                    rotulo="Modo"
                    value={s.modo}
                    onChange={(e) => alterar(sk, (x) => ({ ...x, modo: e.target.value as 'FIXA' | 'SORTEIO' }))}
                    opcoes={[
                      { valor: 'FIXA', rotulo: 'Todas as questões (peso por questão)' },
                      { valor: 'SORTEIO', rotulo: 'Sorteio de N questões do conjunto' },
                    ]}
                  />
                  {s.modo === 'SORTEIO' && (
                    <>
                      <TextField
                        rotulo="Sortear quantas"
                        type="number"
                        min={1}
                        max={Math.max(1, s.itens.length)}
                        value={s.sortear}
                        onChange={(e) => alterar(sk, (x) => ({ ...x, sortear: Number(e.target.value) }))}
                      />
                      <TextField
                        rotulo="Peso da seção (%)"
                        type="number"
                        min={0.01}
                        max={100}
                        step={0.01}
                        value={s.peso}
                        onChange={(e) => alterar(sk, (x) => ({ ...x, peso: Number(e.target.value) }))}
                      />
                    </>
                  )}
                  <TextField
                    rotulo="Nota mínima na seção (opcional)"
                    inputMode="decimal"
                    placeholder="ex.: 5"
                    value={s.notaMinima}
                    onChange={(e) => alterar(sk, (x) => ({ ...x, notaMinima: e.target.value }))}
                  />
                </div>

                <div className="qz-prv-barra">
                  <span className="qz-badge qz-badge--info">
                    {s.itens.length} {s.itens.length === 1 ? 'questão' : 'questões'}
                    {s.modo === 'SORTEIO'
                      ? ` · cada participante recebe ${s.sortear} (peso ${s.sortear ? arred(s.peso / s.sortear) : 0}% cada)`
                      : ` · ${arred(s.itens.reduce((t, i) => t + (Number(i.peso) || 0), 0))}%`}
                  </span>
                  <Button variante="secundario" onClick={() => irParaBanco(sk)}>
                    <Icone nome="biblioteca" /> Adicionar do banco
                  </Button>
                </div>

                {s.itens.length === 0 ? (
                  <p className="qz-suave qz-prv-vazio">Sem questões. Adicione do banco de questões publicadas abaixo.</p>
                ) : (
                  <ol className="qz-prv-itens">
                    {s.itens.map((i, k) => (
                      <li key={i.versaoQuestaoId} className="qz-prv-item">
                        <span className="qz-prv-item__ordem">{k + 1}</span>
                        <span className="qz-prv-item__texto">
                          <strong>{resumir(i.enunciado, 160)}</strong>
                          <small>{ROTULO_FORMATO[i.formato as keyof typeof ROTULO_FORMATO] ?? i.formato}</small>
                        </span>
                        {s.modo === 'FIXA' && (
                          <span className="qz-prv-item__peso">
                            <small aria-hidden>Peso</small>
                            <span>
                              <input
                                className="qz-input"
                                type="number"
                                min={0.01}
                                max={100}
                                step={0.01}
                                aria-label={`Peso da questão ${k + 1} da seção ${sk + 1} (%)`}
                                value={i.peso}
                                onChange={(e) =>
                                  alterar(sk, (x) => ({ ...x, itens: x.itens.map((y, j) => (j === k ? { ...y, peso: Number(e.target.value) } : y)) }))
                                }
                              />
                              %
                            </span>
                          </span>
                        )}
                        <span className="qz-prv-item__acoes">
                          <button type="button" className="qz-prv-icone" disabled={k === 0} onClick={() => mover(sk, k, -1)} aria-label="Mover para cima">
                            <Icone nome="seta-baixo" className="qz-prv-girar" tamanho={18} />
                          </button>
                          <button
                            type="button"
                            className="qz-prv-icone"
                            disabled={k === s.itens.length - 1}
                            onClick={() => mover(sk, k, 1)}
                            aria-label="Mover para baixo"
                          >
                            <Icone nome="seta-baixo" tamanho={18} />
                          </button>
                          <button
                            type="button"
                            className="qz-prv-icone qz-prv-icone--perigo"
                            onClick={() => alterar(sk, (x) => ({ ...x, itens: x.itens.filter((_, j) => j !== k) }))}
                            aria-label="Remover questão"
                          >
                            <Icone nome="lixeira" tamanho={18} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                {secoes.length > 1 && (
                  <div>
                    <Button
                      variante="fantasma"
                      onClick={() => {
                        setSecoes((x) => x.filter((_, j) => j !== sk))
                        setAlvo(0)
                      }}
                    >
                      <Icone nome="lixeira" /> Remover seção
                    </Button>
                  </div>
                )}
              </section>
            ))}

            <div>
              <Button
                variante="secundario"
                onClick={() => {
                  setSecoes((x) => [
                    ...x,
                    { chave: proximaChave++, titulo: `Seção ${x.length + 1}`, modo: 'FIXA', sortear: 1, peso: 0, notaMinima: '', itens: [] },
                  ])
                  setAlvo(secoes.length)
                }}
              >
                + Nova seção
              </Button>
            </div>
          </Card>
        </div>

        <aside className="qz-pilha">
          <Card>
            <h2>Resumo da avaliação</h2>
            <dl className="qz-prv-resumo__linhas">
              <div>
                <dt>Questões</dt>
                <dd>{todosItens.length}</dd>
              </div>
              <div>
                <dt>Fechadas</dt>
                <dd>{fechadas}</dd>
              </div>
              <div>
                <dt>Abertas</dt>
                <dd>{abertas}</dd>
              </div>
              <div>
                <dt>Recebidas por participante</dt>
                <dd>{porParticipante}</dd>
              </div>
              <div className="qz-prv-resumo__total">
                <dt>Soma dos pesos</dt>
                <dd className={equilibrada ? undefined : 'qz-prv-resumo__alerta'}>{soma}%</dd>
              </div>
            </dl>
          </Card>
          {equilibrada ? (
            <AlertBanner tipo="sucesso" titulo="Tudo em equilíbrio">
              Os pesos fecham 100%. Revise as questões antes de salvar e seguir para a publicação.
            </AlertBanner>
          ) : (
            <AlertBanner tipo="alerta" titulo="Ajuste os pesos">
              Para publicar, os pesos precisam fechar 100%. Use “Distribuir igualmente” ou ajuste questão a questão.
            </AlertBanner>
          )}
          <Button largo carregando={salvar.isPending} onClick={() => salvar.mutate()}>
            <Icone nome="seta-direita" /> Salvar e revisar
          </Button>
          {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
          <Card>
            <h2>Pré-visualização</h2>
            <p className="qz-suave qz-pequeno">Veja a prova como ficará impressa, na última versão salva.</p>
            <Link to={`/app/provas/${prova.id}/imprimir`} className="qz-botao qz-botao--secundario qz-botao--largo">
              <Icone nome="olho" /> Visualizar prova
            </Link>
          </Card>
        </aside>
      </div>

      <section id="qz-prv-banco" className="qz-prv-banco" aria-labelledby="qz-prv-banco-titulo">
        <h2 id="qz-prv-banco-titulo">Adicionar questões do banco</h2>
        <p className="qz-suave">Somente questões publicadas (revisadas por um colega) podem entrar na prova.</p>
        <div className="qz-barra-filtros">
          <label className="qz-busca">
            <Icone nome="busca" />
            <input type="search" placeholder="Buscar no enunciado" aria-label="Buscar no enunciado" value={busca} onChange={(e) => (setBusca(e.target.value), setPagina(1))} />
          </label>
          <select className="qz-seletor" aria-label="Disciplina" value={disciplina} onChange={(e) => (setDisciplina(e.target.value), setPagina(1))}>
            <option value="">Todas as disciplinas</option>
            {(disciplinas.data ?? []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="qz-duas-colunas">
          <Card>
            <h2>Questões disponíveis</h2>
            <p className="qz-suave qz-pequeno">
              {banco.data ? `${banco.data.total} questões publicadas${disciplina ? ` de ${disciplina}` : ''}` : banco.error ? '' : 'Carregando…'}
            </p>
            {banco.error && <AlertBanner tipo="erro">{mensagemDeErro(banco.error)}</AlertBanner>}
            <DataTable
              rotulo="Questões publicadas"
              carregando={banco.isPending}
              linhas={banco.data?.itens ?? []}
              paginacao={banco.data && { ...banco.data, aoMudarPagina: setPagina }}
              chaveLinha={(q) => q.id}
              vazio={
                <>
                  Nenhuma questão publicada encontrada. <Link to="/app/questoes/nova">Cadastre uma questão</Link> e peça a revisão de
                  um colega.
                </>
              }
              colunas={[
                {
                  chave: 'enunciado',
                  titulo: 'Questão',
                  render: (q) => (
                    <>
                      <span className="qz-prv-enunciado">{resumir(q.versaoVigente.enunciado, 120)}</span>
                      <span className="qz-tabela__sub">
                        {q.disciplina}
                        {q.topico ? ` · ${q.topico}` : ''} · {ROTULO_FORMATO[formatoDaQuestao(q)]}
                      </span>
                    </>
                  ),
                },
                {
                  chave: 'dif',
                  titulo: 'Dificuldade',
                  render: (q) => (
                    <StatusBadge
                      status={q.dificuldade}
                      tom={q.dificuldade === 'FACIL' ? 'sucesso' : q.dificuldade === 'DIFICIL' ? 'erro' : 'alerta'}
                      rotulo={ROTULO_DIFICULDADE[q.dificuldade]}
                    />
                  ),
                },
                {
                  chave: 'acao',
                  titulo: 'Ação',
                  render: (q) =>
                    naProva.has(q.versaoVigente.id) ? (
                      <span className="qz-prv-na-prova">
                        <Icone nome="check" tamanho={16} /> Na prova
                      </span>
                    ) : (
                      <Button variante="secundario" onClick={() => adicionar([q])}>
                        Adicionar
                      </Button>
                    ),
                },
              ]}
            />
          </Card>
          <aside className="qz-pilha">
            <Card className="qz-cartao--destaque qz-prv-selecao">
              <h2>Sua seleção</h2>
              <SelectField
                rotulo="Adicionar na seção"
                value={String(alvo)}
                onChange={(e) => setAlvo(Number(e.target.value))}
                opcoes={secoes.map((s, k) => ({ valor: String(k), rotulo: `${k + 1}. ${s.titulo || 'Seção'}` }))}
              />
              <span className="qz-prv-selecao__numero">{secaoAlvo?.itens.length ?? 0}</span>
              <p className="qz-prv-selecao__legenda">questões nesta seção</p>
              {!!secaoAlvo?.itens.length && (
                <ul className="qz-prv-selecao__lista">
                  {secaoAlvo.itens.slice(-5).map((i) => (
                    <li key={i.versaoQuestaoId}>{resumir(i.enunciado, 60)}</li>
                  ))}
                  {secaoAlvo.itens.length > 5 && <li className="qz-suave">e mais {secaoAlvo.itens.length - 5}…</li>}
                </ul>
              )}
              <p className="qz-pequeno qz-suave">Os pesos e a ordem podem ser ajustados na montagem, acima.</p>
              <Button largo disabled={!banco.data?.itens.length} onClick={() => adicionar(banco.data?.itens ?? [])}>
                <Icone nome="mais" /> Adicionar todas desta página ({disponiveis})
              </Button>
            </Card>
          </aside>
        </div>
      </section>
    </>
  )
}
