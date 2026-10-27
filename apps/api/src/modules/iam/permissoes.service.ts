import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ehPermissaoDelegavel,
  PAPEIS_DELEGATARIOS,
  PERMISSOES_DELEGAVEIS,
  type PermissaoDelegavel,
} from '../../common/auth/permissoes.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';

const CACHE_MS = 30_000;

/** RF02 — Delegação de permissão específica sem alterar o papel (ADR-0033). */
@Injectable()
export class PermissoesService {
  /** usuarioId → permissões, por até 30 s (revogação vale em até 30 s, como a de sessão). */
  private readonly cache = new Map<string, { permissoes: Set<string>; validoAte: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  catalogo() {
    return Object.entries(PERMISSOES_DELEGAVEIS).map(([codigo, descricao]) => ({ codigo, descricao }));
  }

  async doUsuario(usuarioId: string): Promise<string[]> {
    const agora = Date.now();
    const emCache = this.cache.get(usuarioId);
    if (emCache && emCache.validoAte > agora) return [...emCache.permissoes];
    const linhas = await this.prisma.permissaoDelegada.findMany({
      where: { usuarioId, OR: [{ expiraEm: null }, { expiraEm: { gt: new Date() } }] },
      select: { permissao: true },
    });
    const permissoes = new Set(linhas.map((l) => l.permissao).filter(ehPermissaoDelegavel));
    if (this.cache.size > 10_000) this.cache.clear();
    this.cache.set(usuarioId, { permissoes, validoAte: agora + CACHE_MS });
    return [...permissoes];
  }

  async possui(usuarioId: string, permissao: PermissaoDelegavel): Promise<boolean> {
    return (await this.doUsuario(usuarioId)).includes(permissao);
  }

  async listar(usuarioId: string) {
    const linhas = await this.prisma.permissaoDelegada.findMany({
      where: { usuarioId },
      include: { concedidoPor: { select: { nome: true } } },
      orderBy: { criadoEm: 'asc' },
    });
    return linhas.map((l) => ({
      permissao: l.permissao,
      descricao: ehPermissaoDelegavel(l.permissao) ? PERMISSOES_DELEGAVEIS[l.permissao] : l.permissao,
      concedidoPor: l.concedidoPor.nome,
      criadoEm: l.criadoEm,
      expiraEm: l.expiraEm,
      expirada: !!l.expiraEm && l.expiraEm <= new Date(),
    }));
  }

  async conceder(gestor: UsuarioAutenticado, usuarioId: string, permissao: string, justificativa: string, expiraEm?: Date) {
    await this.validar(gestor, usuarioId, permissao);
    await this.prisma.permissaoDelegada.upsert({
      where: { usuarioId_permissao: { usuarioId, permissao } },
      create: { usuarioId, permissao, concedidoPorId: gestor.id, expiraEm: expiraEm ?? null },
      // Renovar a concessão atualiza a validade e quem concedeu.
      update: { concedidoPorId: gestor.id, expiraEm: expiraEm ?? null },
    });
    this.cache.delete(usuarioId);
    await this.auditoria.registrar({
      usuarioId: gestor.id,
      acao: 'PERMISSAO_CONCEDIDA',
      recurso: 'usuario',
      recursoId: usuarioId,
      justificativa,
      dados: { permissao, expiraEm: expiraEm?.toISOString() ?? null },
    });
    return this.listar(usuarioId);
  }

  async revogar(gestor: UsuarioAutenticado, usuarioId: string, permissao: string, justificativa: string) {
    await this.validar(gestor, usuarioId, permissao);
    const { count } = await this.prisma.permissaoDelegada.deleteMany({ where: { usuarioId, permissao } });
    this.cache.delete(usuarioId);
    if (count) {
      await this.auditoria.registrar({
        usuarioId: gestor.id,
        acao: 'PERMISSAO_REVOGADA',
        recurso: 'usuario',
        recursoId: usuarioId,
        justificativa,
        dados: { permissao },
      });
    }
    return this.listar(usuarioId);
  }

  /** Mudança de papel ou desativação: delegações não sobrevivem (chamado pelo módulo de usuários). */
  async revogarTodas(usuarioId: string) {
    await this.prisma.permissaoDelegada.deleteMany({ where: { usuarioId } });
    this.cache.delete(usuarioId);
  }

  private async validar(gestor: UsuarioAutenticado, usuarioId: string, permissao: string) {
    if (!ehPermissaoDelegavel(permissao)) throw new BadRequestException('Permissão desconhecida');
    if (usuarioId === gestor.id) throw new ForbiddenException('Não é possível delegar permissões a si mesmo');
    const alvo = await this.prisma.usuario.findUnique({ where: { id: usuarioId }, select: { papel: true } });
    if (!alvo) throw new NotFoundException('Usuário não encontrado');
    if (!PAPEIS_DELEGATARIOS.includes(alvo.papel)) {
      throw new BadRequestException('Só professores e corretores recebem permissões delegadas');
    }
  }
}
