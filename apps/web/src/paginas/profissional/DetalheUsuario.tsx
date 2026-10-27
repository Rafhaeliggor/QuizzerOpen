import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { api, mensagemDeErro } from '../../api/cliente'
import {
  ROTULO_PAPEL,
  type Papel,
  type PermissaoCatalogo,
  type PermissaoConcedida,
  type UsuarioAdmin,
} from '../../api/tipos'
import { useAuth } from '../../auth/contexto'
import { ehGestor } from '../../auth/papeis'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, Dialog, SelectField, StatusBadge, TextArea, TextField } from '../../design-system'
import { formatarDataHora } from '../../util/formato'
import './usuarios.css'

type Acao = 'desativar' | 'reativar' | 'resetar-mfa'

const TITULO_ACAO: Record<Acao, string> = {
  desativar: 'Desativar conta',
  reativar: 'Reativar conta',
  'resetar-mfa': 'Resetar verificação em duas etapas',
}

/** RF02 — administração de uma conta (Administrador; Coordenação só consulta e desbloqueia). */
export function DetalheUsuario() {
  const { id } = useParams()
  const { usuario: eu } = useAuth()
  const cliente = useQueryClient()
  const consulta = useQuery({ queryKey: ['usuario', id], queryFn: () => api<UsuarioAdmin>(`/usuarios/${id}`) })
  const [acao, setAcao] = useState<Acao | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [senhaNova, setSenhaNova] = useState<string | null>(null)
  const admin = eu?.papel === 'ADMINISTRADOR'
  const proprio = eu?.id === id

  const atualizar = (u: UsuarioAdmin) => {
    cliente.setQueryData(['usuario', id], u)
    void cliente.invalidateQueries({ queryKey: ['usuarios'] })
  }
  const executar = useMutation({
    mutationFn: (a: Acao) => api<UsuarioAdmin>(`/usuarios/${id}/${a}`, { method: 'POST', body: { justificativa } }),
    onSuccess: (u) => {
      atualizar(u)
      setAcao(null)
      setJustificativa('')
    },
  })
  const desbloquear = useMutation({ mutationFn: () => api<UsuarioAdmin>(`/usuarios/${id}/desbloquear`, { method: 'POST' }), onSuccess: atualizar })
  const redefinir = useMutation({
    mutationFn: () => api<{ senhaTemporaria: string }>(`/usuarios/${id}/redefinir-senha`, { method: 'POST' }),
    onSuccess: (r) => {
      setSenhaNova(r.senhaTemporaria)
      void cliente.invalidateQueries({ queryKey: ['usuario', id] })
    },
  })

  return (
    <EstadoConsulta consulta={consulta}>
      {(u) => (
        <>
          <CabecalhoPagina
            voltar={{ para: '/app/usuarios', rotulo: 'Voltar para usuários' }}
            sobretitulo={<StatusBadge status={u.papel} tom="info" rotulo={ROTULO_PAPEL[u.papel]} />}
            titulo={u.nome}
            descricao={u.email}
          />
          {(executar.error || desbloquear.error || redefinir.error) && (
            <AlertBanner tipo="erro">{mensagemDeErro(executar.error ?? desbloquear.error ?? redefinir.error)}</AlertBanner>
          )}
          {senhaNova && (
            <AlertBanner tipo="sucesso" titulo="Senha redefinida">
              Repasse a senha temporária por um canal seguro (não será exibida de novo): <code className="qz-codigo">{senhaNova}</code>
            </AlertBanner>
          )}
          <div className="qz-duas-colunas">
            <div className="qz-pilha">
              {admin ? (
                <FormEdicao usuario={u} proprio={proprio} aoSalvar={atualizar} />
              ) : (
                <Card>
                  <h2>Dados da conta</h2>
                  <dl className="qz-definicoes">
                    <div>
                      <dt>Nome</dt>
                      <dd>{u.nome}</dd>
                    </div>
                    <div>
                      <dt>E-mail</dt>
                      <dd>{u.email}</dd>
                    </div>
                    <div>
                      <dt>Papel</dt>
                      <dd>{ROTULO_PAPEL[u.papel]}</dd>
                    </div>
                    <div>
                      <dt>Matrícula</dt>
                      <dd>{u.matricula ?? '—'}</dd>
                    </div>
                  </dl>
                </Card>
              )}
              {eu && ehGestor(eu.papel) && !proprio && (u.papel === 'PROFESSOR' || u.papel === 'CORRETOR') && (
                <PermissoesDelegadas usuarioId={u.id} papel={u.papel} />
              )}
            </div>
            <div className="qz-pilha qz-usr-lateral">
              <Card>
                <h2>Situação</h2>
                <div className="qz-linha">
                  <StatusBadge status={u.ativo ? 'ATIVO' : 'INATIVO'} rotulo={u.ativo ? 'Ativa' : 'Desativada'} />
                  {u.bloqueadoAte && <StatusBadge status="BLOQUEADO" rotulo="Bloqueada" />}
                </div>
                <dl className="qz-definicoes qz-usr-definicoes">
                  <div>
                    <dt>Último acesso</dt>
                    <dd>{formatarDataHora(u.ultimoLoginEm)}</dd>
                  </div>
                  <div>
                    <dt>Sessões ativas</dt>
                    <dd>{u.sessoesAtivas}</dd>
                  </div>
                  <div>
                    <dt>Bloqueio</dt>
                    <dd>{u.bloqueadoAte ? `até ${formatarDataHora(u.bloqueadoAte)}` : 'Não'}</dd>
                  </div>
                  <div>
                    <dt>Cadastro</dt>
                    <dd>{formatarDataHora(u.criadoEm)}</dd>
                  </div>
                </dl>
                {(u.bloqueadoAte || (admin && !proprio)) && (
                  <div className="qz-pilha qz-usr-acoes-conta">
                    {u.bloqueadoAte && (
                      <Button variante="secundario" largo carregando={desbloquear.isPending} onClick={() => desbloquear.mutate()}>
                        Desbloquear
                      </Button>
                    )}
                    {admin && !proprio && (
                      <>
                        <Button variante="secundario" largo carregando={redefinir.isPending} onClick={() => redefinir.mutate()}>
                          Redefinir senha
                        </Button>
                        <Button variante="fantasma" largo onClick={() => setAcao(u.ativo ? 'desativar' : 'reativar')}>
                          {u.ativo ? 'Desativar conta' : 'Reativar conta'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
              <Card>
                <h2>Segurança</h2>
                <StatusBadge
                  status={u.mfaHabilitado ? 'ATIVA' : 'INATIVA'}
                  tom={u.mfaHabilitado ? 'sucesso' : 'neutro'}
                  rotulo={u.mfaHabilitado ? 'Verificação em 2 etapas ativa' : 'Verificação em 2 etapas não cadastrada'}
                />
                <p>
                  {u.trocarSenha ? 'A pessoa precisa trocar a senha no próximo acesso.' : 'Sem troca de senha pendente.'}
                </p>
                {admin && !proprio && u.mfaHabilitado && (
                  <div className="qz-usr-acoes-conta">
                    <Button variante="secundario" largo onClick={() => setAcao('resetar-mfa')}>
                      Resetar MFA
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <Dialog
            aberto={!!acao}
            titulo={acao ? TITULO_ACAO[acao] : ''}
            aoFechar={() => setAcao(null)}
            acoes={
              <>
                <Button variante="secundario" onClick={() => setAcao(null)}>
                  Cancelar
                </Button>
                <Button carregando={executar.isPending} disabled={!justificativa.trim()} onClick={() => acao && executar.mutate(acao)}>
                  Confirmar
                </Button>
              </>
            }
          >
            {acao === 'desativar' && <p>A pessoa não conseguirá mais entrar e as sessões abertas serão encerradas. O histórico é preservado.</p>}
            {acao === 'resetar-mfa' && <p>No próximo acesso será pedido o cadastro de um novo app autenticador.</p>}
            <TextArea rotulo="Justificativa (registrada na auditoria)" required value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          </Dialog>
        </>
      )}
    </EstadoConsulta>
  )
}

function FormEdicao({ usuario, proprio, aoSalvar }: { usuario: UsuarioAdmin; proprio: boolean; aoSalvar: (u: UsuarioAdmin) => void }) {
  const [nome, setNome] = useState(usuario.nome)
  const [email, setEmail] = useState(usuario.email)
  const [papel, setPapel] = useState<Papel>(usuario.papel)
  const [matricula, setMatricula] = useState(usuario.matricula ?? '')
  const salvar = useMutation({
    mutationFn: () =>
      api<UsuarioAdmin>(`/usuarios/${usuario.id}`, { method: 'PATCH', body: { nome, email, papel, matricula } }),
    onSuccess: aoSalvar,
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }
  const sensivel = papel !== usuario.papel || email !== usuario.email
  return (
    <Card>
      <h2>Dados da conta</h2>
      <form onSubmit={enviar}>
        {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
        {salvar.isSuccess && <AlertBanner tipo="sucesso">Alterações salvas.</AlertBanner>}
        <div className="qz-grade-campos">
          <TextField rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <TextField rotulo="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <SelectField
            rotulo="Papel"
            value={papel}
            disabled={proprio}
            onChange={(e) => setPapel(e.target.value as Papel)}
            opcoes={(Object.keys(ROTULO_PAPEL) as Papel[]).map((p) => ({ valor: p, rotulo: ROTULO_PAPEL[p] }))}
          />
          <TextField rotulo="Matrícula" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        </div>
        {sensivel && <AlertBanner tipo="alerta">Mudar papel ou e-mail encerra as sessões abertas desta pessoa.</AlertBanner>}
        <Button type="submit" carregando={salvar.isPending}>
          Salvar
        </Button>
      </form>
    </Card>
  )
}

/** RF02 — permissões específicas concedidas sem mudar o papel (ADR-0033). */
/** Corretor não vê aplicações na interface: "Reabrir tentativas" não teria tela para ele. */
const SEM_TELA_PARA_CORRETOR = ['REABRIR_TENTATIVAS']

function PermissoesDelegadas({ usuarioId, papel }: { usuarioId: string; papel: Papel }) {
  const cliente = useQueryClient()
  const catalogo = useQuery({ queryKey: ['permissoes-catalogo'], queryFn: () => api<PermissaoCatalogo[]>('/permissoes/catalogo') })
  const concedidas = useQuery({
    queryKey: ['permissoes', usuarioId],
    queryFn: () => api<PermissaoConcedida[]>(`/permissoes/usuarios/${usuarioId}`),
  })
  const [alvo, setAlvo] = useState<{ codigo: string; conceder: boolean } | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [validade, setValidade] = useState('')
  const [hoje] = useState(() => new Date().toISOString().slice(0, 10))
  const alterar = useMutation({
    mutationFn: () =>
      alvo!.conceder
        ? api<PermissaoConcedida[]>(`/permissoes/usuarios/${usuarioId}/${alvo!.codigo}`, {
            method: 'PUT',
            body: { justificativa, ...(validade ? { expiraEm: new Date(`${validade}T23:59:59`).toISOString() } : {}) },
          })
        : api<PermissaoConcedida[]>(`/permissoes/usuarios/${usuarioId}/${alvo!.codigo}/revogar`, {
            method: 'POST',
            body: { justificativa },
          }),
    onSuccess: (lista) => {
      cliente.setQueryData(['permissoes', usuarioId], lista)
      setAlvo(null)
      setJustificativa('')
      setValidade('')
    },
  })
  const ativas = new Map((concedidas.data ?? []).filter((p) => !p.expirada).map((p) => [p.permissao, p]))
  // Delegação vencida continua visível como "expirada" (caso 4 do doc 030), com a opção de conceder de novo.
  const expiradas = new Map((concedidas.data ?? []).filter((p) => p.expirada).map((p) => [p.permissao, p]))

  return (
    <Card>
      <h2>Permissões delegadas</h2>
      <p className="qz-suave qz-pequeno">
        Libera ações específicas da coordenação sem mudar o papel. Vale em até 30 segundos e é registrada na auditoria; mudar
        o papel da pessoa remove todas as delegações.
      </p>
      {(catalogo.error || concedidas.error) && <AlertBanner tipo="erro">{mensagemDeErro(catalogo.error ?? concedidas.error)}</AlertBanner>}
      <ul className="qz-usr-permissoes">
        {(catalogo.data ?? []).map((p) => {
          const ativa = ativas.get(p.codigo)
          // Já concedida continua listada, para poder ser revogada.
          if (papel === 'CORRETOR' && SEM_TELA_PARA_CORRETOR.includes(p.codigo) && !ativa) return null
          const expirada = !ativa ? expiradas.get(p.codigo) : undefined
          return (
            <li key={p.codigo}>
              <div>
                <strong>{p.descricao}</strong>
                {ativa && (
                  <div className="qz-suave qz-pequeno">
                    concedida por {ativa.concedidoPor} em {formatarDataHora(ativa.criadoEm)}
                    {ativa.expiraEm && ` · vale até ${formatarDataHora(ativa.expiraEm)}`}
                  </div>
                )}
                {expirada && (
                  <div className="qz-suave qz-pequeno">
                    <StatusBadge status="EXPIRADA" tom="neutro" rotulo="expirada" /> concedida por {expirada.concedidoPor}; venceu em{' '}
                    {formatarDataHora(expirada.expiraEm)}
                  </div>
                )}
              </div>
              <Button variante={ativa ? 'fantasma' : 'secundario'} onClick={() => (alterar.reset(), setAlvo({ codigo: p.codigo, conceder: !ativa }))}>
                {ativa ? 'Revogar' : 'Conceder'}
              </Button>
            </li>
          )
        })}
      </ul>
      <Dialog
        aberto={!!alvo}
        titulo={alvo?.conceder ? 'Conceder permissão' : 'Revogar permissão'}
        aoFechar={() => setAlvo(null)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button carregando={alterar.isPending} disabled={!justificativa.trim()} onClick={() => alterar.mutate()}>
              Confirmar
            </Button>
          </>
        }
      >
        {alterar.error && <AlertBanner tipo="erro">{mensagemDeErro(alterar.error)}</AlertBanner>}
        <p>{catalogo.data?.find((c) => c.codigo === alvo?.codigo)?.descricao}</p>
        <TextArea rotulo="Justificativa (registrada na auditoria)" required value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
        {alvo?.conceder && (
          <TextField
            rotulo="Válida até (opcional)"
            type="date"
            ajuda="Depois desta data a permissão deixa de valer sozinha. Vazio = até ser revogada."
            min={hoje}
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
          />
        )}
      </Dialog>
    </Card>
  )
}
