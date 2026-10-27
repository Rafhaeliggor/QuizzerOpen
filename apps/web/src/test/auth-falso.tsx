import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { UsuarioSessao } from '../api/tipos'
import { ContextoAuth, type ValorAuth } from '../auth/contexto'

export function usuarioFalso(parcial: Partial<UsuarioSessao> = {}): UsuarioSessao {
  return {
    id: 'u1',
    nome: 'Ana Souza',
    email: 'ana@teste.local',
    matricula: null,
    papel: 'PROFESSOR',
    ambiente: 'PROFISSIONAL',
    mfaHabilitado: false,
    trocarSenha: false,
    ...parcial,
  }
}

export function authFalso(parcial: Partial<ValorAuth> = {}): ValorAuth {
  return {
    estado: 'anonimo',
    usuario: null,
    pendenciaMfa: null,
    entrar: vi.fn(),
    iniciarCadastroMfa: vi.fn(),
    verificarMfa: vi.fn(),
    trocarSenha: vi.fn(),
    atualizarUsuario: vi.fn(),
    sair: vi.fn(),
    ...parcial,
  }
}

/** Contexto de autenticação falso + cliente do TanStack Query (telas que consultam a API). */
export function ComAuth({ valor, children }: { valor: ValorAuth; children: ReactNode }) {
  const [cliente] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return (
    <QueryClientProvider client={cliente}>
      <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>
    </QueryClientProvider>
  )
}
