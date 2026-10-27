import type { Papel } from '../../generated/prisma/enums.js';
import type { UsuarioAutenticado } from './tipos.js';

/** Papéis com visão institucional (veem recursos de todos os professores). */
export const PAPEIS_GESTAO: Papel[] = ['ADMINISTRADOR', 'COORDENADOR'];

/** Papéis que criam questões, turmas e provas. */
export const PAPEIS_AUTORIA: Papel[] = ['ADMINISTRADOR', 'COORDENADOR', 'PROFESSOR'];

/** Papéis que corrigem questões abertas. */
export const PAPEIS_CORRECAO: Papel[] = ['ADMINISTRADOR', 'COORDENADOR', 'PROFESSOR', 'CORRETOR'];

export function ehGestor(usuario: Pick<UsuarioAutenticado, 'papel'>): boolean {
  return PAPEIS_GESTAO.includes(usuario.papel);
}
