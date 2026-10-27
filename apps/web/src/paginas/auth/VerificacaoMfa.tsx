import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import type { Ambiente, DadosCadastroMfa } from '../../api/tipos'
import { rotaInicial, rotaLogin, useAuth } from '../../auth/contexto'
import { AlertBanner, Button, Spinner, TextField } from '../../design-system'
import { LayoutAuth } from '../../layouts/LayoutAuth'
import { mensagemDeErro } from '../../api/cliente'

/**
 * Segundo fator (TOTP). Dois modos:
 * - MFA_CADASTRO_REQUERIDO: primeiro acesso de Admin/Coordenador — mostra QR code e confirma com um código;
 * - MFA_REQUERIDO: pede apenas o código do app autenticador.
 */
export function VerificacaoMfa() {
  const { usuario, pendenciaMfa, iniciarCadastroMfa, verificarMfa } = useAuth()
  const local = useLocation()
  const { de: destino, ambiente } = (local.state as { de?: string; ambiente?: Ambiente } | null) ?? {}
  const [cadastro, setCadastro] = useState<DadosCadastroMfa | null>(null)
  const [codigo, setCodigo] = useState('')
  /** Perdeu o celular: usa um código de recuperação (só no login, não no cadastro — ADR-0042). */
  const [recuperacao, setRecuperacao] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const cadastroSolicitado = useRef(false)

  const ehCadastro = pendenciaMfa?.tipo === 'MFA_CADASTRO_REQUERIDO'

  useEffect(() => {
    // useRef evita gerar dois segredos (StrictMode executa efeitos duas vezes em dev).
    if (!ehCadastro || cadastroSolicitado.current) return
    cadastroSolicitado.current = true
    iniciarCadastroMfa()
      .then(setCadastro)
      .catch((err: unknown) => setErro(mensagemDeErro(err)))
  }, [ehCadastro, iniciarCadastroMfa])

  // Após verificar, a pendência some e o usuário fica autenticado: segue para o destino.
  if (usuario) return <Navigate to={destino ?? rotaInicial(usuario.ambiente)} replace />
  if (!pendenciaMfa) return <Navigate to={rotaLogin(ambiente ?? 'PROFISSIONAL')} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!pendenciaMfa) return
    setErro(null)
    setEnviando(true)
    try {
      await verificarMfa(codigo)
    } catch (err) {
      setErro(mensagemDeErro(err))
      setCodigo('')
      setEnviando(false)
    }
  }

  return (
    <LayoutAuth
      titulo={ehCadastro ? 'Configure a verificação em duas etapas' : 'Verificação em duas etapas'}
      subtitulo={
        ehCadastro
          ? 'Obrigatória para o seu perfil. Use um app autenticador (Google Authenticator, Microsoft Authenticator, Authy…).'
          : 'Digite o código de 6 dígitos exibido no seu app autenticador.'
      }
      rodape={<Link to={rotaLogin(pendenciaMfa.ambiente)}>Voltar ao login</Link>}
    >
      <form onSubmit={enviar} noValidate>
        {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}
        {ehCadastro &&
          (cadastro ? (
            <>
              <p style={{ marginTop: 0 }}>1. Escaneie o QR code no app autenticador:</p>
              <img className="qz-auth__qr" src={cadastro.qrCodeDataUrl} alt="QR code para configurar o app autenticador" />
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem' }}>Ou digite a chave manualmente:</p>
              <code className="qz-auth__segredo">{cadastro.segredo}</code>
              <p>2. Informe o código gerado para confirmar:</p>
            </>
          ) : (
            !erro && <Spinner rotulo="Gerando chave…" />
          ))}
        {recuperacao ? (
          <TextField
            rotulo="Código de recuperação"
            autoComplete="off"
            maxLength={9}
            required
            autoFocus
            ajuda="Um dos códigos guardados quando você ativou a verificação (ex.: ABCD-2345). Cada um vale uma vez."
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
          />
        ) : (
          <TextField
            rotulo="Código de verificação"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            required
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          />
        )}
        <Button
          type="submit"
          largo
          carregando={enviando}
          disabled={(recuperacao ? codigo.replace('-', '').length !== 8 : codigo.length !== 6) || (ehCadastro && !cadastro)}
        >
          Verificar
        </Button>
        {!ehCadastro && (
          <button
            type="button"
            className="qz-link qz-pequeno"
            style={{ marginTop: 12 }}
            onClick={() => {
              setRecuperacao((r) => !r)
              setCodigo('')
            }}
          >
            {recuperacao ? 'Usar o app autenticador' : 'Perdi o celular — usar um código de recuperação'}
          </button>
        )}
      </form>
    </LayoutAuth>
  )
}
