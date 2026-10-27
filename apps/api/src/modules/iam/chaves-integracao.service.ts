import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';

/** Escopos da API de integração (ADR-0051). */
export const ESCOPOS_INTEGRACAO = {
  'notas:ler': 'Ler resultados consolidados (notas por aluno e prova)',
  'turmas:ler': 'Listar turmas e matrículas',
  'turmas:escrever': 'Criar/atualizar turmas e sincronizar matrículas pelo código externo',
} as const;
export type EscopoIntegracao = keyof typeof ESCOPOS_INTEGRACAO;

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

export interface ChaveAutenticada {
  id: string;
  prefixo: string;
  nome: string;
  escopos: string[];
  criadoPorId: string;
}

/**
 * Chaves da API de integração. Token `qz_<prefixo>_<segredo>`: o prefixo (público) localiza a
 * chave; do segredo (256 bits) guardamos só o SHA-256. Mostrado uma vez, na criação.
 */
@Injectable()
export class ChavesIntegracaoService {
  /** Evita gravar "último uso" a cada requisição. */
  private readonly ultimoRegistro = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  catalogo() {
    return Object.entries(ESCOPOS_INTEGRACAO).map(([codigo, descricao]) => ({ codigo, descricao }));
  }

  async listar() {
    const chaves = await this.prisma.chaveIntegracao.findMany({ orderBy: { criadoEm: 'desc' } });
    return chaves.map((c) => ({
      id: c.id,
      nome: c.nome,
      prefixo: c.prefixo,
      escopos: c.escopos,
      criadoEm: c.criadoEm,
      expiraEm: c.expiraEm,
      ultimoUsoEm: c.ultimoUsoEm,
      revogadaEm: c.revogadaEm,
      ativa: !c.revogadaEm && (!c.expiraEm || c.expiraEm > new Date()),
    }));
  }

  async criar(admin: UsuarioAutenticado, dados: { nome: string; escopos: string[]; expiraEm?: Date }) {
    const escopos = [...new Set(dados.escopos)];
    if (escopos.length === 0 || escopos.some((e) => !Object.hasOwn(ESCOPOS_INTEGRACAO, e))) {
      throw new BadRequestException('Escopos inválidos');
    }
    const prefixo = randomBytes(6).toString('hex');
    const segredo = randomBytes(32).toString('base64url');
    const chave = await this.prisma.chaveIntegracao.create({
      data: { nome: dados.nome, prefixo, segredoHash: hash(segredo), escopos, criadoPorId: admin.id, expiraEm: dados.expiraEm ?? null },
    });
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'INTEGRACAO_CHAVE_CRIADA',
      recurso: 'chave_integracao',
      recursoId: chave.id,
      dados: { nome: dados.nome, escopos, prefixo },
    });
    return { id: chave.id, nome: chave.nome, prefixo, escopos, token: `qz_${prefixo}_${segredo}` };
  }

  async revogar(admin: UsuarioAutenticado, id: string) {
    const c = await this.prisma.chaveIntegracao.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Chave não encontrada');
    if (!c.revogadaEm) {
      await this.prisma.chaveIntegracao.update({ where: { id }, data: { revogadaEm: new Date() } });
      await this.auditoria.registrar({ usuarioId: admin.id, acao: 'INTEGRACAO_CHAVE_REVOGADA', recurso: 'chave_integracao', recursoId: id });
    }
    return { id, revogada: true };
  }

  /** Valida o token; lança 401 sem detalhar o motivo. */
  async autenticar(token: string | undefined): Promise<ChaveAutenticada> {
    const m = /^qz_([0-9a-f]{12})_([A-Za-z0-9_-]{43})$/.exec(token ?? '');
    const negar = () => new UnauthorizedException({ message: 'Chave de integração inválida', codigo: 'CHAVE_INVALIDA' });
    if (!m) throw negar();
    const c = await this.prisma.chaveIntegracao.findUnique({ where: { prefixo: m[1] } });
    const esperado = Buffer.from(c?.segredoHash ?? '0'.repeat(64), 'hex');
    const recebido = Buffer.from(hash(m[2]!), 'hex');
    const confere = esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
    if (!c || !confere || c.revogadaEm || (c.expiraEm && c.expiraEm <= new Date())) throw negar();
    const agora = Date.now();
    if ((this.ultimoRegistro.get(c.id) ?? 0) < agora - 60_000) {
      this.ultimoRegistro.set(c.id, agora);
      await this.prisma.chaveIntegracao.update({ where: { id: c.id }, data: { ultimoUsoEm: new Date() } });
    }
    return { id: c.id, prefixo: c.prefixo, nome: c.nome, escopos: c.escopos, criadoPorId: c.criadoPorId };
  }
}
