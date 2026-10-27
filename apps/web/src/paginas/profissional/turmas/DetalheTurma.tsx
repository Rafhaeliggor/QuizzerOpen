import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { api, mensagemDeErro, salvarArquivo } from '../../../api/cliente'
import type { AlunoResumo, ProfessorOpcao, RelatorioImportacao, RelatorioTurma, Turma, TurmaDetalhe } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, DataTable, Dialog, Icone, SelectField, StatusBadge, Tabs, TextField } from '../../../design-system'
import { formatarData, formatarDataHora, formatarNota } from '../../../util/formato'
import { lerCsvSimples } from './csv'
import { useAuth } from '../../../auth/contexto'
import { ehGestor } from '../../../auth/papeis'
import { CampoResponsavel } from './CampoResponsavel'
import './turmas.css'

type Aba = 'alunos' | 'avaliacoes' | 'professores' | 'dados'
type Painel = 'adicionar' | 'importar' | null

export function DetalheTurma() {
  const { id } = useParams()
  const cliente = useQueryClient()
  const consulta = useQuery({ queryKey: ['turma', id], queryFn: () => api<TurmaDetalhe>(`/turmas/${id}`) })
  // Participação e média por aluno vêm do relatório da turma; se falhar, a tabela mostra "—".
  const relatorio = useQuery({
    queryKey: ['relatorio', 'turma', id, ''],
    queryFn: () => api<RelatorioTurma>(`/relatorios/turmas/${id}`),
    retry: false,
  })
  const [aba, setAba] = useState<Aba>('alunos')
  const [painel, setPainel] = useState<Painel>(null)
  const [busca, setBusca] = useState('')
  const [removendo, setRemovendo] = useState<AlunoResumo | null>(null)
  const [transferindo, setTransferindo] = useState<AlunoResumo | null>(null)
  const atualizar = () => {
    void cliente.invalidateQueries({ queryKey: ['turma', id] })
    void cliente.invalidateQueries({ queryKey: ['turmas'] })
    void cliente.invalidateQueries({ queryKey: ['relatorio', 'turma', id] })
  }
  const remover = useMutation({
    mutationFn: (alunoId: string) => api(`/turmas/${id}/alunos/${alunoId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setRemovendo(null)
      atualizar()
    },
  })
  const abrirPainel = (p: Painel) => {
    setAba('alunos')
    setPainel(p)
  }

  const desempenho = new Map((relatorio.data?.alunos ?? []).map((a) => [a.alunoId, a]))
  const totalAvaliacoes = relatorio.data?.provas.length

  return (
    <EstadoConsulta consulta={consulta}>
      {(t) => {
        const termo = busca.trim().toLowerCase()
        const alunos = termo
          ? t.alunos.filter((a) => [a.nome, a.email, a.matricula ?? ''].some((v) => v.toLowerCase().includes(termo)))
          : t.alunos
        return (
          <>
            <CabecalhoPagina
              voltar={{ para: '/app/turmas', rotulo: 'Voltar para turmas' }}
              titulo={t.nome}
              descricao={`${formatarData(t.periodoInicio)} a ${formatarData(t.periodoFim)} · Responsável: ${t.professorNome}${t.coProfessores.length ? ` + ${t.coProfessores.length} professor(es)` : ''}`}
              acoes={
                <>
                  <Link to={`/app/relatorios/turmas/${t.id}`} className="qz-botao qz-botao--secundario">
                    <Icone nome="grafico" /> Relatório da turma
                  </Link>
                  {t.podeGerirProfessores && (
                    <Button variante="secundario" onClick={() => setAba('dados')}>
                      <Icone nome="lapis" /> Editar turma
                    </Button>
                  )}
                  <Button onClick={() => abrirPainel('adicionar')}>
                    <Icone nome="usuario-mais" /> Adicionar aluno
                  </Button>
                </>
              }
            />
            <Tabs<Aba>
              rotulo="Seções da turma"
              ativa={aba}
              aoMudar={setAba}
              abas={[
                { valor: 'alunos', rotulo: 'Alunos', contador: t.alunos.length },
                { valor: 'avaliacoes', rotulo: 'Avaliações', contador: totalAvaliacoes },
                { valor: 'professores', rotulo: 'Professores', contador: 1 + t.coProfessores.length },
                { valor: 'dados', rotulo: 'Dados da turma' },
              ]}
            />
            {aba === 'alunos' && (
              <div className="qz-pilha">
                {painel === 'adicionar' && <AdicionarAluno turmaId={t.id} aoAdicionar={atualizar} aoFechar={() => setPainel(null)} />}
                {painel === 'importar' && <ImportarCsv turmaId={t.id} aoImportar={atualizar} aoFechar={() => setPainel(null)} />}
                <Card>
                  <div className="qz-barra-filtros qz-trm-barra">
                    <label className="qz-busca">
                      <Icone nome="busca" />
                      <input
                        type="search"
                        placeholder="Buscar aluno por nome, e-mail ou matrícula"
                        aria-label="Buscar aluno"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                      />
                    </label>
                    <Button variante="secundario" onClick={() => abrirPainel('importar')}>
                      <Icone nome="upload" /> Importar alunos
                    </Button>
                  </div>
                  <DataTable
                    rotulo="Alunos matriculados"
                    chaveLinha={(a) => a.id}
                    linhas={alunos}
                    vazio={termo ? 'Nenhum aluno encontrado.' : 'Nenhum aluno matriculado. Use “Adicionar aluno” ou “Importar alunos”.'}
                    colunas={[
                      {
                        chave: 'nome',
                        titulo: 'Aluno',
                        render: (a) => (
                          <>
                            <Link to={`/app/relatorios/alunos/${a.id}`}>{a.nome}</Link>
                            <span className="qz-tabela__sub">{a.email}</span>
                          </>
                        ),
                      },
                      { chave: 'matricula', titulo: 'Matrícula', render: (a) => a.matricula ?? '—' },
                      {
                        chave: 'participacao',
                        titulo: 'Participação',
                        render: (a) => {
                          const d = desempenho.get(a.id)
                          return d && totalAvaliacoes != null ? `${d.provasRealizadas} de ${totalAvaliacoes} ${totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}` : '—'
                        },
                      },
                      { chave: 'media', titulo: 'Média', render: (a) => formatarNota(desempenho.get(a.id)?.media) },
                      { chave: 'desde', titulo: 'Na turma desde', render: (a) => formatarDataHora(a.dataVinculo) },
                      {
                        chave: 'acoes',
                        titulo: 'Ações',
                        render: (a) => (
                          <span className="qz-trm-acoes">
                            <Button variante="fantasma" onClick={() => setTransferindo(a)}>
                              Transferir
                            </Button>
                            <Button variante="fantasma" onClick={() => setRemovendo(a)}>
                              Remover
                            </Button>
                          </span>
                        ),
                      },
                    ]}
                  />
                  {termo && t.alunos.length > 0 && (
                    <p className="qz-trm-rodape">
                      {alunos.length} de {t.alunos.length} alunos
                    </p>
                  )}
                </Card>
              </div>
            )}
            {aba === 'avaliacoes' && <AvaliacoesTurma relatorio={relatorio} />}
            {aba === 'professores' && <Professores turma={t} aoSalvar={atualizar} />}
            {aba === 'dados' && <DadosTurma turma={t} aoSalvar={atualizar} />}
            {transferindo && (
              <DialogTransferir
                turma={t}
                aluno={transferindo}
                aoFechar={() => setTransferindo(null)}
                aoTransferir={() => {
                  setTransferindo(null)
                  atualizar()
                }}
              />
            )}

            <Dialog
              aberto={!!removendo}
              titulo="Remover aluno da turma?"
              aoFechar={() => setRemovendo(null)}
              acoes={
                <>
                  <Button variante="secundario" onClick={() => setRemovendo(null)}>
                    Cancelar
                  </Button>
                  <Button carregando={remover.isPending} onClick={() => removendo && remover.mutate(removendo.id)}>
                    Remover
                  </Button>
                </>
              }
            >
              <p>
                <strong>{removendo?.nome}</strong> deixará de ter acesso às provas desta turma. Tentativas e notas já registradas
                continuam no histórico.
              </p>
              {remover.error && <AlertBanner tipo="erro">{mensagemDeErro(remover.error)}</AlertBanner>}
            </Dialog>
          </>
        )
      }}
    </EstadoConsulta>
  )
}

/** Provas com envios de alunos desta turma (a partir do relatório da turma). */
function AvaliacoesTurma({ relatorio }: { relatorio: UseQueryResult<RelatorioTurma> }) {
  const r = relatorio.data
  const linhas = (r?.provas ?? []).map((p) => {
    const alunos = r!.alunos.filter((a) => p.id in a.notas)
    const notas = alunos.map((a) => a.notas[p.id]).filter((n): n is number => n != null)
    return {
      ...p,
      envios: alunos.length,
      media: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null,
      pendentes: alunos.length - notas.length,
    }
  })
  return (
    <Card>
      <h2>Avaliações da turma</h2>
      {relatorio.error && <AlertBanner tipo="erro">{mensagemDeErro(relatorio.error)}</AlertBanner>}
      <DataTable
        rotulo="Avaliações da turma"
        chaveLinha={(p) => p.id}
        linhas={linhas}
        carregando={relatorio.isPending}
        vazio="Nenhuma avaliação com envios desta turma ainda."
        colunas={[
          { chave: 'titulo', titulo: 'Avaliação', render: (p) => <Link to={`/app/relatorios/provas/${p.id}`}>{p.titulo}</Link> },
          { chave: 'envios', titulo: 'Envios', render: (p) => `${p.envios} de ${r?.alunos.length ?? 0}` },
          { chave: 'media', titulo: 'Média', render: (p) => formatarNota(p.media) },
          {
            chave: 'estado',
            titulo: 'Correção',
            render: (p) =>
              p.envios === 0 ? (
                <StatusBadge status="SEM_ENVIOS" tom="neutro" rotulo="Sem envios" />
              ) : p.pendentes > 0 ? (
                <StatusBadge status="PENDENTE" rotulo={`${p.pendentes} pendente(s)`} />
              ) : (
                <StatusBadge status="CONCLUIDA" rotulo="Concluída" />
              ),
          },
        ]}
      />
    </Card>
  )
}

/** Nome e período da turma (PUT /turmas/:id); só o responsável ou a coordenação editam. */
function DadosTurma({ turma, aoSalvar }: { turma: TurmaDetalhe; aoSalvar: () => void }) {
  const { usuario } = useAuth()
  const [nome, setNome] = useState(turma.nome)
  const [inicio, setInicio] = useState(turma.periodoInicio.slice(0, 10))
  const [fim, setFim] = useState(turma.periodoFim.slice(0, 10))
  const [responsavel, setResponsavel] = useState(turma.professorResponsavelId)
  const salvar = useMutation({
    mutationFn: () =>
      api(`/turmas/${turma.id}`, {
        method: 'PUT',
        // Só quando mudou: responsável desativado não passaria na validação e travaria a edição do nome/período.
        body: {
          nome,
          periodoInicio: inicio,
          periodoFim: fim,
          ...(responsavel !== turma.professorResponsavelId ? { professorResponsavelId: responsavel } : {}),
        },
      }),
    onSuccess: aoSalvar,
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }
  if (!turma.podeGerirProfessores) {
    return (
      <Card>
        <h2>Dados da turma</h2>
        <dl className="qz-definicoes">
          <div>
            <dt>Nome</dt>
            <dd>{turma.nome}</dd>
          </div>
          <div>
            <dt>Período</dt>
            <dd>
              {formatarData(turma.periodoInicio)} a {formatarData(turma.periodoFim)}
            </dd>
          </div>
          <div>
            <dt>Responsável</dt>
            <dd>{turma.professorNome}</dd>
          </div>
        </dl>
        <p className="qz-suave qz-pequeno">Só o professor responsável ou a coordenação alteram os dados da turma.</p>
      </Card>
    )
  }
  return (
    <Card>
      <h2>Dados da turma</h2>
      <form onSubmit={enviar}>
        {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
        {salvar.isSuccess && <AlertBanner tipo="sucesso">Dados da turma salvos.</AlertBanner>}
        <div className="qz-grade-campos">
          <TextField rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField rotulo="Início do período" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <TextField rotulo="Fim do período" type="date" required value={fim} onChange={(e) => setFim(e.target.value)} />
          <CampoResponsavel valor={responsavel} aoMudar={setResponsavel} atual={{ id: turma.professorResponsavelId, nome: turma.professorNome }} />
        </div>
        {!(usuario && ehGestor(usuario.papel)) && <p className="qz-suave qz-pequeno">Responsável: {turma.professorNome}</p>}
        <Button type="submit" carregando={salvar.isPending} disabled={!nome.trim()}>
          Salvar alterações
        </Button>
      </form>
    </Card>
  )
}

function AdicionarAluno({ turmaId, aoAdicionar, aoFechar }: { turmaId: string; aoAdicionar: () => void; aoFechar: () => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [matricula, setMatricula] = useState('')
  const adicionar = useMutation({
    mutationFn: () =>
      api<{ aluno: AlunoResumo; senhaTemporaria: string | null; conviteEnviado?: boolean }>(`/turmas/${turmaId}/alunos`, {
        method: 'POST',
        body: { nome, email, ...(matricula ? { matricula } : {}) },
      }),
    onSuccess: () => {
      setNome('')
      setEmail('')
      setMatricula('')
      aoAdicionar()
    },
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    adicionar.mutate()
  }
  return (
    <Card>
      <CabecalhoPainel titulo="Adicionar aluno" aoFechar={aoFechar} />
      <p className="qz-suave qz-trm-texto">
        Se o e-mail já pertence a um aluno cadastrado, ele é apenas matriculado. Caso contrário, a conta é criada com senha
        temporária.
      </p>
      {adicionar.data && (
        <AlertBanner tipo="sucesso" titulo={`${adicionar.data.aluno.nome} matriculado(a)`}>
          {adicionar.data.senhaTemporaria ? (
            <>
              Conta criada{adicionar.data.conviteEnviado && ' e convite enviado por e-mail'}. Senha temporária (repasse ao
              aluno; não será exibida de novo): <code className="qz-codigo">{adicionar.data.senhaTemporaria}</code>
            </>
          ) : (
            'O aluno já tinha conta e foi vinculado à turma.'
          )}
        </AlertBanner>
      )}
      {adicionar.error && <AlertBanner tipo="erro">{mensagemDeErro(adicionar.error)}</AlertBanner>}
      <form onSubmit={enviar}>
        <div className="qz-grade-campos">
          <TextField rotulo="Nome completo" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField rotulo="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField rotulo="Matrícula (opcional)" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        </div>
        <Button type="submit" carregando={adicionar.isPending} disabled={!nome || !email}>
          Matricular
        </Button>
      </form>
    </Card>
  )
}

const LIMITE_CSV_BYTES = 900_000

function ImportarCsv({ turmaId, aoImportar, aoFechar }: { turmaId: string; aoImportar: () => void; aoFechar: () => void }) {
  const [arquivo, setArquivo] = useState<{ nome: string; conteudo: string } | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const importar = useMutation({
    mutationFn: () => api<RelatorioImportacao>(`/turmas/${turmaId}/importacao`, { method: 'POST', body: { conteudo: arquivo!.conteudo } }),
    onSuccess: aoImportar,
  })
  const previa = arquivo ? lerCsvSimples(arquivo.conteudo).slice(0, 6) : []

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    importar.reset()
    setErroArquivo(null)
    if (!f) return setArquivo(null)
    // Mesmo limite do servidor (corpo de 1 MB): avisa antes de enviar.
    if (f.size > LIMITE_CSV_BYTES) {
      setArquivo(null)
      return setErroArquivo('Arquivo maior que 900 KB (limite do servidor). Divida a lista em arquivos menores.')
    }
    setArquivo({ nome: f.name, conteudo: await f.text() })
  }

  function baixarCredenciais(r: RelatorioImportacao) {
    const linhas = ['nome;email;senha_temporaria', ...r.criados.map((c) => `${c.nome};${c.email};${c.senhaTemporaria}`)]
    salvarArquivo(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv' }), 'credenciais-alunos.csv')
  }

  const r = importar.data
  return (
    <Card className="qz-pilha">
      <CabecalhoPainel titulo="Importar alunos (CSV)" aoFechar={aoFechar} />
      <div>
        <p className="qz-trm-texto">
          Envie um arquivo CSV com cabeçalho e as colunas <code>nome</code>, <code>email</code> e (opcional){' '}
          <code>matricula</code>. Separador vírgula ou ponto e vírgula. Linhas com erro são rejeitadas; as válidas são
          processadas.
        </p>
        <input type="file" accept=".csv,text/csv" aria-label="Arquivo CSV" onChange={(e) => void escolher(e)} />
      </div>
      {erroArquivo && <AlertBanner tipo="erro">{erroArquivo}</AlertBanner>}

      {arquivo && !r && (
        <>
          <div>
            <strong className="qz-pequeno">Pré-visualização de {arquivo.nome}</strong>
            <div className="qz-tabela-wrapper qz-trm-previa">
              <table className="qz-tabela">
                <tbody>
                  {previa.map((linha, i) => (
                    <tr key={i}>
                      {linha.map((c, j) =>
                        i === 0 ? <th key={j}>{c}</th> : <td key={j}>{c}</td>,
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {importar.error && <AlertBanner tipo="erro">{mensagemDeErro(importar.error)}</AlertBanner>}
          <div>
            <Button carregando={importar.isPending} onClick={() => importar.mutate()}>
              Importar alunos
            </Button>
          </div>
        </>
      )}

      {r && (
        <>
          <AlertBanner tipo={r.erros.length ? 'alerta' : 'sucesso'} titulo="Importação concluída">
            {r.totalLinhas} linha(s) lidas · {r.matriculados} matriculado(s) · {r.jaMatriculados} já estavam na turma ·{' '}
            {r.criados.length} conta(s) nova(s) · {r.erros.length} com erro
          </AlertBanner>
          {r.criados.length > 0 && (
            <div>
              <p>
                Contas novas receberam senha temporária (troca obrigatória no primeiro acesso). Baixe a lista agora — ela não
                será exibida de novo.
              </p>
              <Button variante="secundario" onClick={() => baixarCredenciais(r)}>
                Baixar credenciais (CSV)
              </Button>
            </div>
          )}
          {r.erros.length > 0 && (
            <DataTable
              rotulo="Linhas com erro"
              chaveLinha={(e) => String(e.linha)}
              linhas={r.erros}
              colunas={[
                { chave: 'linha', titulo: 'Linha', render: (e) => e.linha, largura: '80px' },
                { chave: 'msg', titulo: 'Problema', render: (e) => e.mensagem },
              ]}
            />
          )}
        </>
      )}
    </Card>
  )
}

function CabecalhoPainel({ titulo, aoFechar }: { titulo: string; aoFechar: () => void }) {
  return (
    <div className="qz-trm-painel">
      <h2>{titulo}</h2>
      <Button variante="fantasma" onClick={aoFechar}>
        Fechar
      </Button>
    </div>
  )
}

/** RF03 — mais de um professor por turma. Co-professor matricula e aplica provas; equipe e dados ficam com o responsável. */
function Professores({ turma, aoSalvar }: { turma: TurmaDetalhe; aoSalvar: () => void }) {
  const opcoes = useQuery({
    queryKey: ['professores'],
    queryFn: () => api<ProfessorOpcao[]>('/usuarios/professores'),
    enabled: turma.podeGerirProfessores,
  })
  const [selecionados, setSelecionados] = useState<string[]>(turma.coProfessores.map((p) => p.id))
  // Co-professor desativado não volta em /usuarios/professores e a API o recusaria: sai da equipe ao salvar.
  const ativos = new Set((opcoes.data ?? []).map((p) => p.id))
  const inativos = opcoes.data ? turma.coProfessores.filter((p) => !ativos.has(p.id)) : []
  const salvar = useMutation({
    mutationFn: () =>
      api(`/turmas/${turma.id}/professores`, { method: 'PUT', body: { professorIds: selecionados.filter((id) => ativos.has(id)) } }),
    onSuccess: aoSalvar,
  })
  const alternar = (id: string) => setSelecionados((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))

  return (
    <Card className="qz-pilha">
      <h2>Professores</h2>
      <div>
        <strong>Responsável:</strong> {turma.professorNome}
      </div>
      {!turma.podeGerirProfessores ? (
        <>
          <div>
            <strong>Co-professores:</strong> {turma.coProfessores.map((p) => p.nome).join(', ') || 'nenhum'}
          </div>
          <p className="qz-suave qz-pequeno">Só o professor responsável ou a coordenação alteram a equipe da turma.</p>
        </>
      ) : (
        <>
          <p className="qz-suave qz-pequeno">
            Co-professores veem a turma, matriculam alunos, aplicam as próprias provas a ela e veem o relatório da turma.
          </p>
          {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
          {salvar.isSuccess && <AlertBanner tipo="sucesso">Equipe atualizada.</AlertBanner>}
          <fieldset className="qz-fieldset">
            <legend>Co-professores</legend>
            {(opcoes.data ?? [])
              .filter((p) => p.id !== turma.professorResponsavelId)
              .map((p) => (
                <label key={p.id} className="qz-linha">
                  <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => alternar(p.id)} />
                  {p.nome} <span className="qz-suave qz-pequeno">{p.email}</span>
                </label>
              ))}
            {inativos.map((p) => (
              <label key={p.id} className="qz-linha qz-suave">
                <input type="checkbox" checked={false} disabled />
                {p.nome} <span className="qz-pequeno">(inativo — sai da equipe ao salvar)</span>
              </label>
            ))}
          </fieldset>
          <div>
            <Button carregando={salvar.isPending} disabled={!opcoes.data} onClick={() => salvar.mutate()}>
              Salvar equipe
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

/** Transfere o aluno: encerra o vínculo aqui e matricula na turma escolhida (histórico preservado). */
function DialogTransferir({
  turma,
  aluno,
  aoFechar,
  aoTransferir,
}: {
  turma: TurmaDetalhe
  aluno: AlunoResumo
  aoFechar: () => void
  aoTransferir: () => void
}) {
  const turmas = useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/turmas') })
  const outras = (turmas.data ?? []).filter((x) => x.id !== turma.id)
  const [destino, setDestino] = useState('')
  const transferir = useMutation({
    mutationFn: () =>
      api(`/turmas/${turma.id}/alunos/${aluno.id}/transferir`, { method: 'POST', body: { turmaDestinoId: destino || outras[0]?.id } }),
    onSuccess: aoTransferir,
  })
  return (
    <Dialog
      aberto
      titulo={`Transferir ${aluno.nome}`}
      aoFechar={aoFechar}
      acoes={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button carregando={transferir.isPending} disabled={outras.length === 0} onClick={() => transferir.mutate()}>
            Transferir
          </Button>
        </>
      }
    >
      {transferir.error && <AlertBanner tipo="erro">{mensagemDeErro(transferir.error)}</AlertBanner>}
      {outras.length === 0 ? (
        <p>Não há outra turma disponível.</p>
      ) : (
        <SelectField
          rotulo="Turma de destino"
          value={destino || outras[0]!.id}
          onChange={(e) => setDestino(e.target.value)}
          opcoes={outras.map((x) => ({ valor: x.id, rotulo: x.nome }))}
        />
      )}
      <p className="qz-suave qz-pequeno">Notas e tentativas anteriores continuam no histórico. Provas aplicadas a esta turma deixam de aparecer para o aluno.</p>
    </Dialog>
  )
}
