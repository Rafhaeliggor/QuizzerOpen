import type { Papel } from '../api/tipos'

export const PAPEIS_GESTAO: Papel[] = ['ADMINISTRADOR', 'COORDENADOR']
export const PAPEIS_AUTORIA: Papel[] = ['ADMINISTRADOR', 'COORDENADOR', 'PROFESSOR']
export const PAPEIS_CORRECAO: Papel[] = ['ADMINISTRADOR', 'COORDENADOR', 'PROFESSOR', 'CORRETOR']

export const ehGestor = (p: Papel) => PAPEIS_GESTAO.includes(p)

/** Papéis que já têm cada permissão delegável; outros só com delegação (RF02 — ADR-0033). */
const PAPEIS_DA_PERMISSAO: Record<string, Papel[]> = {
  REABRIR_TENTATIVAS: PAPEIS_GESTAO,
  DESBLOQUEAR_CONTAS: PAPEIS_GESTAO,
  CONSULTAR_AUDITORIA: ['ADMINISTRADOR'],
}

export function podeDelegado(usuario: { papel: Papel; permissoes?: string[] }, permissao: string): boolean {
  return (PAPEIS_DA_PERMISSAO[permissao] ?? []).includes(usuario.papel) || !!usuario.permissoes?.includes(permissao)
}
