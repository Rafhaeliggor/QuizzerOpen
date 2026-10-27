import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, mensagemDeErro } from '../api/cliente'
import type { DadosCadastroMfa, SessaoAtiva } from '../api/tipos'
import { useAuth } from '../auth/contexto'
import { useRecursos } from '../api/recursos'
import { AlertBanner, Button, Card, DataTable, Dialog, Interruptor, StatusBadge, TextField } from '../design-system'
import { formatarDataHora } from '../util/formato'

export interface SituacaoMfa {
  habilitado: boolean
  obrigatorio: boolean
  codigosRecuperacaoRestantes: number
}

/** Mostra os códigos de recuperação UMA vez, com opção de baixar (ADR-0042). */
function CodigosRecuperacao({ codigos, aoFechar }: { codigos: string[]; aoFechar: () => void }) {
  const baixar = () => {
    const blob = new Blob([`Quizzer — códigos de recuperação (cada um vale uma vez)\n\n${codigos.join('\n')}\n`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quizzer-codigos-recuperacao.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <AlertBanner tipo="alerta" titulo="Guarde seus códigos de recuperação">
      <p>Se perder o celular, cada código abaixo permite entrar uma vez. Eles não serão mostrados de novo.</p>
      <ul className="qz-codigos-recuperacao">
        {codigos.map((c) => (
          <li key={c}>
            <code className="qz-codigo">{c}</code>
          </li>
        ))}
      </ul>
      <div className="qz-linha">
        <Button variante="secundario" onClick={baixar}>
          Baixar (.txt)
        </Button>
        <Button onClick={aoFechar}>Já guardei</Button>
      </div>
    </AlertBanner>
  )
}

/** Verificação em duas etapas opcional para quem não é obrigado (RF01/RNF05 — ADR-0034). */
export function CartaoMfa() {
  const cliente = useQueryClient()
  const situacao = useQuery({ queryKey: ['minha-conta', 'mfa'], queryFn: () => api<SituacaoMfa>('/minha-conta/mfa') })
  const [cadastro, setCadastro] = useState<DadosCadastroMfa | null>(null)
  const [codigo, setCodigo] = useState('')
  const [desativando, setDesativando] = useState(false)
  const [senha, setSenha] = useState('')
  const [codigosNovos, setCodigosNovos] = useState<string[] | null>(null)
  const [gerandoCodigos, setGerandoCodigos] = useState(false)

  const atualizar = () => void cliente.invalidateQueries({ queryKey: ['minha-conta', 'mfa'] })
  const iniciar = useMutation({
    mutationFn: () => api<DadosCadastroMfa>('/minha-conta/mfa/iniciar', { method: 'POST' }),
    onSuccess: setCadastro,
  })
  const confirmar = useMutation({
    mutationFn: () => api<{ codigosRecuperacao: string[] }>('/minha-conta/mfa/confirmar', { method: 'POST', body: { codigo } }),
    onSuccess: (r) => {
      setCodigosNovos(r.codigosRecuperacao)
      setCadastro(null)
      setCodigo('')
      atualizar()
      void cliente.invalidateQueries({ queryKey: ['minha-conta', 'sessoes'] })
    },
  })
  const novosCodigos = useMutation({
    mutationFn: () =>
      api<{ codigosRecuperacao: string[] }>('/minha-conta/mfa/codigos-recuperacao', { method: 'POST', body: { codigo } }),
    onSuccess: (r) => {
      setCodigosNovos(r.codigosRecuperacao)
      setGerandoCodigos(false)
      setCodigo('')
      atualizar()
    },
  })
  const desativar = useMutation({
    mutationFn: () => api('/minha-conta/mfa/desativar', { method: 'POST', body: { senha, codigo } }),
    onSuccess: () => {
      setDesativando(false)
      setSenha('')
      setCodigo('')
      atualizar()
    },
  })

  const s = situacao.data
  return (
    <Card>
      <div className="qz-cta-titulo">
        <h2>Verificação em duas etapas</h2>
        {s && <StatusBadge status={s.habilitado ? 'ATIVA' : 'INATIVA'} tom={s.habilitado ? 'sucesso' : 'neutro'} rotulo={s.habilitado ? 'Ativa' : 'Desativada'} />}
      </div>
      {situacao.error && <AlertBanner tipo="erro">{mensagemDeErro(situacao.error)}</AlertBanner>}
      {s && (
        <p className="qz-cta-descricao">
          {s.obrigatorio
            ? 'Obrigatória para o seu perfil.'
            : 'Opcional: além da senha, pede um código do app autenticador (Google Authenticator, Authy…) ao entrar. Algumas provas podem exigir.'}
        </p>
      )}
      {s && !s.habilitado && !cadastro && (
        <Button carregando={iniciar.isPending} onClick={() => iniciar.mutate()}>
          Ativar verificação em duas etapas
        </Button>
      )}
      {iniciar.error && <AlertBanner tipo="erro">{mensagemDeErro(iniciar.error)}</AlertBanner>}
      {cadastro && (
        <div className="qz-pilha">
          <p>1. No app autenticador, leia o QR code (ou digite a chave).</p>
          <img className="qz-auth__qr" src={cadastro.qrCodeDataUrl} alt="QR code para configurar o app autenticador" />
          <p className="qz-pequeno">
            Chave: <code className="qz-codigo">{cadastro.segredo}</code>
          </p>
          <p>2. Digite o código de 6 dígitos que aparece no app.</p>
          {confirmar.error && <AlertBanner tipo="erro">{mensagemDeErro(confirmar.error)}</AlertBanner>}
          <div className="qz-linha">
            <TextField
              rotulo="Código"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            />
            <Button disabled={codigo.length !== 6} carregando={confirmar.isPending} onClick={() => confirmar.mutate()}>
              Confirmar
            </Button>
            <Button variante="fantasma" onClick={() => (setCodigo(''), setCadastro(null))}>
              Cancelar
            </Button>
          </div>
          <p className="qz-suave qz-pequeno">Ao confirmar, as suas outras sessões abertas são encerradas.</p>
        </div>
      )}
      {codigosNovos && <CodigosRecuperacao codigos={codigosNovos} aoFechar={() => setCodigosNovos(null)} />}
      {s?.habilitado && !codigosNovos && (
        <p className="qz-pequeno qz-cta-descricao">
          Códigos de recuperação restantes: <strong>{s.codigosRecuperacaoRestantes}</strong>
          {s.codigosRecuperacaoRestantes <= 2 && ' — gere novos códigos.'}
        </p>
      )}
      <div className="qz-acoes">
        {s?.habilitado && (
          <Button variante="secundario" onClick={() => (setCodigo(''), setGerandoCodigos(true))}>
            Gerar novos códigos de recuperação
          </Button>
        )}
        {s?.habilitado && !s.obrigatorio && (
          <Button variante="fantasma" onClick={() => (setCodigo(''), setSenha(''), setDesativando(true))}>
            Desativar
          </Button>
        )}
      </div>
      <Dialog
        aberto={gerandoCodigos}
        titulo="Gerar novos códigos de recuperação"
        aoFechar={() => setGerandoCodigos(false)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setGerandoCodigos(false)}>
              Cancelar
            </Button>
            <Button disabled={codigo.length !== 6} carregando={novosCodigos.isPending} onClick={() => novosCodigos.mutate()}>
              Gerar
            </Button>
          </>
        }
      >
        {novosCodigos.error && <AlertBanner tipo="erro">{mensagemDeErro(novosCodigos.error)}</AlertBanner>}
        <p>Os códigos anteriores deixam de valer.</p>
        <TextField
          rotulo="Código do app autenticador"
          inputMode="numeric"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
        />
      </Dialog>
      <Dialog
        aberto={desativando}
        titulo="Desativar a verificação em duas etapas"
        aoFechar={() => setDesativando(false)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setDesativando(false)}>
              Cancelar
            </Button>
            <Button disabled={!senha || codigo.length !== 6} carregando={desativar.isPending} onClick={() => desativar.mutate()}>
              Desativar
            </Button>
          </>
        }
      >
        {desativar.error && <AlertBanner tipo="erro">{mensagemDeErro(desativar.error)}</AlertBanner>}
        <p>Provas que exigem a verificação em duas etapas deixarão de poder ser iniciadas.</p>
        <TextField rotulo="Senha atual" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <TextField
          rotulo="Código do app autenticador"
          inputMode="numeric"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
        />
      </Dialog>
    </Card>
  )
}

function descreverNavegador(ua: string | null): string {
  if (!ua) return 'Navegador desconhecido'
  const nav = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  const so = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return so ? `${nav} · ${so}` : nav
}

/** Sessões abertas da conta, com encerramento individual ou das demais (ADR-0034). */
export function CartaoSessoes() {
  const { sair } = useAuth()
  const cliente = useQueryClient()
  const sessoes = useQuery({ queryKey: ['minha-conta', 'sessoes'], queryFn: () => api<SessaoAtiva[]>('/minha-conta/sessoes') })
  const atualizar = () => void cliente.invalidateQueries({ queryKey: ['minha-conta', 'sessoes'] })
  const encerrar = useMutation({
    mutationFn: (s: SessaoAtiva) => api<{ atual: boolean }>(`/minha-conta/sessoes/${s.id}`, { method: 'DELETE' }),
    onSuccess: (r) => (r.atual ? void sair() : atualizar()),
  })
  const encerrarOutras = useMutation({
    mutationFn: () => api('/minha-conta/sessoes/encerrar-outras', { method: 'POST' }),
    onSuccess: atualizar,
  })
  const outras = (sessoes.data ?? []).filter((s) => !s.atual).length

  return (
    <Card>
      <h2>Sessões abertas</h2>
      <p className="qz-cta-descricao">
        Onde a sua conta está conectada. Se não reconhecer alguma, encerre-a e troque a senha. O encerramento vale em até 30
        segundos.
      </p>
      {(encerrar.error || encerrarOutras.error) && (
        <AlertBanner tipo="erro">{mensagemDeErro(encerrar.error ?? encerrarOutras.error)}</AlertBanner>
      )}
      <DataTable
        rotulo="Sessões abertas"
        chaveLinha={(s) => s.id}
        linhas={sessoes.data ?? []}
        carregando={sessoes.isPending}
        vazio="Nenhuma sessão."
        colunas={[
          {
            chave: 'disp',
            titulo: 'Dispositivo',
            render: (s) => (
              <>
                {descreverNavegador(s.userAgent)} {s.atual && <StatusBadge status="ATUAL" tom="info" rotulo="esta sessão" />}
                <div className="qz-suave qz-pequeno">{s.ip ?? 'IP desconhecido'}</div>
              </>
            ),
          },
          { chave: 'inicio', titulo: 'Entrou em', render: (s) => formatarDataHora(s.criadoEm) },
          { chave: 'uso', titulo: 'Último uso', render: (s) => formatarDataHora(s.ultimoUsoEm) },
          {
            chave: 'acao',
            titulo: '',
            render: (s) => (
              <Button variante="fantasma" carregando={encerrar.isPending && encerrar.variables?.id === s.id} onClick={() => encerrar.mutate(s)}>
                {s.atual ? 'Sair' : 'Encerrar'}
              </Button>
            ),
          },
        ]}
      />
      {outras > 0 && (
        <div className="qz-cta-rodape">
          <Button variante="secundario" carregando={encerrarOutras.isPending} onClick={() => encerrarOutras.mutate()}>
            Encerrar as outras {outras} sessões
          </Button>
        </div>
      )}
    </Card>
  )
}

/** Preferências de aviso (cópia das notificações por e-mail, quando o servidor envia e-mail). */
export function CartaoPreferencias() {
  const { usuario, atualizarUsuario } = useAuth()
  const recursos = useRecursos()
  const [ligado, setLigado] = useState(usuario?.notificacoesPorEmail ?? true)
  const salvar = useMutation({
    mutationFn: (v: boolean) =>
      api<{ notificacoesPorEmail: boolean }>('/minha-conta/preferencias', { method: 'PATCH', body: { notificacoesPorEmail: v } }),
    onSuccess: (r) => {
      setLigado(r.notificacoesPorEmail)
      // Atualiza o usuário da sessão: a aba é desmontada ao trocar e voltaria com o valor antigo.
      void atualizarUsuario().catch(() => undefined)
    },
  })
  if (!recursos.data?.emailHabilitado) return null
  return (
    <Card>
      <h2>Avisos por e-mail</h2>
      {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
      <Interruptor
        rotulo="Receber também por e-mail"
        descricao="Os avisos do sino (prova disponível, resultado publicado, recursos…) chegam também no seu e-mail."
        checked={ligado}
        disabled={salvar.isPending}
        onChange={(e) => salvar.mutate(e.target.checked)}
      />
    </Card>
  )
}
