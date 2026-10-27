import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ChavesIntegracaoService, type ChaveAutenticada, type EscopoIntegracao } from '../iam/chaves-integracao.service.js';

const CHAVE_ESCOPO = 'integracao:escopo';
/** Escopo exigido da chave de integração nesta rota. */
export const Escopo = (escopo: EscopoIntegracao) => SetMetadata(CHAVE_ESCOPO, escopo);

declare module 'express' {
  interface Request {
    integracao?: ChaveAutenticada;
  }
}

/** Autentica a chave `qz_…` do header Authorization e confere o escopo (ADR-0051). */
@Injectable()
export class IntegracaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly chaves: ChavesIntegracaoService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    const chave = await this.chaves.autenticar(tipo === 'Bearer' ? token : undefined);
    const escopo = this.reflector.get<EscopoIntegracao | undefined>(CHAVE_ESCOPO, ctx.getHandler());
    if (escopo && !chave.escopos.includes(escopo)) {
      throw new ForbiddenException({ message: `A chave não tem o escopo ${escopo}`, codigo: 'ESCOPO_INSUFICIENTE' });
    }
    req.integracao = chave;
    return true;
  }
}
