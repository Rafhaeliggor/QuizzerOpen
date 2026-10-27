import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface EventoParaRegistrar {
  usuarioId?: string | null;
  acao: string;
  recurso: string;
  recursoId?: string | null;
  justificativa?: string | null;
  dados?: Prisma.InputJsonValue;
  ip?: string | null;
}

/**
 * Trilha de auditoria (RF11). A tabela aceita apenas INSERT (trigger no banco).
 * Falha ao auditar é logada como erro mas não desfaz a ação já executada.
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(evento: EventoParaRegistrar): Promise<void> {
    try {
      await this.prisma.eventoAuditoria.create({
        data: {
          usuarioId: evento.usuarioId ?? null,
          acao: evento.acao,
          recurso: evento.recurso,
          recursoId: evento.recursoId ?? null,
          justificativa: evento.justificativa ?? null,
          dados: evento.dados,
          ip: evento.ip ?? null,
        },
      });
    } catch (erro) {
      this.logger.error({ erro, acao: evento.acao }, 'Falha ao registrar auditoria');
    }
  }

  async listar(filtro: FiltroAuditoria & { pagina: number; tamanho: number }) {
    const where = this.where(filtro);
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.eventoAuditoria.count({ where }),
      this.prisma.eventoAuditoria.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (filtro.pagina - 1) * filtro.tamanho,
        take: filtro.tamanho,
      }),
    ]);
    return { total, pagina: filtro.pagina, tamanho: filtro.tamanho, itens };
  }

  /** Para exportação: no máximo `limite` eventos, mais recentes primeiro. */
  async exportar(filtro: FiltroAuditoria, limite = 10_000) {
    return this.prisma.eventoAuditoria.findMany({ where: this.where(filtro), orderBy: { criadoEm: 'desc' }, take: limite });
  }

  private where(filtro: FiltroAuditoria): Prisma.EventoAuditoriaWhereInput {
    return {
      ...(filtro.acao ? { acao: { contains: filtro.acao, mode: 'insensitive' } } : {}),
      ...(filtro.recurso ? { recurso: filtro.recurso } : {}),
      ...(filtro.usuarioId ? { usuarioId: filtro.usuarioId } : {}),
      ...(filtro.de || filtro.ate
        ? { criadoEm: { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lt: filtro.ate } : {}) } }
        : {}),
    };
  }
}

export interface FiltroAuditoria {
  acao?: string;
  recurso?: string;
  usuarioId?: string;
  de?: Date;
  /** Exclusivo. */
  ate?: Date;
}
