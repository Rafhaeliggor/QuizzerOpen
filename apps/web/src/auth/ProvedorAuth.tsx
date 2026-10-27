import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, definirAccessToken, registrarAoExpirarSessao, renovarSessao } from '../api/cliente'
import type { Ambiente, DadosCadastroMfa, RespostaLogin, Usuario, UsuarioSessao } from '../api/tipos'
import { ContextoAuth, type PendenciaMfa, type ResultadoEntrada, type ValorAuth } from './contexto'

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<ValorAuth['estado']>('carregando')
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null)
  const [pendenciaMfa, setPendenciaMfa] = useState<PendenciaMfa | null>(null)

  const encerrarLocalmente = useCallback(() => {
    definirAccessToken(null)
    setUsuario(null)
    setPendenciaMfa(null)
    setEstado('anonimo')
  }, [])

  // Ao abrir o app, tenta restaurar a sessão a partir do cookie de refresh.
  useEffect(() => {
    registrarAoExpirarSessao(encerrarLocalmente)
    let ativo = true
    void (async () => {
      const token = await renovarSessao()
      if (!ativo) return
      if (!token) return setEstado('anonimo')
      try {
        const me = await api<UsuarioSessao>('/auth/me')
        if (!ativo) return
        setUsuario(me)
        setEstado('autenticado')
      } catch {
        if (ativo) encerrarLocalmente()
      }
    })()
    return () => {
      ativo = false
    }
  }, [encerrarLocalmente])

  const aplicarAutenticacao = useCallback((accessToken: string, u: UsuarioSessao) => {
    definirAccessToken(accessToken)
    setUsuario(u)
    setPendenciaMfa(null)
    setEstado('autenticado')
  }, [])

  const entrar = useCallback(
    async (ambiente: Ambiente, login: string, senha: string): Promise<ResultadoEntrada> => {
      const resposta =
        ambiente === 'ALUNO'
          ? await api<RespostaLogin>('/auth/aluno/login', { method: 'POST', body: { login, senha }, semRenovacao: true })
          : await api<RespostaLogin>('/auth/profissional/login', {
              method: 'POST',
              body: { email: login, senha },
              semRenovacao: true,
            })
      if (resposta.status === 'AUTENTICADO') {
        aplicarAutenticacao(resposta.accessToken, resposta.usuario)
        return 'AUTENTICADO'
      }
      setPendenciaMfa({ mfaToken: resposta.mfaToken, tipo: resposta.status, ambiente })
      return 'MFA'
    },
    [aplicarAutenticacao],
  )

  const iniciarCadastroMfa = useCallback(async () => {
    if (!pendenciaMfa) throw new Error('Nenhuma verificação pendente')
    return api<DadosCadastroMfa>('/auth/mfa/cadastro', {
      method: 'POST',
      body: { mfaToken: pendenciaMfa.mfaToken },
      semRenovacao: true,
    })
  }, [pendenciaMfa])

  const verificarMfa = useCallback(
    async (codigo: string) => {
      if (!pendenciaMfa) throw new Error('Nenhuma verificação pendente')
      const resposta = await api<RespostaLogin>('/auth/mfa/verificar', {
        method: 'POST',
        body: { mfaToken: pendenciaMfa.mfaToken, codigo },
        semRenovacao: true,
      })
      if (resposta.status !== 'AUTENTICADO') throw new Error('Resposta inesperada do servidor')
      aplicarAutenticacao(resposta.accessToken, resposta.usuario)
    },
    [pendenciaMfa, aplicarAutenticacao],
  )

  const trocarSenha = useCallback(
    async (senhaAtual: string, novaSenha: string) => {
      const resposta = await api<{ accessToken: string; usuario: Usuario }>('/auth/senha', {
        method: 'POST',
        body: { senhaAtual, novaSenha },
      })
      if (!usuario) return
      aplicarAutenticacao(resposta.accessToken, { ...resposta.usuario, ambiente: usuario.ambiente })
    },
    [usuario, aplicarAutenticacao],
  )

  /** Relê o usuário da sessão (permissões delegadas, preferências) sem novo login. */
  const atualizarUsuario = useCallback(async () => {
    const me = await api<UsuarioSessao>('/auth/me')
    setUsuario((atual) => (atual ? me : atual))
  }, [])

  // Delegações concedidas ou revogadas chegam aos menus e botões em até 30 s (e ao voltar para a aba).
  const ambiente = usuario?.ambiente
  useEffect(() => {
    if (estado !== 'autenticado' || ambiente !== 'PROFISSIONAL') return
    const atualizar = () => void atualizarUsuario().catch(() => undefined)
    const intervalo = window.setInterval(atualizar, 30_000)
    const aoVoltar = () => document.visibilityState === 'visible' && atualizar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [estado, ambiente, atualizarUsuario])

  const sair = useCallback(async () => {
    try {
      // Com renovação: se o access token venceu, renova e revoga a sessão de fato (senão o cookie de refresh sobrevive).
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // Sessão já inválida no servidor (refresh recusado): basta encerrar localmente.
    } finally {
      encerrarLocalmente()
    }
  }, [encerrarLocalmente])

  const valor = useMemo<ValorAuth>(
    () => ({ estado, usuario, pendenciaMfa, entrar, iniciarCadastroMfa, verificarMfa, trocarSenha, atualizarUsuario, sair }),
    [estado, usuario, pendenciaMfa, entrar, iniciarCadastroMfa, verificarMfa, trocarSenha, atualizarUsuario, sair],
  )

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>
}
