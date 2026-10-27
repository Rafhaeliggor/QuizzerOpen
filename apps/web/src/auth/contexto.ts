import { createContext, useContext } from 'react'
import type { Ambiente, DadosCadastroMfa, UsuarioSessao } from '../api/tipos'

export interface PendenciaMfa {
  mfaToken: string
  tipo: 'MFA_REQUERIDO' | 'MFA_CADASTRO_REQUERIDO'
  ambiente: Ambiente
}

export type ResultadoEntrada = 'AUTENTICADO' | 'MFA'

export interface ValorAuth {
  estado: 'carregando' | 'anonimo' | 'autenticado'
  usuario: UsuarioSessao | null
  /** Token intermediário entre senha e segundo fator — só em memória. */
  pendenciaMfa: PendenciaMfa | null
  entrar(ambiente: Ambiente, login: string, senha: string): Promise<ResultadoEntrada>
  iniciarCadastroMfa(): Promise<DadosCadastroMfa>
  verificarMfa(codigo: string): Promise<void>
  trocarSenha(senhaAtual: string, novaSenha: string): Promise<void>
  atualizarUsuario(): Promise<void>
  sair(): Promise<void>
}

export const ContextoAuth = createContext<ValorAuth | null>(null)

export function useAuth(): ValorAuth {
  const valor = useContext(ContextoAuth)
  if (!valor) throw new Error('useAuth deve ser usado dentro de <ProvedorAuth>')
  return valor
}

/** Rota inicial de cada ambiente após o login. */
export function rotaInicial(ambiente: Ambiente): string {
  return ambiente === 'ALUNO' ? '/aluno' : '/app'
}

export function rotaLogin(ambiente: Ambiente): string {
  return ambiente === 'ALUNO' ? '/aluno/login' : '/login'
}
