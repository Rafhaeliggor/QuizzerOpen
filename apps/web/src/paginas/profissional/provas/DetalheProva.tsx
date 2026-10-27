import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import {
  ROTULO_PAPEL,
  ROTULO_STATUS_PROVA,
  type AplicacaoResumo,
  type ProfessorOpcao,
  type ProvaDetalhe,
  type Turma,
  type TurmaDetalhe,
} from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, Dialog, Icone, SelectField, StatusBadge, TextField } from '../../../design-system'
import { deInputDataHora, formatarDataHora, paraInputDataHora } from '../../../util/formato'
import { TabelaAplicacoes } from '../aplicacoes/ListaAplicacoes'
import { ConteudoVersao } from '../questoes/DetalheQuestao'
import { ResumoParametros } from './ResumoParametros'
import './provas.css'

export function DetalheProva() {
  const { id } = useParams()
  const cliente = useQueryClient()
  const consulta = useQuery({ queryKey: ['prova', id], queryFn: () => api<ProvaDetalhe>(`/provas/${id}`) })
  const aplicacoes = useQuery({ queryKey: ['aplicacoes', id], queryFn: () => api<AplicacaoResumo[]>(`/aplicacoes?provaId=${id}`) })
  const navegar = useNavigate()
  const [aplicando, setAplicando] = useState(false)
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false)
  const duplicar = useMutation({
    mutationFn: () => api<{ id: string }>(`/provas/${id}/duplicar`, { method: 'POST' }),
    onSuccess: (r) => {
      void cliente.invalidateQueries({ queryKey: ['provas'] })
      navegar(`/app/provas/${r.id}/editar`)
    },
  })
  const arquivar = useMutation({
    mutationFn: () => api(`/provas/${id}/arquivar`, { method: 'POST' }),
    onSuccess: () => {
      setConfirmandoArquivar(false)
      void cliente.invalidateQueries({ queryKey: ['prova', id] })
      void cliente.invalidateQueries({ queryKey: ['provas'] })
    },
  })

  return (
    <EstadoConsulta consulta={consulta}>
      {(p) => (
        <>
          <CabecalhoPagina
            voltar={{ para: '/app/provas', rotulo: 'Voltar para provas' }}
            sobretitulo={<StatusBadge status={p.status} rotulo={ROTULO_STATUS_PROVA[p.status]} />}
            titulo={p.titulo}
            descricao={`${p.itens.length} questões · ${p.visibilidade === 'PUBLICA' ? 'pública (PIN/link)' : 'privada (turmas)'}`}
            acoes={
              <>
                <Link to={`/app/relatorios/provas/${p.id}`} className="qz-botao qz-botao--secundario">
                  <Icone nome="grafico" /> Relatório
                </Link>
                <Link to={`/app/provas/${p.id}/imprimir`} className="qz-botao qz-botao--secundario">
                  <Icone nome="impressora" /> Imprimir / PDF
                </Link>
                <Button variante="secundario" carregando={duplicar.isPending} onClick={() => duplicar.mutate()}>
                  <Icone nome="documentos" /> Duplicar
                </Button>
                {p.status !== 'ARQUIVADA' && (
                  <Button variante="fantasma" onClick={() => (arquivar.reset(), setConfirmandoArquivar(true))}>
                    Arquivar
                  </Button>
                )}
                {p.status === 'PUBLICADA' && (
                  <Button onClick={() => setAplicando(true)}>
                    <Icone nome="seta-direita" /> Aplicar prova
                  </Button>
                )}
              </>
            }
          />
          {duplicar.error && <AlertBanner tipo="erro">{mensagemDeErro(duplicar.error)}</AlertBanner>}
          <Dialog
            aberto={confirmandoArquivar}
            titulo="Arquivar esta prova?"
            aoFechar={() => setConfirmandoArquivar(false)}
            acoes={
              <>
                <Button variante="secundario" onClick={() => setConfirmandoArquivar(false)}>
                  Cancelar
                </Button>
                <Button carregando={arquivar.isPending} onClick={() => arquivar.mutate()}>
                  Arquivar
                </Button>
              </>
            }
          >
            <p>A prova sai da lista de provas ativas e não poderá ser aplicada de novo. Aplicações, notas e relatórios continuam disponíveis.</p>
            {arquivar.error && <AlertBanner tipo="erro">{mensagemDeErro(arquivar.error)}</AlertBanner>}
          </Dialog>
          <div className="qz-duas-colunas">
            <div className="qz-pilha">
              <Card>
                <h2>Aplicações</h2>
                <TabelaAplicacoes linhas={aplicacoes.data ?? []} carregando={aplicacoes.isPending} ocultarProva />
              </Card>
              <Card>
                <h2>Questões da prova</h2>
                <ol className="qz-prv-questoes">
                  {p.itens.map((i, k) => (
                    <li key={i.versaoQuestaoId}>
                      {i.secaoId && i.secaoId !== p.itens[k - 1]?.secaoId && <SecaoCabecalho prova={p} secaoId={i.secaoId} />}
                      <div className="qz-prv-questao">
                        <div className="qz-prv-questao__topo">
                          <span className="qz-prv-item__ordem">{k + 1}</span>
                          <span className="qz-suave qz-pequeno">
                            Peso {i.peso}% · versão {i.numeroVersao}
                            {i.versaoMaisNova &&
                              ` · existe a versão ${i.versaoMaisNova} (esta prova continua com a ${i.numeroVersao}; para usar a nova, duplique a prova)`}
                          </span>
                        </div>
                        <ConteudoVersao versao={i} />
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
            <aside className="qz-pilha">
              <Card>
                <h2>Resumo da avaliação</h2>
                <dl className="qz-prv-resumo__linhas">
                  <div>
                    <dt>Questões</dt>
                    <dd>{p.itens.length}</dd>
                  </div>
                  <div>
                    <dt>Recebidas por participante</dt>
                    <dd>{p.questoesPorParticipante}</dd>
                  </div>
                  <div>
                    <dt>Aplicações</dt>
                    <dd>{aplicacoes.data?.length ?? '—'}</dd>
                  </div>
                  {p.publicadaEm && (
                    <div>
                      <dt>Publicada em</dt>
                      <dd>{formatarDataHora(p.publicadaEm)}</dd>
                    </div>
                  )}
                  <div className="qz-prv-resumo__total">
                    <dt>Soma dos pesos</dt>
                    <dd>{p.somaPesos}%</dd>
                  </div>
                </dl>
              </Card>
              <Card className="qz-prv-parametros">
                <h2>Parâmetros</h2>
                <ResumoParametros prova={p} />
              </Card>
              <CorretoresDesignados prova={p} />
            </aside>
          </div>
          {aplicando && <NovaAplicacao prova={p} aoFechar={() => setAplicando(false)} />}
        </>
      )}
    </EstadoConsulta>
  )
}

function NovaAplicacao({ prova, aoFechar }: { prova: ProvaDetalhe; aoFechar: () => void }) {
  const navegar = useNavigate()
  const cliente = useQueryClient()
  const turmas = useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/turmas') })
  const [destino, setDestino] = useState<'TURMA' | 'ALUNO_AVULSO' | 'PUBLICO'>(prova.visibilidade === 'PUBLICA' ? 'PUBLICO' : 'TURMA')
  const [turmaId, setTurmaId] = useState('')
  const [alunoIds, setAlunoIds] = useState<string[]>([])
  const turmaEscolhida = turmaId || turmas.data?.[0]?.id
  const alunosDaTurma = useQuery({
    queryKey: ['turma', turmaEscolhida],
    queryFn: () => api<TurmaDetalhe>(`/turmas/${turmaEscolhida}`),
    enabled: destino === 'ALUNO_AVULSO' && !!turmaEscolhida,
  })
  const [inicio, setInicio] = useState(() => paraInputDataHora(new Date()))
  const [fim, setFim] = useState(() => paraInputDataHora(new Date(Date.now() + 7 * 24 * 3600_000)))
  const criar = useMutation({
    mutationFn: () =>
      api<AplicacaoResumo>('/aplicacoes', {
        method: 'POST',
        body: {
          provaId: prova.id,
          destinoTipo: destino,
          ...(destino === 'TURMA' ? { turmaId: turmaId || turmas.data?.[0]?.id } : {}),
          ...(destino === 'ALUNO_AVULSO' ? { alunoIds } : {}),
          janelaInicio: deInputDataHora(inicio),
          janelaFim: deInputDataHora(fim),
        },
      }),
    onSuccess: (a) => {
      void cliente.invalidateQueries({ queryKey: ['aplicacoes'] })
      navegar(`/app/aplicacoes/${a.id}`)
    },
  })

  const opcoesDestino = [
    { valor: 'TURMA', rotulo: 'Turma (alunos com login)' },
    { valor: 'ALUNO_AVULSO', rotulo: 'Alunos escolhidos (com login)' },
    ...(prova.visibilidade === 'PUBLICA' ? [{ valor: 'PUBLICO', rotulo: 'Público (PIN/link, sem login)' }] : []),
  ]
  return (
    <Dialog
      aberto
      titulo="Aplicar prova"
      aoFechar={aoFechar}
      acoes={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            carregando={criar.isPending}
            disabled={(destino === 'TURMA' && !turmas.data?.length) || (destino === 'ALUNO_AVULSO' && alunoIds.length === 0)}
            onClick={() => criar.mutate()}
          >
            Criar aplicação
          </Button>
        </>
      }
    >
      {criar.error && <AlertBanner tipo="erro">{mensagemDeErro(criar.error)}</AlertBanner>}
      <SelectField
        rotulo="Destino"
        value={destino}
        onChange={(e) => setDestino(e.target.value as 'TURMA' | 'ALUNO_AVULSO' | 'PUBLICO')}
        opcoes={opcoesDestino}
      />
      {destino === 'ALUNO_AVULSO' && (
        <fieldset className="qz-fieldset">
          <legend>Alunos ({alunoIds.length} escolhidos)</legend>
          <p className="qz-suave qz-pequeno">
            Para segunda chamada, recuperação ou adaptação. Escolha em uma ou mais turmas; só os escolhidos veem a prova.
          </p>
          {turmas.data?.length ? (
            <SelectField
              rotulo="Mostrar alunos da turma"
              value={turmaEscolhida ?? ''}
              onChange={(e) => setTurmaId(e.target.value)}
              opcoes={turmas.data.map((t) => ({ valor: t.id, rotulo: t.nome }))}
            />
          ) : null}
          <div className="qz-lista-selecao">
            {(alunosDaTurma.data?.alunos ?? []).map((a) => (
              <label key={a.id} className="qz-linha">
                <input
                  type="checkbox"
                  checked={alunoIds.includes(a.id)}
                  onChange={() => setAlunoIds((x) => (x.includes(a.id) ? x.filter((y) => y !== a.id) : [...x, a.id]))}
                />
                {a.nome} <span className="qz-suave qz-pequeno">{a.matricula ?? a.email}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {destino === 'TURMA' &&
        (turmas.data?.length ? (
          <SelectField
            rotulo="Turma"
            value={turmaId || turmas.data[0]!.id}
            onChange={(e) => setTurmaId(e.target.value)}
            opcoes={turmas.data.map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.totalAlunos} alunos)` }))}
          />
        ) : (
          <AlertBanner tipo="alerta">
            Você ainda não tem turmas. <Link to="/app/turmas">Crie uma turma</Link> primeiro.
          </AlertBanner>
        ))}
      {destino === 'PUBLICO' && (
        <AlertBanner tipo="info">Será gerado um PIN e um link. Quem tiver o código responde com nome e e-mail; o resultado não é certificado.</AlertBanner>
      )}
      <div className="qz-grade-campos">
        <TextField rotulo="Disponível a partir de" type="datetime-local" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <TextField rotulo="Até" type="datetime-local" required value={fim} onChange={(e) => setFim(e.target.value)} />
      </div>
    </Dialog>
  )
}

function SecaoCabecalho({ prova, secaoId }: { prova: ProvaDetalhe; secaoId: string }) {
  const s = prova.secoes.find((x) => x.id === secaoId)
  if (!s) return null
  return (
    <h3 className="qz-prv-secao-titulo">
      {s.titulo}{' '}
      <span className="qz-suave qz-pequeno">
        {s.modo === 'SORTEIO' ? `· sorteio de ${s.sortear} por participante, peso ${s.peso}%` : ''}
        {s.notaMinima != null ? ` · nota mínima ${s.notaMinima}` : ''}
      </span>
    </h3>
  )
}

/** Corretores designados (lote 8): havendo designação, só eles corrigem (além do autor e da coordenação). */
function CorretoresDesignados({ prova }: { prova: ProvaDetalhe }) {
  const cliente = useQueryClient()
  const opcoes = useQuery({ queryKey: ['corretores'], queryFn: () => api<ProfessorOpcao[]>('/usuarios/corretores') })
  const [ids, setIds] = useState<string[]>(prova.corretoresIds ?? [])
  // Corretor desativado (ou com outro papel) não vem em /usuarios/corretores e a API o recusaria: sai ao salvar.
  const validos = new Set((opcoes.data ?? []).map((o) => o.id))
  const inativos = opcoes.data ? ids.filter((id) => !validos.has(id)).length : 0
  const salvar = useMutation({
    mutationFn: () => api(`/provas/${prova.id}/corretores`, { method: 'PUT', body: { usuarioIds: ids.filter((id) => validos.has(id)) } }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['prova', prova.id] }),
  })
  return (
    <Card>
      <h2>Corretores designados</h2>
      <p className="qz-suave qz-pequeno">
        Sem designação, qualquer corretor pode corrigir as dissertativas desta prova. Designando, só as pessoas marcadas (além
        de você e da coordenação) veem as correções dela.
      </p>
      {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
      {salvar.isSuccess && <AlertBanner tipo="sucesso">Designação salva.</AlertBanner>}
      <div className="qz-lista-selecao">
        {(opcoes.data ?? []).map((o) => (
          <label key={o.id} className="qz-linha">
            <input
              type="checkbox"
              checked={ids.includes(o.id)}
              onChange={() => setIds((x) => (x.includes(o.id) ? x.filter((y) => y !== o.id) : [...x, o.id]))}
            />
            {o.nome} <span className="qz-suave qz-pequeno">{ROTULO_PAPEL[o.papel]}</span>
          </label>
        ))}
      </div>
      {inativos > 0 && (
        <p className="qz-suave qz-pequeno">
          {inativos === 1 ? '1 pessoa designada não está mais ativa e sai' : `${inativos} pessoas designadas não estão mais ativas e saem`} da
          designação ao salvar.
        </p>
      )}
      <div>
        <Button variante="secundario" carregando={salvar.isPending} disabled={!opcoes.data} onClick={() => salvar.mutate()}>
          Salvar designação
        </Button>
      </div>
    </Card>
  )
}
