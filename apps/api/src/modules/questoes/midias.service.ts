import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import type { Env } from '../../config/env.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { TipoMidia } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

/** Tipos aceitos, reconhecidos pela ASSINATURA do arquivo (não pelo nome nem pelo mime enviado). */
const ASSINATURAS: { mime: string; tipo: TipoMidia; confere: (b: Buffer) => boolean }[] = [
  { mime: 'image/png', tipo: 'IMAGEM', confere: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', tipo: 'IMAGEM', confere: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif', tipo: 'IMAGEM', confere: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  {
    mime: 'image/webp',
    tipo: 'IMAGEM',
    confere: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    mime: 'audio/mpeg',
    tipo: 'AUDIO',
    confere: (b) => b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0),
  },
  { mime: 'audio/ogg', tipo: 'AUDIO', confere: (b) => b.subarray(0, 4).toString('latin1') === 'OggS' },
  {
    mime: 'audio/wav',
    tipo: 'AUDIO',
    confere: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE',
  },
];

/** Reconhece o formato pela assinatura (magic bytes); null = não aceito. */
export function identificarMidia(conteudo: Buffer): { mime: string; tipo: TipoMidia } | null {
  const f = ASSINATURAS.find((a) => conteudo.length >= 12 && a.confere(conteudo));
  return f ? { mime: f.mime, tipo: f.tipo } : null;
}

export interface MidiaPublica {
  id: string;
  tipo: TipoMidia;
  url: string;
  nomeOriginal: string;
}

export function urlMidia(arquivo: string) {
  return `/api/v1/midias/${arquivo}`;
}

/**
 * Mídias das questões (RF04) em volume local. SVG e outros formatos que podem conter
 * script não são aceitos. O nome no disco é aleatório (128 bits) e serve de URL de
 * capacidade para quem já recebeu a questão (ADR-0032).
 */
@Injectable()
export class MidiasService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MidiasService.name);
  private limpeza?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get pasta() {
    return resolve(this.config.get('MIDIAS_DIR', { infer: true }));
  }

  async onModuleInit() {
    await mkdir(this.pasta, { recursive: true });
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const rodar = () =>
      this.limparOrfas()
        .then((r) => (r.registros || r.arquivos) && this.logger.log(r, 'Mídias órfãs removidas'))
        .catch((erro: unknown) => this.logger.error({ erro }, 'Falha na limpeza de mídias'));
    this.limpeza = setInterval(rodar, 6 * 3600_000);
    this.limpeza.unref();
  }

  onModuleDestroy() {
    if (this.limpeza) clearInterval(this.limpeza);
  }

  /**
   * Coleta de lixo (lote 7): apaga uploads nunca ligados a uma versão há mais de 24 h e
   * arquivos do volume que nenhum registro referencia (com mais de 24 h, para não pegar
   * um upload em andamento). Arquivo compartilhado entre versões só sai sem nenhuma referência.
   */
  async limparOrfas(agora = new Date()) {
    const limite = new Date(agora.getTime() - 24 * 3600_000);
    const { count: registros } = await this.prisma.midia.deleteMany({
      where: { versaoQuestaoId: null, criadoEm: { lt: limite } },
    });
    const usados = new Set(
      (await this.prisma.midia.findMany({ select: { arquivo: true }, distinct: ['arquivo'] })).map((m) => m.arquivo),
    );
    let arquivos = 0;
    for (const nome of await readdir(this.pasta)) {
      if (!/^[0-9a-f]{32}$/.test(nome) || usados.has(nome)) continue;
      const caminho = resolve(this.pasta, nome);
      if ((await stat(caminho)).mtime >= limite) continue;
      await unlink(caminho);
      arquivos++;
    }
    return { registros, arquivos };
  }

  async enviar(u: UsuarioAutenticado, arquivo: Express.Multer.File | undefined): Promise<MidiaPublica> {
    if (!arquivo) throw new BadRequestException('Envie o arquivo no campo "arquivo"');
    const maxMb = this.config.get('MIDIAS_MAX_MB', { infer: true });
    if (arquivo.size > maxMb * 1024 * 1024) throw new PayloadTooLargeException(`Arquivo maior que ${maxMb} MB`);
    const formato = identificarMidia(arquivo.buffer);
    if (!formato) {
      throw new BadRequestException('Formato não aceito. Use imagem PNG, JPEG, GIF ou WebP, ou áudio MP3, OGG ou WAV.');
    }
    const nome = randomBytes(16).toString('hex');
    await writeFile(resolve(this.pasta, nome), arquivo.buffer, { mode: 0o640 });
    const m = await this.prisma.midia.create({
      data: {
        tipo: formato.tipo,
        arquivo: nome,
        mime: formato.mime,
        tamanho: arquivo.size,
        nomeOriginal: (arquivo.originalname || 'arquivo').slice(0, 200),
        enviadoPorId: u.id,
      },
    });
    return { id: m.id, tipo: m.tipo, url: urlMidia(m.arquivo), nomeOriginal: m.nomeOriginal };
  }

  /** Metadados para servir o arquivo (rota pública por URL de capacidade). */
  async localizar(arquivo: string) {
    if (!/^[0-9a-f]{32}$/.test(arquivo)) throw new NotFoundException();
    const m = await this.prisma.midia.findFirst({ where: { arquivo }, select: { mime: true, arquivo: true } });
    if (!m) throw new NotFoundException();
    return { caminho: resolve(this.pasta, m.arquivo), mime: m.mime };
  }

  /**
   * Define as mídias de uma versão. Mídias novas (sem versão) precisam ter sido enviadas pelo
   * próprio usuário; mídias de outra versão da MESMA questão são copiadas (mesmo arquivo).
   */
  async definirDaVersao(
    u: UsuarioAutenticado,
    questaoId: string,
    versaoId: string,
    midiaIds: string[],
    tx: Prisma.TransactionClient,
  ) {
    const ids = [...new Set(midiaIds)];
    const midias = ids.length ? await tx.midia.findMany({ where: { id: { in: ids } }, include: { versaoQuestao: true } }) : [];
    if (midias.length !== ids.length) throw new BadRequestException('Mídia não encontrada');
    // Remove da versão as que saíram da lista
    await tx.midia.deleteMany({ where: { versaoQuestaoId: versaoId, id: { notIn: ids } } });
    for (const m of midias) {
      if (m.versaoQuestaoId === versaoId) continue;
      if (m.versaoQuestaoId === null) {
        if (m.enviadoPorId !== u.id) throw new ForbiddenException('Mídia enviada por outra pessoa');
        await tx.midia.update({ where: { id: m.id }, data: { versaoQuestaoId: versaoId } });
      } else if (m.versaoQuestao?.questaoId === questaoId) {
        const { id: _id, versaoQuestao: _v, criadoEm: _c, ...dados } = m;
        await tx.midia.create({ data: { ...dados, versaoQuestaoId: versaoId } });
      } else {
        throw new ForbiddenException('Mídia pertence a outra questão');
      }
    }
  }
}
