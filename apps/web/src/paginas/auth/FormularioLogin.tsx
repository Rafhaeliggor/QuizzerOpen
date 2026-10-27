import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { mensagemDeErro } from '../../api/cliente'
import type { Ambiente } from '../../api/tipos'
import { rotaInicial, useAuth } from '../../auth/contexto'
import { AlertBanner, Button, TextField } from '../../design-system'
import { LayoutAuth } from '../../layouts/LayoutAuth'
import { useRecursos } from '../../api/recursos'

const TEXTOS: Record<Ambiente, { titulo: string; subtitulo: string; rotuloLogin: string; tipoLogin: string; outro: { texto: string; para: string } }> = {
  PROFISSIONAL: {
    titulo: 'Acesso profissional',
    subtitulo: 'Professores, coordenadores, corretores e administradores',
    rotuloLogin: 'E-mail',
    tipoLogin: 'email',
    outro: { texto: 'É aluno? Acesse o ambiente do aluno', para: '/aluno/login' },
  },
  ALUNO: {
    titulo: 'Acesso do aluno',
    subtitulo: 'Entre para ver e responder suas provas',
    rotuloLogin: 'E-mail ou matrícula',
    tipoLogin: 'text',
    outro: { texto: 'Acesso profissional', para: '/login' },
  },
}

/** Login segmentado por ambiente (RF01, passo 1). */
export function FormularioLogin({ ambiente }: { ambiente: Ambiente }) {
  const textos = TEXTOS[ambiente]
  const { usuario, entrar } = useAuth()
  const recursos = useRecursos()
  const navegar = useNavigate()
  const local = useLocation()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const destino = (local.state as { de?: string } | null)?.de

  // Já autenticado (inclusive logo após o login): segue para o destino.
  if (usuario) return <Navigate to={destino ?? rotaInicial(usuario.ambiente)} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const resultado = await entrar(ambiente, login, senha)
      // O ambiente vai no state para, ao recarregar /mfa (pendência perdida), voltar ao login certo.
      if (resultado === 'MFA') navegar('/mfa', { state: { ...(local.state as object | null), ambiente } })
    } catch (err) {
      setErro(mensagemDeErro(err))
      setSenha('')
      setEnviando(false)
    }
  }

  return (
    <LayoutAuth
      titulo={textos.titulo}
      subtitulo={textos.subtitulo}
      rodape={
        <span className="qz-pilha" style={{ gap: 6 }}>
          {recursos.data?.emailHabilitado && (
            <Link to={ambiente === 'ALUNO' ? '/aluno/esqueci-senha' : '/esqueci-senha'}>Esqueci minha senha</Link>
          )}
          <Link to={textos.outro.para}>{textos.outro.texto}</Link>
          <Link to="/p">Tenho um código de acesso (prova pública)</Link>
        </span>
      }
    >
      <form onSubmit={enviar} noValidate>
        {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}
        <TextField
          rotulo={textos.rotuloLogin}
          type={textos.tipoLogin}
          autoComplete="username"
          required
          autoFocus
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <TextField
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Button type="submit" largo carregando={enviando} disabled={!login || !senha}>
          Entrar
        </Button>
      </form>
    </LayoutAuth>
  )
}
