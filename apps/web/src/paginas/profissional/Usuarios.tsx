import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api, mensagemDeErro } from '../../api/cliente'
import { ROTULO_PAPEL, type Pagina, type Papel, type Usuario, type UsuarioListagem } from '../../api/tipos'
import { useAuth } from '../../auth/contexto'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { AlertBanner, Button, Card, DataTable, Icone, Metrica, SelectField, StatusBadge, TextField, type Coluna } from '../../design-system'
import './usuarios.css'

function Situacao({ u }: { u: UsuarioListagem }) {
  return !u.ativo ? (
    <StatusBadge status="INATIVO" rotulo="Desativado" />
  ) : u.bloqueado ? (
    <StatusBadge status="BLOQUEADO" rotulo="Bloqueado" />
  ) : u.trocarSenha ? (
    <StatusBadge status="PENDENTE" tom="alerta" rotulo="Aguardando 1º acesso" />
  ) : (
    <StatusBadge status="ATIVO" rotulo="Ativo" />
  )
}

const COLUNAS: Coluna<UsuarioListagem>[] = [
  {
    chave: 'nome',
    titulo: 'Usuário',
    render: (u) => (
      <>
        <Link to={`/app/usuarios/${u.id}`}>{u.nome}</Link>
        <span className="qz-tabela__sub">{u.email}</span>
      </>
    ),
  },
  { chave: 'matricula', titulo: 'Matrícula', render: (u) => u.matricula ?? '—' },
  { chave: 'papel', titulo: 'Papel', render: (u) => ROTULO_PAPEL[u.papel] },
  { chave: 'status', titulo: 'Estado', render: (u) => <Situacao u={u} /> },
  {
    chave: 'acoes',
    titulo: 'Ações',
    largura: '80px',
    render: (u) => (
      <Link to={`/app/usuarios/${u.id}`} className="qz-usr-acao" aria-label={`Gerenciar ${u.nome}`} title="Gerenciar">
        <Icone nome="reticencias" />
      </Link>
    ),
  },
]

const PAPEIS = Object.keys(ROTULO_PAPEL) as Papel[]

/** Totais por papel para os indicadores (uma consulta de 1 item por papel; só o `total` interessa). */
function useTotaisPorPapel() {
  const consultas = useQueries({
    queries: PAPEIS.map((papel) => ({
      queryKey: ['usuarios', 'total', papel],
      queryFn: () => api<Pagina<UsuarioListagem>>(`/usuarios?pagina=1&tamanho=1&papel=${papel}`),
    })),
  })
  if (consultas.some((c) => !c.data)) return null
  return Object.fromEntries(PAPEIS.map((p, i) => [p, consultas[i]!.data!.total])) as Record<Papel, number>
}

/** RF02 — Gestão de usuários (listagem para Admin/Coordenador; cadastro só Admin). */
export function Usuarios() {
  const { usuario } = useAuth()
  const [pagina, setPagina] = useState(1)
  const [formAberto, setFormAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [papel, setPapel] = useState<Papel | ''>('')
  const filtro = `${busca.trim() ? `&busca=${encodeURIComponent(busca.trim())}` : ''}${papel ? `&papel=${papel}` : ''}`
  const consulta = useQuery({
    queryKey: ['usuarios', pagina, filtro],
    queryFn: () => api<Pagina<UsuarioListagem>>(`/usuarios?pagina=${pagina}&tamanho=20${filtro}`),
  })
  const totais = useTotaisPorPapel()
  const podeCadastrar = usuario?.papel === 'ADMINISTRADOR'
  const valor = (n: number | undefined) => (n == null ? '—' : String(n).padStart(2, '0'))
  const profissionais = totais && totais.ADMINISTRADOR + totais.COORDENADOR + totais.PROFESSOR + totais.CORRETOR

  return (
    <>
      <CabecalhoPagina
        titulo="Usuários"
        descricao="Contas do ambiente profissional e alunos."
        acoes={
          podeCadastrar &&
          !formAberto && (
            <Button onClick={() => setFormAberto(true)}>
              <Icone nome="usuario-mais" /> Novo usuário
            </Button>
          )
        }
      />
      {formAberto && <FormNovoUsuario aoFechar={() => setFormAberto(false)} />}
      <div className="qz-metricas qz-usr-metricas">
        <Metrica rotulo="Usuários profissionais" icone="usuarios" valor={valor(profissionais ?? undefined)} />
        <Metrica rotulo="Professores" icone="documentos" valor={valor(totais?.PROFESSOR)} />
        <Metrica rotulo="Corretores" icone="check-circulo" tom="sucesso" valor={valor(totais?.CORRETOR)} />
        <Metrica rotulo="Alunos" icone="formatura" valor={valor(totais?.ALUNO)} />
      </div>
      <div className="qz-barra-filtros">
        <label className="qz-busca">
          <Icone nome="busca" />
          <input
            type="search"
            placeholder="Buscar nome, e-mail ou matrícula"
            aria-label="Buscar por nome, e-mail ou matrícula"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
          />
        </label>
        <select
          className="qz-seletor qz-usr-seletor"
          aria-label="Filtrar por papel"
          value={papel}
          onChange={(e) => {
            setPapel(e.target.value as Papel | '')
            setPagina(1)
          }}
        >
          <option value="">Todos os papéis</option>
          {PAPEIS.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PAPEL[p]}
            </option>
          ))}
        </select>
      </div>
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <DataTable
        rotulo="Usuários"
        rotuloItens="usuários"
        colunas={COLUNAS}
        linhas={consulta.data?.itens ?? []}
        chaveLinha={(u) => u.id}
        carregando={consulta.isPending}
        vazio="Nenhum usuário encontrado."
        paginacao={consulta.data && { ...consulta.data, aoMudarPagina: setPagina }}
      />
      <Card className="qz-usr-papeis">
        <h2>Papéis profissionais</h2>
        <dl>
          <div>
            <dt>Professor</dt>
            <dd>Cria questões, provas e aplicações para as próprias turmas.</dd>
          </div>
          <div>
            <dt>Coordenador</dt>
            <dd>Acompanha turmas e relatórios, reabre tentativas e desbloqueia contas.</dd>
          </div>
          <div>
            <dt>Corretor</dt>
            <dd>Corrige as respostas abertas das provas que lhe são designadas.</dd>
          </div>
          <div>
            <dt>Administrador</dt>
            <dd>Gerencia usuários, auditoria, LGPD e integrações.</dd>
          </div>
        </dl>
      </Card>
    </>
  )
}

function FormNovoUsuario({ aoFechar }: { aoFechar: () => void }) {
  const cliente = useQueryClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<Papel>('PROFESSOR')
  const [matricula, setMatricula] = useState('')
  const criar = useMutation({
    mutationFn: () =>
      api<{ usuario: Usuario; senhaTemporaria: string; conviteEnviado?: boolean }>('/usuarios', {
        method: 'POST',
        body: { nome, email, papel, ...(matricula ? { matricula } : {}) },
      }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  function enviar(e: FormEvent) {
    e.preventDefault()
    criar.mutate()
  }

  if (criar.data) {
    return (
      <Card className="qz-usr-form">
        <AlertBanner tipo="sucesso" titulo="Usuário cadastrado">
          {criar.data.conviteEnviado
            ? 'Enviamos um e-mail com o link para definir a senha. Se preferir, repasse também a senha temporária abaixo por um canal seguro.'
            : 'Repasse a senha temporária abaixo por um canal seguro.'}{' '}
          Ela não será exibida novamente e deverá ser trocada no primeiro acesso de <strong>{criar.data.usuario.nome}</strong>.
        </AlertBanner>
        <code className="qz-auth__segredo qz-usr-senha">
          {criar.data.senhaTemporaria}
        </code>
        <Button variante="secundario" onClick={aoFechar}>
          Concluir
        </Button>
      </Card>
    )
  }

  return (
    <Card className="qz-usr-form">
      <h2>Novo usuário</h2>
      <form onSubmit={enviar}>
        {criar.error && <AlertBanner tipo="erro">{mensagemDeErro(criar.error)}</AlertBanner>}
        <TextField rotulo="Nome completo" required value={nome} onChange={(e) => setNome(e.target.value)} />
        <TextField rotulo="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <SelectField
          rotulo="Papel"
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
          opcoes={PAPEIS.map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] }))}
        />
        {papel === 'ALUNO' && (
          <TextField rotulo="Matrícula" value={matricula} onChange={(e) => setMatricula(e.target.value)} ajuda="Opcional — permite login por matrícula." />
        )}
        <div className="qz-acoes">
          <Button type="submit" carregando={criar.isPending} disabled={!nome || !email}>
            Cadastrar
          </Button>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
