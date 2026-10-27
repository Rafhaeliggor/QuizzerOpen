import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Ambiente, Papel } from '../../generated/prisma/enums.js';
import { PermissoesService } from '../../modules/iam/permissoes.service.js';
import { SessaoService } from '../../modules/iam/sessao.service.js';
import {
  CHAVE_AMBIENTE,
  CHAVE_DELEGAVEL,
  CHAVE_PAPEIS,
  CHAVE_PUBLICO,
  CHAVE_SENHA_PENDENTE,
} from './decorators.js';
import type { PermissaoDelegavel } from './permissoes.js';
import {
  AccessTokenPayload,
  ambienteDoPapel,
  AUDIENCIA_ACCESS,
} from './tipos.js';

/**
 * Guard global: autentica (JWT) e autoriza (papel + ambiente) toda requisição.
 * Rotas são protegidas por padrão; só `@Publico()` dispensa token.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly sessoes: SessaoService,
    private readonly permissoes: PermissoesService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CHAVE_PUBLICO, alvos))
      return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extrairBearer(req);
    if (!token) throw new UnauthorizedException('Token de acesso ausente');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        audience: AUDIENCIA_ACCESS,
      });
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado');
    }

    // Defesa em profundidade: o ambiente do token deve ser coerente com o papel.
    if (payload.amb !== ambienteDoPapel(payload.papel)) {
      throw new UnauthorizedException('Token de acesso inválido');
    }

    // Revogação: logout, desativação, troca de papel/senha cortam o acesso (ADR-0027).
    if (!(await this.sessoes.estaAtiva(payload.sid))) {
      throw new UnauthorizedException({ message: 'Sessão encerrada', codigo: 'SESSAO_INVALIDA' });
    }

    req.usuario = {
      id: payload.sub,
      papel: payload.papel,
      ambiente: payload.amb,
      sessaoId: payload.sid,
      trocarSenhaPendente: payload.trs,
    };

    if (
      payload.trs &&
      !this.reflector.getAllAndOverride<boolean>(CHAVE_SENHA_PENDENTE, alvos)
    ) {
      throw new ForbiddenException({
        message: 'Troca de senha obrigatória antes de continuar',
        codigo: 'TROCA_SENHA_OBRIGATORIA',
      });
    }

    const ambiente = this.reflector.getAllAndOverride<Ambiente | undefined>(
      CHAVE_AMBIENTE,
      alvos,
    );
    if (ambiente && payload.amb !== ambiente) {
      throw new ForbiddenException('Recurso não disponível neste ambiente');
    }

    const papeis = this.reflector.getAllAndOverride<Papel[] | undefined>(
      CHAVE_PAPEIS,
      alvos,
    );
    if (papeis && !papeis.includes(payload.papel)) {
      const delegavel = this.reflector.getAllAndOverride<PermissaoDelegavel | undefined>(CHAVE_DELEGAVEL, alvos);
      if (!delegavel || !(await this.permissoes.possui(payload.sub, delegavel))) {
        throw new ForbiddenException('Permissão insuficiente');
      }
    }

    return true;
  }

  private extrairBearer(req: Request): string | undefined {
    const [tipo, valor] = req.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && valor ? valor : undefined;
  }
}
