import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { api } from '../../api/cliente'
import {
  ROTULO_PAPEL,
  type AplicacaoResumo,
  type Notificacao,
  type Pagina,
  type PendenteCorrecao,
  type ProvaResumo,
  type QuestaoResumo,
  type Recurso,
  type RelatorioTurma,
  type SituacaoJanela,
  type Turma,
} from '../../api/tipos'
import { PAPEIS_AUTORIA } from '../../auth/papeis'
import { useAuth } from '../../auth/contexto'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { AlertBanner, Card, ColunasChart, DataTable, Icone, Metrica, StatusBadge, type NomeIcone, type TomStatus } from '../../design-system'
import { formatarDataHora, formatarNota } from '../../util/formato'
import './painel.css'

function saudacao(agora = new Date()) {
  const h = agora.getHours()
  return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'
}

const ESTADO_APLICACAO: Record<SituacaoJanela, { rotulo: string; tom: TomStatus }> = {
  AGENDADA: { rotulo: 'Agendada', tom: 'alerta' },
  DISPONIVEL: { rotulo: 'Em andamento', tom: 'info' },
  ENCERRADA: { rotulo: 'Concluída', tom: 'sucesso' },
}

const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const horaMin = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "05 out · 08h" (ou "08h30" quando há minutos). */
function dataAplicacao(iso: string) {
  const d = new Date(iso)
  const [h, m] = horaMin.format(d).split(':')
  return `${diaMes.format(d).replace('.', '')} · ${h}h${m === '00' ? '' : m}`
}

/** "há 22 minutos", "hoje, às 07h45", "ontem, às 16h10" ou data completa. */
function quando(iso: string, agora = new Date()) {
  const d = new Date(iso)
  const min = Math.floor((agora.getTime() - d.getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} minuto${min === 1 ? '' : 's'}`
  const hora = horaMin.format(d).replace(':', 'h')
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (d.toDateString() === agora.toDateString()) return `hoje, às ${hora}`
  if (d.toDateString() === ontem.toDateString()) return `ontem, às ${hora}`
  return formatarDataHora(iso)
}

const ICONE_NOTIFICACAO: Record<string, NomeIcone> = {
  PROVA_DISPONIVEL: 'calendario',
  RESULTADO_PUBLICADO: 'check-circulo',
  RECURSO_ABERTO: 'mensagem',
  RECURSO_DECIDIDO: 'mensagem',
  NOTA_REPROCESSADA: 'grafico',
  CORRECAO_ARBITRAGEM: 'check-duplo',
  CONTA_BLOQUEADA: 'escudo',
  MFA_RECUPERACAO_USADA: 'escudo',
  LGPD_SOLICITACAO: 'documentos',
}

/** Nota média de cada turma (até 12), pelo relatório da turma (mesma chave de cache dos relatórios). */
function useMediasPorTurma(turmas: Turma[] | undefined) {
  const consultas = useQueries({
    queries: (turmas ?? []).slice(0, 12).map((t) => ({
      queryKey: ['relatorio', 'turma', t.id, ''],
      queryFn: () => api<RelatorioTurma>(`/relatorios/turmas/${t.id}`),
    })),
  })
  const dados = consultas.flatMap((c) => (c.data?.resumo.media != null ? [{ rotulo: c.data.turmaNome, valor: c.data.resumo.media }] : []))
  return { dados, carregando: consultas.some((c) => c.isPending) }
}

export function PainelProfissional() {
  const { usuario } = useAuth()
  const autoria = !!usuario && PAPEIS_AUTORIA.includes(usuario.papel)
  const revisao = useQuery({
    queryKey: ['questoes', 'revisao-painel'],
    queryFn: () => api<Pagina<QuestaoResumo>>('/questoes?escopo=revisao&tamanho=1'),
    enabled: autoria,
  })
  const questoes = useQuery({
    queryKey: ['questoes', 'total-painel'],
    queryFn: () => api<Pagina<QuestaoResumo>>('/questoes?tamanho=1'),
    enabled: autoria,
  })
  const provas = useQuery({ queryKey: ['provas', 'painel'], queryFn: () => api<ProvaResumo[]>('/provas'), enabled: autoria })
  const turmas = useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/turmas'), enabled: autoria })
  const correcoes = useQuery({ queryKey: ['correcao', 'pendentes'], queryFn: () => api<PendenteCorrecao[]>('/correcao/pendentes') })
  const recursos = useQuery({ queryKey: ['recursos'], queryFn: () => api<Recurso[]>('/recursos'), enabled: autoria })
  const aplicacoes = useQuery({ queryKey: ['aplicacoes', 'todas'], queryFn: () => api<AplicacaoResumo[]>('/aplicacoes'), enabled: autoria })
  const notificacoes = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => api<{ naoLidas: number; itens: Notificacao[] }>('/notificacoes'),
  })
  const medias = useMediasPorTurma(autoria ? turmas.data : undefined)
  if (!usuario) return null

  const disponiveis = aplicacoes.data?.filter((a) => a.situacao === 'DISPONIVEL').length
  const recursosPendentes = recursos.data?.filter((r) => r.status === 'ABERTO' || r.status === 'EM_ANALISE').length
  const alunos = turmas.data?.reduce((s, t) => s + t.totalAlunos, 0)
  const recentes = [...(aplicacoes.data ?? [])].sort((a, b) => b.janelaInicio.localeCompare(a.janelaInicio)).slice(0, 5)
  const atividades = (notificacoes.data?.itens ?? []).slice(0, 4)
  const maiorMedia = medias.dados.reduce((m, d, i, l) => (d.valor > l[m]!.valor ? i : m), 0)
  const falhou = [revisao, questoes, provas, turmas, correcoes, recursos, aplicacoes, notificacoes].some((c) => c.error)
  const plural = (n: number | undefined, um: string, varios: string) => (n == null ? '…' : `${n} ${n === 1 ? um : varios}`)

  return (
    <>
      <CabecalhoPagina
        titulo={`${saudacao()}, ${usuario.nome.split(' ')[0]}`}
        acoes={
          autoria && (
            <Link to="/app/provas/nova" className="qz-botao qz-botao--primario">
              <Icone nome="mais" /> Criar prova
            </Link>
          )
        }
      />
      {falhou && (
        <AlertBanner tipo="alerta">Parte dos dados do painel não pôde ser carregada. Recarregue a página em instantes.</AlertBanner>
      )}
      <div className="qz-metricas pnl-bloco">
        {autoria && (
          <>
            <Metrica
              rotulo="Provas publicadas"
              icone="documentos"
              valor={provas.data?.filter((p) => p.status === 'PUBLICADA').length ?? '…'}
              detalhe={`${plural(disponiveis, 'aplicação disponível', 'aplicações disponíveis')} agora`}
              para="/app/provas"
            />
            <Metrica
              rotulo="Questões cadastradas"
              icone="biblioteca"
              valor={questoes.data?.total ?? '…'}
              detalhe={`${plural(revisao.data?.total, 'aguardando', 'aguardando')} sua revisão`}
              para="/app/questoes"
            />
            <Metrica
              rotulo="Alunos nas turmas"
              icone="usuarios"
              valor={alunos ?? '…'}
              detalhe={plural(turmas.data?.length, 'turma', 'turmas')}
              para="/app/turmas"
            />
          </>
        )}
        <Metrica
          rotulo="Correções pendentes"
          icone="check-duplo"
          tom="alerta"
          valor={correcoes.data?.length ?? '…'}
          detalhe={autoria ? `${plural(recursosPendentes, 'recurso pendente', 'recursos pendentes')}` : 'tentativas aguardando correção'}
          para="/app/correcoes"
        />
      </div>

      {autoria && (
        <Card className="pnl-bloco">
          <div className="pnl-cartao-topo">
            <h2>Provas recentes</h2>
            <p className="qz-suave">Acompanhe da aplicação ao resultado.</p>
            <Link to="/app/aplicacoes" className="pnl-ver-todas">
              Ver todas as aplicações <Icone nome="seta-direita" tamanho={14} />
            </Link>
          </div>
          <DataTable
            rotulo="Provas recentes"
            carregando={aplicacoes.isPending}
            linhas={recentes}
            chaveLinha={(a) => a.id}
            vazio="Nenhuma prova aplicada ainda."
            colunas={[
              {
                chave: 'p',
                titulo: 'Prova',
                render: (a) => (
                  <>
                    <Link to={`/app/aplicacoes/${a.id}`} className="pnl-link-forte">
                      {a.provaTitulo}
                    </Link>
                    <span className="qz-tabela__sub">
                      {a.participantes} participante{a.participantes === 1 ? '' : 's'}
                      {a.emAndamento > 0 && ` · ${a.emAndamento} em andamento`}
                    </span>
                  </>
                ),
              },
              {
                chave: 't',
                titulo: 'Turma',
                render: (a) => a.turmaNome ?? (a.destinoTipo === 'PUBLICO' ? 'Público (PIN)' : 'Alunos avulsos'),
              },
              { chave: 'd', titulo: 'Aplicação', render: (a) => dataAplicacao(a.janelaInicio) },
              {
                chave: 'e',
                titulo: 'Estado',
                render: (a) => <StatusBadge status={a.situacao} rotulo={ESTADO_APLICACAO[a.situacao].rotulo} tom={ESTADO_APLICACAO[a.situacao].tom} />,
              },
            ]}
          />
        </Card>
      )}

      <div className="pnl-grade">
        <div className="qz-pilha">
          {autoria && (
            <Card>
              <h2>Desempenho por turma</h2>
              <p className="qz-suave pnl-subtitulo">Média das avaliações corrigidas em cada turma</p>
              {medias.carregando ? (
                <p className="qz-suave">Carregando…</p>
              ) : medias.dados.length ? (
                <ColunasChart
                  rotuloAcessivel="Nota média por turma"
                  legenda="Nota média · escala de 0 a 10"
                  maximo={10}
                  destaque={maiorMedia}
                  formatarValor={formatarNota}
                  dados={medias.dados}
                />
              ) : (
                <p className="qz-suave">Nenhuma turma com provas corrigidas ainda.</p>
              )}
            </Card>
          )}
          {autoria && (
            <Card>
              <h2>Fluxo de uma avaliação</h2>
              <ol className="qz-fluxo">
                <li>
                  <Link to="/app/questoes/nova">Cadastre questões</Link> e peça a revisão de um colega (dupla checagem).
                </li>
                <li>
                  <Link to="/app/turmas">Monte turmas</Link> — individualmente ou importando um CSV.
                </li>
                <li>
                  <Link to="/app/provas/nova">Crie uma prova</Link>, escolha questões publicadas, ajuste pesos e publique.
                </li>
                <li>Aplique a prova a uma turma ou ao público (PIN/link) e acompanhe em tempo real.</li>
                <li>
                  <Link to="/app/correcoes">Corrija as questões abertas</Link>, responda <Link to="/app/recursos">recursos</Link> e veja os{' '}
                  <Link to="/app/relatorios">relatórios</Link>.
                </li>
              </ol>
            </Card>
          )}
        </div>
        <div className="qz-pilha">
          <Card>
            <h2>Atividades recentes</h2>
            {notificacoes.isPending ? (
              <p className="qz-suave">Carregando…</p>
            ) : atividades.length ? (
              <ul className="pnl-atividades">
                {atividades.map((n) => {
                  const titulo = n.link ? <Link to={n.link}>{n.titulo}</Link> : n.titulo
                  return (
                    <li key={n.id}>
                      <span className="pnl-atividades__icone">
                        <Icone nome={ICONE_NOTIFICACAO[n.tipo] ?? 'sino'} />
                      </span>
                      <span>
                        <strong className="pnl-atividades__titulo">{titulo}</strong>
                        <span className="pnl-atividades__meta">
                          {n.mensagem} · {quando(n.criadoEm)}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="qz-suave">Nenhuma atividade recente.</p>
            )}
          </Card>
          <Card>
            <h2>Sua conta</h2>
            <p className="pnl-conta">
              {usuario.email}
              <span className="qz-suave">Ambiente profissional · {ROTULO_PAPEL[usuario.papel]}</span>
            </p>
            <StatusBadge
              status={usuario.mfaHabilitado ? 'ATIVO' : 'INATIVO'}
              rotulo={usuario.mfaHabilitado ? 'Verificação em 2 etapas ativa' : 'Sem verificação em 2 etapas'}
            />
          </Card>
        </div>
      </div>
    </>
  )
}
