import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router'
import { api, baixar, mensagemDeErro } from '../../../api/cliente'
import {
  ROTULO_APROVACAO,
  type StatusAprovacao,
  ROTULO_NATUREZA,
  ROTULO_NOTA,
  type DesempenhoDisciplina,
  type Indicio,
  type RelatorioAluno,
  type RelatorioProva,
  type RelatorioTurma,
  type ResumoRelatorio,
  type Turma,
} from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { AlertBanner, BarChart, Button, Card, ColunasChart, DataTable, Icone, Metrica, StatusBadge } from '../../../design-system'
import { formatarDataHora, formatarDuracao, formatarNota, formatarPercentual, resumir } from '../../../util/formato'
import './relatorios.css'

type LinhaProva = ResumoRelatorio & { provaId: string; provaTitulo: string }

/** Filtro de período (pela data de envio da tentativa), guardado na URL: ?de=AAAA-MM-DD&ate=AAAA-MM-DD. */
function usePeriodo() {
  const [params, setParams] = useSearchParams()
  const de = params.get('de') ?? ''
  const ate = params.get('ate') ?? ''
  // Uma única navegação por mudança: duas chamadas seguidas partiriam da mesma URL e a segunda desfaria a primeira.
  const definir = (valores: Partial<Record<'de' | 'ate', string>>) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        for (const [campo, valor] of Object.entries(valores)) {
          if (valor) n.set(campo, valor)
          else n.delete(campo)
        }
        return n
      },
      { replace: true },
    )
  const consulta = new URLSearchParams()
  if (params.get('aplicacaoId')) consulta.set('aplicacaoId', params.get('aplicacaoId')!)
  if (de) consulta.set('de', de)
  if (ate) consulta.set('ate', ate)
  const qs = consulta.toString() ? `?${consulta.toString()}` : ''
  const filtro = (
    <div className="qz-barra-filtros rel-filtros qz-nao-imprimir">
      <Icone nome="calendario" className="rel-filtros__icone" />
      <label className="rel-filtros__campo">
        <span>De</span>
        <input type="date" className="qz-input" value={de} onChange={(e) => definir({ de: e.target.value })} aria-label="Período: data inicial" />
      </label>
      <label className="rel-filtros__campo">
        <span>até</span>
        <input type="date" className="qz-input" value={ate} onChange={(e) => definir({ ate: e.target.value })} aria-label="Período: data final" />
      </label>
      {de || ate ? (
        <Button
          variante="fantasma"
          onClick={() => definir({ de: '', ate: '' })}
        >
          Limpar período
        </Button>
      ) : (
        <span className="qz-suave qz-pequeno">Todo o período</span>
      )}
    </div>
  )
  return { qs, filtro, ativo: !!(de || ate) }
}

/** Excel, CSV e impressão (Imprimir → Salvar como PDF) — ADR-0044. */
function AcoesExportacao({ exportando, aoExportar }: { exportando: boolean; aoExportar: (f: 'csv' | 'xlsx') => void }) {
  return (
    <span className="qz-linha qz-nao-imprimir">
      <Button variante="secundario" carregando={exportando} onClick={() => aoExportar('xlsx')} aria-label="Exportar Excel">
        {!exportando && <Icone nome="download" />} Excel
      </Button>
      <Button variante="secundario" onClick={() => aoExportar('csv')} aria-label="Exportar CSV">
        <Icone nome="download" /> CSV
      </Button>
      <Button variante="secundario" onClick={() => window.print()}>
        <Icone nome="impressora" /> Imprimir / PDF
      </Button>
    </span>
  )
}

/** Indícios para revisão humana (ADR-0045) — nunca prova de fraude. */
function CartaoIndicios({ indicios }: { indicios: Indicio[] }) {
  return (
    <Card>
      <h2>Indícios para revisão ({indicios.length})</h2>
      <p className="qz-suave rel-subtitulo">
        Sinais automáticos que merecem um olhar do professor: envio muito rápido, saídas da aba, troca de dispositivo e erros
        idênticos entre participantes. <strong>Não são prova de fraude</strong> — confira a correção e converse antes de qualquer
        decisão.
      </p>
      <DataTable
        rotulo="Indícios para revisão"
        chaveLinha={(i) => i.notaId}
        linhas={indicios}
        colunas={[
          { chave: 'n', titulo: 'Participante', render: (i) => <Link to={`/app/correcoes/${i.notaId}`}>{i.nome}</Link> },
          {
            chave: 'm',
            titulo: 'Sinais',
            render: (i) => (
              <ul className="rel-sinais">
                {i.motivos.map((m, k) => (
                  <li key={k}>{m.descricao}</li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </Card>
  )
}

function TabelaDisciplinas({ linhas }: { linhas: DesempenhoDisciplina[] }) {
  return (
    <DataTable
      rotulo="Desempenho por disciplina"
      chaveLinha={(d) => d.disciplina}
      linhas={linhas}
      vazio="Sem questões corrigidas no período."
      colunas={[
        { chave: 'd', titulo: 'Disciplina', render: (d) => d.disciplina },
        { chave: 't', titulo: 'Acerto médio', render: (d) => <strong>{formatarPercentual(d.taxaAcerto)}</strong> },
        { chave: 'q', titulo: 'Respostas corrigidas', render: (d) => d.questoesCorrigidas },
        { chave: 'p', titulo: 'Participantes', render: (d) => d.participantes },
      ]}
    />
  )
}

/** Nota média de cada turma (até 12), pelo relatório da turma. */
function useMediasPorTurma(turmas: Turma[] | undefined, qs = '') {
  const consultas = useQueries({
    queries: (turmas ?? []).slice(0, 12).map((t) => ({
      queryKey: ['relatorio', 'turma', t.id, qs],
      queryFn: () => api<RelatorioTurma>(`/relatorios/turmas/${t.id}${qs}`),
    })),
  })
  const porTurma = new Map(consultas.flatMap((c) => (c.data ? [[c.data.turmaId, c.data.resumo.media] as const] : [])))
  const dados = consultas.flatMap((c) => (c.data?.resumo.media != null ? [{ rotulo: c.data.turmaNome, valor: c.data.resumo.media }] : []))
  return { dados, porTurma, carregando: consultas.some((c) => c.isPending) }
}

const indiceMaior = (valores: number[]) => valores.reduce((m, v, i) => (v > valores[m]! ? i : m), 0)

/** Soma as distribuições de várias provas (mesmas faixas). */
function somarDistribuicoes(linhas: ResumoRelatorio[]) {
  const total = new Map<string, number>()
  for (const l of linhas) for (const d of l.distribuicao) total.set(d.faixa, (total.get(d.faixa) ?? 0) + d.quantidade)
  return [...total].map(([rotulo, valor]) => ({ rotulo, valor }))
}

function CartaoDistribuicao({ dados, subtitulo }: { dados: { rotulo: string; valor: number }[]; subtitulo?: string }) {
  const total = dados.reduce((s, d) => s + d.valor, 0)
  const maior = dados[indiceMaior(dados.map((d) => d.valor))]
  return (
    <Card>
      <h2>Distribuição das notas</h2>
      <p className="qz-suave rel-subtitulo">{subtitulo ?? `${total} nota(s) corrigida(s)`}</p>
      {total ? (
        <>
          <BarChart rotuloAcessivel="Distribuição das notas" dados={dados} />
          {maior && <p className="qz-suave qz-pequeno rel-rodape">Maior concentração na faixa de {maior.rotulo}.</p>}
        </>
      ) : (
        <p className="qz-suave">Nenhuma nota corrigida no período.</p>
      )}
    </Card>
  )
}

/** RF09 — Relatórios de desempenho. */
export function Relatorios() {
  const { qs, filtro } = usePeriodo()
  const provas = useQuery({ queryKey: ['relatorios', 'provas', qs], queryFn: () => api<LinhaProva[]>(`/relatorios/provas${qs}`) })
  const disciplinas = useQuery({
    queryKey: ['relatorios', 'disciplinas', qs],
    queryFn: () => api<{ participantes: number; disciplinas: DesempenhoDisciplina[] }>(`/relatorios/disciplinas${qs}`),
  })
  const turmas = useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/turmas') })
  const medias = useMediasPorTurma(turmas.data, qs)

  const linhas = provas.data ?? []
  const consolidadas = linhas.reduce((s, p) => s + p.consolidadas, 0)
  const somaMedias = linhas.reduce((s, p) => s + (p.media ?? 0) * p.consolidadas, 0)
  const listaDisc = disciplinas.data?.disciplinas ?? []
  const corrigidas = listaDisc.reduce((s, d) => s + d.questoesCorrigidas, 0)
  const acerto = corrigidas ? listaDisc.reduce((s, d) => s + d.taxaAcerto * d.questoesCorrigidas, 0) / corrigidas : null
  const carregandoResumo = provas.isPending

  return (
    <>
      <CabecalhoPagina
        titulo="Relatórios"
        descricao="Desempenho por prova, disciplina, turma e aluno. Considera a última tentativa de cada participante."
      />
      {filtro}
      <div className="qz-pilha">
        {provas.error && <AlertBanner tipo="erro">{mensagemDeErro(provas.error)}</AlertBanner>}
        <div className="qz-metricas">
          <Metrica rotulo="Nota média" icone="grafico" valor={carregandoResumo ? '…' : formatarNota(consolidadas ? somaMedias / consolidadas : null)} detalhe={`${consolidadas} nota(s) corrigida(s)`} />
          <Metrica
            rotulo="Participações"
            icone="usuarios"
            valor={carregandoResumo ? '…' : linhas.reduce((s, p) => s + p.participantes, 0)}
            detalhe={`em ${linhas.length} prova(s)`}
          />
          <Metrica rotulo="Acerto médio" icone="alvo" valor={disciplinas.isPending ? '…' : formatarPercentual(acerto)} detalhe="nas questões corrigidas" />
          <Metrica
            rotulo="Aguardando correção"
            icone="check-duplo"
            tom="alerta"
            valor={carregandoResumo ? '…' : linhas.reduce((s, p) => s + p.pendentes, 0)}
            detalhe="tentativas com questões abertas"
            para="/app/correcoes"
          />
        </div>
        <div className="rel-grade">
          <Card>
            <h2>Nota média por turma</h2>
            <p className="qz-suave rel-subtitulo">Avaliações corrigidas no período</p>
            {medias.carregando ? (
              <p className="qz-suave">Carregando…</p>
            ) : medias.dados.length ? (
              <ColunasChart
                rotuloAcessivel="Nota média por turma"
                legenda="Nota média · escala de 0 a 10"
                maximo={10}
                destaque={indiceMaior(medias.dados.map((d) => d.valor))}
                formatarValor={formatarNota}
                dados={medias.dados}
              />
            ) : (
              <p className="qz-suave">Nenhuma turma com provas corrigidas no período.</p>
            )}
          </Card>
          <CartaoDistribuicao dados={somarDistribuicoes(linhas)} subtitulo={`${consolidadas} nota(s) corrigida(s) · todas as provas`} />
        </div>
        <Card>
          <h2>Resultados por avaliação</h2>
          <DataTable
            rotulo="Provas"
            carregando={provas.isPending}
            linhas={linhas}
            chaveLinha={(p) => p.provaId}
            vazio="Nenhuma prova com tentativas enviadas ainda."
            colunas={[
              {
                chave: 'p',
                titulo: 'Avaliação',
                render: (p) => (
                  <Link to={`/app/relatorios/provas/${p.provaId}${qs}`} className="rel-link-forte">
                    {p.provaTitulo}
                  </Link>
                ),
              },
              {
                chave: 'part',
                titulo: 'Participantes',
                render: (p) => (
                  <>
                    {p.participantes}
                    {p.pendentes > 0 && <span className="qz-tabela__sub">{p.pendentes} aguardando correção</span>}
                  </>
                ),
              },
              { chave: 'media', titulo: 'Média', render: (p) => formatarNota(p.media) },
              { chave: 'aprov', titulo: 'Aprovação', render: (p) => formatarPercentual(p.taxaAprovacao) },
              {
                chave: 'estado',
                titulo: 'Estado',
                render: (p) =>
                  p.pendentes > 0 ? <StatusBadge status="PENDENTE" tom="info" rotulo="Em correção" /> : <StatusBadge status="CONCLUIDA" rotulo="Concluída" />,
              },
            ]}
          />
        </Card>
        <div className="rel-grade">
          <Card>
            <h2>Por disciplina</h2>
            {disciplinas.error && <AlertBanner tipo="erro">{mensagemDeErro(disciplinas.error)}</AlertBanner>}
            <TabelaDisciplinas linhas={listaDisc} />
          </Card>
          <Card>
            <h2>Por turma</h2>
            <p className="qz-suave rel-subtitulo">Na turma, clique no nome de um aluno para ver o desempenho individual.</p>
            <DataTable
              rotulo="Turmas"
              carregando={turmas.isPending}
              linhas={turmas.data ?? []}
              chaveLinha={(t) => t.id}
              vazio="Nenhuma turma."
              colunas={[
                {
                  chave: 't',
                  titulo: 'Turma',
                  render: (t) => (
                    <>
                      <Link to={`/app/relatorios/turmas/${t.id}${qs}`} className="rel-link-forte">
                        {t.nome}
                      </Link>
                      <span className="qz-tabela__sub">{t.professorNome}</span>
                    </>
                  ),
                },
                { chave: 'a', titulo: 'Alunos', render: (t) => t.totalAlunos },
                { chave: 'm', titulo: 'Média', render: (t) => formatarNota(medias.porTurma.get(t.id)) },
              ]}
            />
          </Card>
        </div>
      </div>
    </>
  )
}

function Metricas({ r, rotuloParticipantes = 'Participantes' }: { r: ResumoRelatorio; rotuloParticipantes?: string }) {
  return (
    <div className="qz-metricas">
      <Metrica
        rotulo="Média"
        icone="grafico"
        valor={formatarNota(r.media)}
        detalhe={`Mediana ${formatarNota(r.mediana)} · menor / maior ${formatarNota(r.minima)} / ${formatarNota(r.maxima)}`}
      />
      <Metrica rotulo={rotuloParticipantes} icone="usuarios" valor={r.participantes} detalhe={`Tempo médio ${formatarDuracao(r.tempoMedioMin)}`} />
      <Metrica rotulo="Aprovação" icone="tendencia" tom="sucesso" valor={formatarPercentual(r.taxaAprovacao)} detalhe={`${r.aprovados} aprovado(s)`} />
      <Metrica rotulo="Aguardando correção" icone="check-duplo" tom="alerta" valor={r.pendentes} detalhe={`${r.consolidadas} corrigida(s)`} />
    </div>
  )
}

function Resultado({ status }: { status: StatusAprovacao | null | undefined }) {
  return status ? <StatusBadge status={status} rotulo={ROTULO_APROVACAO[status]} /> : <>—</>
}

/** Rótulos curtos e distintos para as colunas (o gráfico usa o rótulo como chave). */
function rotulosUnicos(titulos: string[], max = 16) {
  const vistos = new Map<string, number>()
  return titulos.map((t) => {
    const base = resumir(t, max)
    const n = (vistos.get(base) ?? 0) + 1
    vistos.set(base, n)
    return n > 1 ? `${base} (${n})` : base
  })
}

function CartaoMediaPorProva({ r }: { r: RelatorioTurma }) {
  const medias = r.provas.map((p) => {
    const notas = r.alunos.map((a) => a.notas[p.id]).filter((n): n is number => n != null)
    return notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null
  })
  const rotulos = rotulosUnicos(r.provas.map((p) => p.titulo))
  const dados = r.provas.flatMap((_, i) => (medias[i] != null ? [{ rotulo: rotulos[i]!, valor: medias[i] }] : []))
  return (
    <Card>
      <h2>Nota média por prova</h2>
      <p className="qz-suave rel-subtitulo">Alunos da turma com prova corrigida</p>
      {dados.length > 6 ? (
        <BarChart rotuloAcessivel="Nota média por prova" maximo={10} formatarValor={formatarNota} dados={dados} />
      ) : dados.length ? (
        <ColunasChart
          rotuloAcessivel="Nota média por prova"
          legenda="Nota média · escala de 0 a 10"
          maximo={10}
          destaque={indiceMaior(dados.map((d) => d.valor))}
          formatarValor={formatarNota}
          dados={dados}
        />
      ) : (
        <p className="qz-suave">Nenhuma prova corrigida no período.</p>
      )}
    </Card>
  )
}

function CartaoEvolucao({ provas }: { provas: RelatorioAluno['provas'] }) {
  const corrigidas = provas.filter((p) => p.status === 'CONSOLIDADA' && p.nota != null)
  const rotulos = rotulosUnicos(corrigidas.map((p) => p.provaTitulo))
  return (
    <Card>
      <h2>Evolução</h2>
      <p className="qz-suave rel-subtitulo">Nota de cada prova corrigida, em ordem de envio</p>
      {corrigidas.length > 16 ? (
        <BarChart
          rotuloAcessivel="Nota por prova, em ordem de envio"
          maximo={10}
          formatarValor={formatarNota}
          dados={corrigidas.map((p, i) => ({ rotulo: rotulos[i]!, valor: p.nota ?? 0 }))}
        />
      ) : corrigidas.length ? (
        <ColunasChart
          rotuloAcessivel="Nota por prova, em ordem de envio"
          legenda="Nota · escala de 0 a 10"
          maximo={10}
          destaque={corrigidas.length - 1}
          formatarValor={formatarNota}
          dados={corrigidas.map((p, i) => ({ rotulo: rotulos[i]!, valor: p.nota ?? 0 }))}
        />
      ) : (
        <p className="qz-suave">Nenhuma prova corrigida no período.</p>
      )}
    </Card>
  )
}

export function RelatorioDeProva() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { qs: filtro, filtro: campos } = usePeriodo()
  const consulta = useQuery({ queryKey: ['relatorio', 'prova', id, filtro], queryFn: () => api<RelatorioProva>(`/relatorios/provas/${id}${filtro}`) })
  const exportar = useMutation({
    mutationFn: (formato: 'csv' | 'xlsx') => baixar(`/relatorios/provas/${id}/${formato}${filtro}`, `relatorio-${id?.slice(0, 8)}.${formato}`),
  })

  return (
    <EstadoConsulta consulta={consulta}>
      {(r) => (
        <>
          <CabecalhoPagina
            voltar={{ para: '/app/relatorios', rotulo: 'Voltar para relatórios' }}
            titulo={r.provaTitulo}
            descricao={params.get('aplicacaoId') ? 'Filtrado por uma aplicação' : 'Todas as aplicações'}
            acoes={<AcoesExportacao exportando={exportar.isPending} aoExportar={(f) => exportar.mutate(f)} />}
          />
          {campos}
          {exportar.error && <AlertBanner tipo="erro">{mensagemDeErro(exportar.error)}</AlertBanner>}
          <div className="qz-pilha">
            <Metricas r={r.resumo} />
            {r.indicios.length > 0 && <CartaoIndicios indicios={r.indicios} />}
            <div className="rel-grade">
              <CartaoDistribuicao dados={r.resumo.distribuicao.map((d) => ({ rotulo: d.faixa, valor: d.quantidade }))} />
              <Card>
                <h2>Taxa de acerto por questão</h2>
                <p className="qz-suave rel-subtitulo">Média da fração obtida nas tentativas corrigidas</p>
                <BarChart
                  rotuloAcessivel="Taxa de acerto por questão"
                  maximo={100}
                  formatarValor={(v) => `${Math.round(v)}%`}
                  dados={r.questoes.map((q) => ({ rotulo: `Q${q.ordem}${q.anulada ? '*' : ''}`, valor: q.taxaAcerto ?? 0 }))}
                />
                {r.questoes.some((q) => q.anulada) && <p className="qz-suave qz-pequeno rel-rodape">* questão anulada</p>}
              </Card>
            </div>
            <Card>
              <h2>Questões</h2>
              <DataTable
                rotulo="Questões"
                chaveLinha={(q) => q.versaoQuestaoId}
                linhas={r.questoes}
                colunas={[
                  { chave: 'o', titulo: '#', render: (q) => q.ordem, largura: '48px' },
                  { chave: 'e', titulo: 'Enunciado', render: (q) => <span className="rel-enunciado">{resumir(q.enunciado, 100)}</span> },
                  { chave: 'n', titulo: 'Natureza', render: (q) => ROTULO_NATUREZA[q.natureza] },
                  { chave: 'p', titulo: 'Peso', render: (q) => `${q.peso}%` },
                  {
                    chave: 't',
                    titulo: 'Acerto',
                    render: (q) => (q.anulada ? <StatusBadge status="ANULADA" tom="neutro" rotulo="Anulada" /> : <strong>{formatarPercentual(q.taxaAcerto)}</strong>),
                  },
                ]}
              />
            </Card>
            {r.disciplinas.length > 1 && (
              <Card>
                <h2>Por disciplina</h2>
                <TabelaDisciplinas linhas={r.disciplinas} />
              </Card>
            )}
            <Card>
              <h2>Participantes</h2>
              <DataTable
                rotulo="Participantes"
                chaveLinha={(p) => p.notaId}
                linhas={r.participantes}
                vazio="Nenhum envio ainda."
                colunas={[
                  {
                    chave: 'n',
                    titulo: 'Nome',
                    render: (p) => (
                      <>
                        <Link to={`/app/correcoes/${p.notaId}`} className="rel-link-forte">
                          {p.nome}
                        </Link>
                        <span className="qz-tabela__sub">{p.email}</span>
                      </>
                    ),
                  },
                  { chave: 's', titulo: 'Situação', render: (p) => <StatusBadge status={p.status} rotulo={ROTULO_NOTA[p.status]} /> },
                  { chave: 'nota', titulo: 'Nota', render: (p) => formatarNota(p.nota) },
                  { chave: 'r', titulo: 'Resultado', render: (p) => <Resultado status={p.statusAprovacao} /> },
                  { chave: 'd', titulo: 'Duração', render: (p) => formatarDuracao(p.duracaoMin) },
                  { chave: 'f', titulo: 'Envio', render: (p) => formatarDataHora(p.fimEm) },
                ]}
              />
            </Card>
          </div>
        </>
      )}
    </EstadoConsulta>
  )
}

export function RelatorioDeTurma() {
  const { id } = useParams()
  const { qs, filtro } = usePeriodo()
  const consulta = useQuery({ queryKey: ['relatorio', 'turma', id, qs], queryFn: () => api<RelatorioTurma>(`/relatorios/turmas/${id}${qs}`) })
  const exportar = useMutation({
    mutationFn: (formato: 'csv' | 'xlsx') => baixar(`/relatorios/turmas/${id}/${formato}${qs}`, `turma-${id?.slice(0, 8)}.${formato}`),
  })
  return (
    <EstadoConsulta consulta={consulta}>
      {(r) => (
        <>
          <CabecalhoPagina
            voltar={{ para: '/app/relatorios', rotulo: 'Voltar para relatórios' }}
            titulo={`Turma ${r.turmaNome}`}
            acoes={<AcoesExportacao exportando={exportar.isPending} aoExportar={(f) => exportar.mutate(f)} />}
          />
          {exportar.error && <AlertBanner tipo="erro">{mensagemDeErro(exportar.error)}</AlertBanner>}
          {filtro}
          <div className="qz-pilha">
            <Metricas r={r.resumo} />
            <div className="rel-grade">
              <CartaoMediaPorProva r={r} />
              <CartaoDistribuicao dados={r.resumo.distribuicao.map((d) => ({ rotulo: d.faixa, valor: d.quantidade }))} />
            </div>
            <Card>
              <h2>Desempenho por aluno</h2>
              <p className="qz-suave rel-subtitulo">Clique no nome de um aluno para ver o desempenho individual.</p>
              <DataTable
                rotulo="Desempenho por aluno"
                chaveLinha={(a) => a.alunoId}
                linhas={r.alunos}
                vazio="Turma sem alunos."
                colunas={[
                  {
                    chave: 'n',
                    titulo: 'Aluno',
                    render: (a) => (
                      <>
                        <Link to={`/app/relatorios/alunos/${a.alunoId}${qs}`} className="rel-link-forte">
                          {a.nome}
                        </Link>
                        {a.matricula && <span className="qz-tabela__sub">Matrícula {a.matricula}</span>}
                      </>
                    ),
                  },
                  ...r.provas.map((p) => ({ chave: p.id, titulo: resumir(p.titulo, 28), render: (a: RelatorioTurma['alunos'][number]) => formatarNota(a.notas[p.id]) })),
                  { chave: 'm', titulo: 'Média', render: (a) => <strong>{formatarNota(a.media)}</strong> },
                ]}
              />
            </Card>
            {r.disciplinas.length > 0 && (
              <Card>
                <h2>Por disciplina</h2>
                <TabelaDisciplinas linhas={r.disciplinas} />
              </Card>
            )}
          </div>
        </>
      )}
    </EstadoConsulta>
  )
}

/** RF09 — desempenho de um aluno: provas no tempo e por disciplina. */
export function RelatorioDeAluno() {
  const { id } = useParams()
  const { qs, filtro } = usePeriodo()
  const consulta = useQuery({ queryKey: ['relatorio', 'aluno', id, qs], queryFn: () => api<RelatorioAluno>(`/relatorios/alunos/${id}${qs}`) })
  return (
    <EstadoConsulta consulta={consulta}>
      {(r) => (
        <>
          <CabecalhoPagina
            voltar={{ para: '/app/relatorios', rotulo: 'Voltar para relatórios' }}
            titulo={r.nome}
            descricao={`Média ${formatarNota(r.media)} · ${r.provas.length} prova(s) nas suas turmas e provas`}
          />
          {filtro}
          <div className="qz-pilha">
            <Metricas r={r.resumo} rotuloParticipantes="Provas enviadas" />
            <CartaoEvolucao provas={r.provas} />
            <Card>
              <h2>Provas</h2>
              <DataTable
                rotulo="Provas do aluno"
                chaveLinha={(p) => p.notaId}
                linhas={r.provas}
                vazio="Nenhuma prova no período."
                colunas={[
                  { chave: 'p', titulo: 'Prova', render: (p) => <Link to={`/app/correcoes/${p.notaId}`}>{p.provaTitulo}</Link> },
                  { chave: 's', titulo: 'Situação', render: (p) => <StatusBadge status={p.status} rotulo={ROTULO_NOTA[p.status]} /> },
                  { chave: 'n', titulo: 'Nota', render: (p) => formatarNota(p.nota) },
                  { chave: 'r', titulo: 'Resultado', render: (p) => <Resultado status={p.statusAprovacao} /> },
                  { chave: 'f', titulo: 'Envio', render: (p) => formatarDataHora(p.fimEm) },
                ]}
              />
            </Card>
            <Card>
              <h2>Por disciplina</h2>
              <TabelaDisciplinas linhas={r.disciplinas} />
            </Card>
          </div>
        </>
      )}
    </EstadoConsulta>
  )
}
