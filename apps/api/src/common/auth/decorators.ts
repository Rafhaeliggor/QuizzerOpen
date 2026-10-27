import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Ambiente, Papel } from '../../generated/prisma/enums.js';
import type { PermissaoDelegavel } from './permissoes.js';
import type { UsuarioAutenticado } from './tipos.js';

export const CHAVE_PUBLICO = 'auth:publico';
export const CHAVE_PAPEIS = 'auth:papeis';
export const CHAVE_AMBIENTE = 'auth:ambiente';
export const CHAVE_SENHA_PENDENTE = 'auth:permite-senha-pendente';
export const CHAVE_DELEGAVEL = 'auth:delegavel';

/** Rota acessível sem autenticação. Tudo é protegido por padrão. */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);

/** Restringe a rota aos papéis informados. */
export const Papeis = (...papeis: Papel[]) => SetMetadata(CHAVE_PAPEIS, papeis);

/**
 * Quem não tem o papel exigido por `@Papeis` ainda passa se recebeu esta permissão
 * por delegação (RF02 — ADR-0033).
 */
export const Delegavel = (permissao: PermissaoDelegavel) => SetMetadata(CHAVE_DELEGAVEL, permissao);

/** Restringe a rota a tokens emitidos para um ambiente (profissional ou aluno). */
export const AmbienteRequerido = (ambiente: Ambiente) =>
  SetMetadata(CHAVE_AMBIENTE, ambiente);

/** Libera a rota mesmo com troca de senha pendente (ex.: a própria troca de senha). */
export const PermiteSenhaPendente = () =>
  SetMetadata(CHAVE_SENHA_PENDENTE, true);

export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.usuario) throw new Error('UsuarioAtual usado em rota pública');
    return req.usuario;
  },
);
