import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ehGestor } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { prazoRecursoFim } from '../correcao/calculo.js';
import { CorrecaoService } from '../correcao/correcao.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { ProvasService } from '../provas/provas.service.js';
import { AbrirRecursoDto, DecidirRecursoDto } from './dto.js';
import { formatarData } from '../../common/fuso/fuso.js';

/** RF08 — Recursos e contestações, com reprocessamento formal em caso de anulação. */
@Injectable()
export class RecursosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correcao: CorrecaoService,
    private readonly provas: ProvasService,
    private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService,
    private readonly usuarios: UsuariosService,
  ) {}

  // ---------------------------------------------------------------- aluno

  async abrir(aluno: UsuarioAutenticado, dto: AbrirRecursoDto) {
    const nota = await this.correcao.notaDoAluno(aluno.id, dto.notaId);
    if (!nota) throw new NotFoundException('Resultado não encontrado');
    if (!nota.questoes.some((q) => q.versaoQuestaoId === dto.versaoQuestaoId)) {
      throw new BadRequestException('Questão não pertence a esta tentativa');
    }
    const fim = prazoRecursoFim(nota);
    if (fim && fim < new Date()) {
      throw new ConflictException({
        message: `O prazo para recurso terminou em ${formatarData(fim)}`,
        codigo: 'PRAZO_RECURSO_ENCERRADO',
      });
    }
    if (await this.correcao.anulacao(nota.provaId, dto.versaoQuestaoId)) {
      throw new ConflictException('Esta questão já foi anulada');
    }
    const existente = await this.prisma.recurso.findUnique({
      where: { notaId_versaoQuestaoId: { notaId: dto.notaId, versaoQuestaoId: dto.versaoQuestaoId } },
    });
    if (existente) throw new ConflictException('Você já abriu um recurso para esta questão');

    const recurso = await this.prisma.recurso.create({
      data: {
        notaId: dto.notaId,
        provaId: nota.provaId,
        versaoQuestaoId: dto.versaoQuestaoId,
        alunoId: aluno.id,
        justificativa: dto.justificativa,
      },
    });
    await this.auditoria.registrar({
      usuarioId: aluno.id,
      acao: 'RECURSO_ABERTO',
      recurso: 'recurso',
      recursoId: recurso.id,
      justificativa: dto.justificativa,
    });
    const ordem = nota.questoes.find((q) => q.versaoQuestaoId === dto.versaoQuestaoId)?.ordem;
    await this.notificacoes.notificar([await this.provas.autor(nota.provaId)], {
      tipo: 'RECURSO_ABERTO',
      titulo: 'Novo recurso',
      mensagem: `${nota.participanteNome} contestou a questão ${ordem} de "${nota.provaTitulo}".`,
      link: `/app/recursos/${recurso.id}`,
    });
    return recurso;
  }

  async doAluno(alunoId: string) {
    const recursos = await this.prisma.recurso.findMany({
      where: { alunoId },
      orderBy: { criadoEm: 'desc' },
    });
    return this.enriquecer(recursos);
  }

  // ---------------------------------------------------------------- professor

  async listar(u: UsuarioAutenticado, status?: Prisma.RecursoWhereInput['status']) {
    const ids = await this.provas.idsVisiveis(u);
    const recursos = await this.prisma.recurso.findMany({
      where: { ...(ids === null ? {} : { provaId: { in: ids } }), ...(status ? { status } : {}) },
      orderBy: [{ status: 'asc' }, { criadoEm: 'asc' }],
      take: 500,
    });
    return this.enriquecer(recursos);
  }

  async obter(u: UsuarioAutenticado, id: string) {
    const recurso = await this.buscarVisivel(u, id);
    const nota = await this.correcao.notaComQuestoes(recurso.notaId);
    const questao = nota?.questoes.find((q) => q.versaoQuestaoId === recurso.versaoQuestaoId);
    const anulacao = await this.correcao.anulacao(recurso.provaId, recurso.versaoQuestaoId);
    return {
      ...recurso,
      provaTitulo: nota?.provaTitulo,
      participanteNome: nota?.participanteNome,
      notaFinal: nota?.notaFinal,
      notaStatus: nota?.status,
      questao,
      anulacao,
    };
  }

  async analisar(u: UsuarioAutenticado, id: string) {
    const r = await this.buscarVisivel(u, id);
    if (r.status !== 'ABERTO') throw new ConflictException('O recurso não está aberto');
    await this.prisma.recurso.update({ where: { id }, data: { status: 'EM_ANALISE' } });
    return this.obter(u, id);
  }

  /**
   * Encaminha à coordenação (lote 8 — decisão colegiada simples): o recurso fica em análise e só
   * Coordenação/Administração decidem. A coordenação é avisada.
   */
  async encaminhar(u: UsuarioAutenticado, id: string, motivo: string) {
    const r = await this.buscarVisivel(u, id);
    if (r.status === 'DEFERIDO' || r.status === 'INDEFERIDO') throw new ConflictException('Recurso já decidido');
    if (r.encaminhadoEm) throw new ConflictException('O recurso já foi encaminhado à coordenação');
    await this.prisma.recurso.update({
      where: { id },
      data: { status: 'EM_ANALISE', encaminhadoEm: new Date(), encaminhadoPorId: u.id, motivoEncaminhamento: motivo },
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'RECURSO_ENCAMINHADO',
      recurso: 'recurso',
      recursoId: id,
      justificativa: motivo,
    });
    await this.notificacoes.notificar(await this.usuarios.idsGestoresAtivos(), {
      tipo: 'RECURSO_ABERTO',
      titulo: 'Recurso encaminhado à coordenação',
      mensagem: `Um recurso foi encaminhado para decisão da coordenação: ${motivo.slice(0, 140)}`,
      link: `/app/recursos/${id}`,
    });
    return this.obter(u, id);
  }

  /** RF08 passo 4 + alternativa (anulação com política) + exceções (indeferido / reprocessamento). */
  async decidir(u: UsuarioAutenticado, id: string, dto: DecidirRecursoDto) {
    const r = await this.buscarVisivel(u, id);
    if (r.status === 'DEFERIDO' || r.status === 'INDEFERIDO') {
      throw new ConflictException('Recurso já decidido');
    }
    if (r.encaminhadoEm && !ehGestor(u)) {
      throw new ForbiddenException('Recurso encaminhado: a decisão é da coordenação');
    }

    const efeito = !dto.deferido
      ? null
      : dto.efeito === 'ANULACAO'
        ? `ANULACAO_${dto.politica}`
        : 'AJUSTE_INDIVIDUAL';

    const afetados = await this.prisma.$transaction(async (tx) => {
      // Duas decisões simultâneas do mesmo recurso: a segunda espera e encontra o recurso decidido.
      const [travado] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status::text AS status FROM recursos.recursos WHERE id = ${id}::uuid FOR UPDATE`;
      if (travado?.status === 'DEFERIDO' || travado?.status === 'INDEFERIDO') {
        throw new ConflictException('Recurso já decidido');
      }
      let afetadas: { id: string; usuarioId: string | null }[] = [];
      if (dto.deferido && dto.efeito === 'AJUSTE_INDIVIDUAL') {
        await this.correcao.ajustarQuestao(r.notaId, r.versaoQuestaoId, (dto.percentual ?? 100) / 100, u.id, tx);
      } else if (dto.deferido && dto.efeito === 'ANULACAO') {
        afetadas = await this.correcao.anularQuestao(
          r.provaId,
          r.versaoQuestaoId,
          dto.politica!,
          dto.decisao,
          u.id,
          tx,
        );
        // Outros recursos pendentes sobre a mesma questão ficam resolvidos pela anulação.
        await tx.recurso.updateMany({
          where: {
            provaId: r.provaId,
            versaoQuestaoId: r.versaoQuestaoId,
            id: { not: r.id },
            status: { in: ['ABERTO', 'EM_ANALISE'] },
          },
          data: {
            status: 'DEFERIDO',
            decisao: `Questão anulada em decorrência de outro recurso: ${dto.decisao}`,
            efeito,
            decididoPorId: u.id,
            decididoEm: new Date(),
          },
        });
      }
      await tx.recurso.update({
        where: { id },
        data: {
          status: dto.deferido ? 'DEFERIDO' : 'INDEFERIDO',
          decisao: dto.decisao,
          efeito,
          decididoPorId: u.id,
          decididoEm: new Date(),
        },
      });
      return afetadas;
      // A anulação reprocessa todas as notas da prova: o limite padrão (5 s) não basta em provas grandes.
    }, { timeout: 60_000, maxWait: 10_000 });

    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: dto.deferido ? 'RECURSO_DEFERIDO' : 'RECURSO_INDEFERIDO',
      recurso: 'recurso',
      recursoId: id,
      justificativa: dto.decisao,
      dados: { efeito, percentual: dto.percentual ?? null, notasReprocessadas: afetados.length },
    });

    await this.notificacoes.notificar([r.alunoId], {
      tipo: 'RECURSO_DECIDIDO',
      titulo: dto.deferido ? 'Recurso deferido' : 'Recurso indeferido',
      mensagem: dto.deferido
        ? `Seu recurso foi aceito. Justificativa: ${dto.decisao}`
        : `Seu recurso foi indeferido e a nota foi mantida. Justificativa: ${dto.decisao}`,
      link: `/aluno/resultados/${r.notaId}`,
    });
    if (afetados.length > 0) {
      await this.notificacoes.notificar(
        afetados.filter((n) => n.usuarioId !== r.alunoId).map((n) => n.usuarioId),
        {
          tipo: 'NOTA_REPROCESSADA',
          titulo: 'Nota reprocessada',
          mensagem: 'Uma questão da prova foi anulada e sua nota foi recalculada.',
        },
      );
    }
    return this.obter(u, id);
  }

  // ------------------------------------------------- usado pela aplicação

  async existeParaNota(notaId: string): Promise<boolean> {
    return (await this.prisma.recurso.count({ where: { notaId } })) > 0;
  }

  // ---------------------------------------------------------------- apoio

  private async buscarVisivel(u: UsuarioAutenticado, id: string) {
    const r = await this.prisma.recurso.findUnique({ where: { id } });
    const ids = await this.provas.idsVisiveis(u);
    if (!r || (ids !== null && !ids.includes(r.provaId))) {
      throw new NotFoundException('Recurso não encontrado');
    }
    return r;
  }

  private async enriquecer<T extends { notaId: string; versaoQuestaoId: string }>(recursos: T[]) {
    const notas = await this.correcao.resumosNotas(recursos.map((r) => r.notaId));
    return recursos.map((r) => {
      const n = notas.get(r.notaId);
      const q = n?.questoes.find((x) => x.versaoQuestaoId === r.versaoQuestaoId);
      return {
        ...r,
        provaTitulo: n?.provaTitulo ?? '—',
        participanteNome: n?.participanteNome ?? '—',
        questaoOrdem: q?.ordem ?? null,
        questaoEnunciado: q?.enunciado.slice(0, 160) ?? '',
      };
    });
  }
}
