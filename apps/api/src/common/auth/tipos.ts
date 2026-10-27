import type { Ambiente, Papel } from '../../generated/prisma/enums.js';

export const AUDIENCIA_ACCESS = 'quizzer-api';
export const AUDIENCIA_MFA = 'quizzer-mfa';

/** Payload do access token (JWT curto, enviado no header Authorization). */
export interface AccessTokenPayload {
  sub: string;
  papel: Papel;
  amb: Ambiente;
  /** Id da sessão (iam.sessoes) que originou o token. */
  sid: string;
  /** Troca de senha pendente: token só acessa rotas liberadas para isso. */
  trs: boolean;
}

/** Payload do token intermediário entre senha válida e segundo fator. */
export interface MfaTokenPayload {
  sub: string;
  amb: Ambiente;
  fin: 'verificacao' | 'cadastro';
}

/** Usuário autenticado anexado à requisição pelo AuthGuard. */
export interface UsuarioAutenticado {
  id: string;
  papel: Papel;
  ambiente: Ambiente;
  sessaoId: string;
  trocarSenhaPendente: boolean;
}

/** Papéis que exigem MFA obrigatório (RNF05 / plano de sprints). */
export const PAPEIS_MFA_OBRIGATORIO: readonly Papel[] = [
  'ADMINISTRADOR',
  'COORDENADOR',
];

/** Ambiente a que cada papel pertence — isolamento estrito profissional × aluno. */
export function ambienteDoPapel(papel: Papel): Ambiente {
  return papel === 'ALUNO' ? 'ALUNO' : 'PROFISSIONAL';
}

declare module 'express' {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}
