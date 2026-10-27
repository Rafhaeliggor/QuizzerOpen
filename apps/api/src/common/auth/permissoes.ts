import type { Papel } from '../../generated/prisma/enums.js';

/**
 * Catálogo de permissões delegáveis (RF02): ações hoje restritas à gestão que podem ser
 * concedidas a um professor ou corretor específico, sem mudar o papel (ADR-0033).
 */
export const PERMISSOES_DELEGAVEIS = {
  REABRIR_TENTATIVAS: 'Reabrir tentativas encerradas das aplicações que já vê (com justificativa)',
  DESBLOQUEAR_CONTAS: 'Consultar usuários e desbloquear contas bloqueadas por tentativas de login',
  CONSULTAR_AUDITORIA: 'Consultar o registro de auditoria',
} as const;

export type PermissaoDelegavel = keyof typeof PERMISSOES_DELEGAVEIS;

/** Quem pode RECEBER uma delegação (gestão já tem tudo; aluno nunca recebe). */
export const PAPEIS_DELEGATARIOS: readonly Papel[] = ['PROFESSOR', 'CORRETOR'];

export function ehPermissaoDelegavel(p: string): p is PermissaoDelegavel {
  return Object.hasOwn(PERMISSOES_DELEGAVEIS, p);
}
