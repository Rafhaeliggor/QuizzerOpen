import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { PermissoesService } from '../../modules/iam/permissoes.service.js';
import type { SessaoService } from '../../modules/iam/sessao.service.js';
import { AuthGuard } from './auth.guard.js';
import {
  CHAVE_AMBIENTE,
  CHAVE_DELEGAVEL,
  CHAVE_PAPEIS,
  CHAVE_PUBLICO,
  CHAVE_SENHA_PENDENTE,
} from './decorators.js';
import {
  AccessTokenPayload,
  AUDIENCIA_ACCESS,
  AUDIENCIA_MFA,
} from './tipos.js';

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!';

describe('AuthGuard', () => {
  const jwt = new JwtService({ secret: SEGREDO });
  let metadados: Record<string, unknown>;
  let guard: AuthGuard;
  let sessaoAtiva = true;
  const sessoes = { estaAtiva: async () => sessaoAtiva } as unknown as SessaoService;
  let delegadas: string[] = [];
  const permissoes = {
    possui: async (_: string, p: string) => delegadas.includes(p),
  } as unknown as PermissoesService;

  beforeEach(() => {
    metadados = {};
    sessaoAtiva = true;
    delegadas = [];
    const reflector = {
      getAllAndOverride: (chave: string) => metadados[chave],
    } as unknown as Reflector;
    guard = new AuthGuard(reflector, jwt, sessoes, permissoes);
  });

  function contexto(authorization?: string) {
    const req: Record<string, unknown> = {
      headers: authorization ? { authorization } : {},
    };
    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { ctx, req };
  }

  function token(
    payload: Partial<AccessTokenPayload> = {},
    audience = AUDIENCIA_ACCESS,
  ) {
    return jwt.sign(
      {
        sub: 'u1',
        papel: 'PROFESSOR',
        amb: 'PROFISSIONAL',
        sid: 's1',
        trs: false,
        ...payload,
      },
      { audience, expiresIn: 60 },
    );
  }

  it('libera rota pública sem token', async () => {
    metadados[CHAVE_PUBLICO] = true;
    await expect(guard.canActivate(contexto().ctx)).resolves.toBe(true);
  });

  it('bloqueia requisição sem token', async () => {
    await expect(guard.canActivate(contexto().ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('autentica e anexa o usuário à requisição', async () => {
    const { ctx, req } = contexto(`Bearer ${token()}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.usuario).toEqual({
      id: 'u1',
      papel: 'PROFESSOR',
      ambiente: 'PROFISSIONAL',
      sessaoId: 's1',
      trocarSenhaPendente: false,
    });
  });

  it('rejeita token MFA usado como access token (audiência diferente)', async () => {
    const { ctx } = contexto(`Bearer ${token({}, AUDIENCIA_MFA)}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita token com ambiente incoerente com o papel', async () => {
    const { ctx } = contexto(
      `Bearer ${token({ papel: 'ALUNO', amb: 'PROFISSIONAL' })}`,
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('isola ambientes: token de aluno não acessa rota profissional', async () => {
    metadados[CHAVE_AMBIENTE] = 'PROFISSIONAL';
    const { ctx } = contexto(
      `Bearer ${token({ papel: 'ALUNO', amb: 'ALUNO' })}`,
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('nega papel não autorizado', async () => {
    metadados[CHAVE_PAPEIS] = ['ADMINISTRADOR'];
    const { ctx } = contexto(`Bearer ${token()}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('libera papel não autorizado quando a rota é delegável e a permissão foi concedida', async () => {
    metadados[CHAVE_PAPEIS] = ['ADMINISTRADOR'];
    metadados[CHAVE_DELEGAVEL] = 'REABRIR_TENTATIVAS';
    const bearer = `Bearer ${token()}`;
    await expect(guard.canActivate(contexto(bearer).ctx)).rejects.toBeInstanceOf(ForbiddenException);
    delegadas = ['CONSULTAR_AUDITORIA'];
    await expect(guard.canActivate(contexto(bearer).ctx)).rejects.toBeInstanceOf(ForbiddenException);
    delegadas = ['REABRIR_TENTATIVAS'];
    await expect(guard.canActivate(contexto(bearer).ctx)).resolves.toBe(true);
  });

  it('com troca de senha pendente, só permite rotas marcadas', async () => {
    const bearer = `Bearer ${token({ trs: true })}`;
    await expect(
      guard.canActivate(contexto(bearer).ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
    metadados[CHAVE_SENHA_PENDENTE] = true;
    await expect(guard.canActivate(contexto(bearer).ctx)).resolves.toBe(true);
  });

  it('rejeita token de sessão revogada (logout, desativação)', async () => {
    sessaoAtiva = false;
    await expect(guard.canActivate(contexto(`Bearer ${token()}`).ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
