import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { lerCsv } from '../../common/csv/csv.js';
import { ehGestor } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { AdicionarAlunoDto, SalvarTurmaDto } from './dto.js';
import { emParalelo } from '../../common/lotes/em-paralelo.js';

/** Linhas processadas ao mesmo tempo nas importações (CSV e integração). */
const IMPORTACAO_SIMULTANEOS = 5;

const MAX_LINHAS_CSV = 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RelatorioImportacao {
  totalLinhas: number;
  matriculados: number;
  jaMatriculados: number;
  criados: { linha: number; nome: string; email: string; senhaTemporaria: string; conviteEnviado: boolean }[];
  erros: { linha: number; mensagem: string }[];
}

/** RF03 — Turmas e matrículas. Remover aluno só encerra o vínculo (histórico preservado). */
@Injectable()
export class TurmasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuarios: UsuariosService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** Gestão vê todas; professor vê as que é responsável ou co-professor (RF03). */
  private visiveis(u: UsuarioAutenticado): Prisma.TurmaWhereInput {
    return ehGestor(u)
      ? {}
      : { OR: [{ professorResponsavelId: u.id }, { professores: { some: { professorId: u.id } } }] };
  }

  async listar(u: UsuarioAutenticado) {
    const turmas = await this.prisma.turma.findMany({
      where: this.visiveis(u),
      orderBy: [{ periodoInicio: 'desc' }, { nome: 'asc' }],
      include: {
        _count: { select: { matriculas: { where: { dataDesvinculo: null } } } },
        professores: { select: { professorId: true } },
      },
    });
    const professores = await this.usuarios.resumos(
      turmas.flatMap((t) => [t.professorResponsavelId, ...t.professores.map((p) => p.professorId)]),
    );
    return turmas.map((t) => ({
      id: t.id,
      nome: t.nome,
      periodoInicio: t.periodoInicio,
      periodoFim: t.periodoFim,
      professorResponsavelId: t.professorResponsavelId,
      professorNome: professores.get(t.professorResponsavelId)?.nome ?? '—',
      coProfessores: t.professores.map((p) => professores.get(p.professorId)?.nome ?? '—'),
      souResponsavel: t.professorResponsavelId === u.id,
      totalAlunos: t._count.matriculas,
    }));
  }

  async obter(u: UsuarioAutenticado, id: string) {
    const turma = await this.buscar(u, id);
    const matriculas = await this.prisma.matricula.findMany({
      where: { turmaId: id, dataDesvinculo: null },
      orderBy: { dataVinculo: 'asc' },
    });
    const coProfessores = await this.prisma.turmaProfessor.findMany({ where: { turmaId: id }, orderBy: { criadoEm: 'asc' } });
    const pessoas = await this.usuarios.resumos([
      turma.professorResponsavelId,
      ...coProfessores.map((p) => p.professorId),
      ...matriculas.map((m) => m.alunoId),
    ]);
    const alunos = matriculas
      .map((m) => ({ ...pessoas.get(m.alunoId)!, dataVinculo: m.dataVinculo }))
      .filter((a) => a.id)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return {
      ...turma,
      professorNome: pessoas.get(turma.professorResponsavelId)?.nome ?? '—',
      coProfessores: coProfessores.map((p) => ({
        id: p.professorId,
        nome: pessoas.get(p.professorId)?.nome ?? '—',
        email: pessoas.get(p.professorId)?.email ?? '',
      })),
      podeGerirProfessores: this.podeGerir(u, turma),
      alunos,
    };
  }

  async criar(u: UsuarioAutenticado, dto: SalvarTurmaDto) {
    const dados = await this.validar(u, dto);
    const turma = await this.prisma.turma.create({ data: dados });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'TURMA_CRIADA',
      recurso: 'turma',
      recursoId: turma.id,
    });
    return { id: turma.id };
  }

  async editar(u: UsuarioAutenticado, id: string, dto: SalvarTurmaDto) {
    const atual = await this.buscar(u, id);
    if (!this.podeGerir(u, atual)) {
      throw new ForbiddenException('Só o professor responsável ou a coordenação editam a turma');
    }
    const dados = await this.validar(u, dto, atual.professorResponsavelId);
    await this.prisma.turma.update({ where: { id }, data: dados });
    return { id };
  }

  // ------------------------------------------------- integração (lote 8 — ADR-0051)

  async listarParaIntegracao() {
    const turmas = await this.prisma.turma.findMany({
      orderBy: { nome: 'asc' },
      include: { matriculas: { where: { dataDesvinculo: null }, select: { alunoId: true } } },
    });
    const pessoas = await this.usuarios.resumos(turmas.flatMap((t) => [t.professorResponsavelId, ...t.matriculas.map((m) => m.alunoId)]));
    return turmas.map((t) => ({
      id: t.id,
      codigoExterno: t.codigoExterno,
      nome: t.nome,
      periodoInicio: t.periodoInicio,
      periodoFim: t.periodoFim,
      professorEmail: pessoas.get(t.professorResponsavelId)?.email ?? null,
      alunos: t.matriculas.map((m) => {
        const p = pessoas.get(m.alunoId);
        return { email: p?.email ?? null, matricula: p?.matricula ?? null, nome: p?.nome ?? null };
      }),
    }));
  }

  async idsPorCodigoExterno(codigos: string[]) {
    const t = await this.prisma.turma.findMany({ where: { codigoExterno: { in: codigos } }, select: { id: true, codigoExterno: true } });
    return new Map(t.map((x) => [x.id, x.codigoExterno!]));
  }

  async codigosExternos(ids: string[]) {
    const t = await this.prisma.turma.findMany({ where: { id: { in: ids } }, select: { id: true, codigoExterno: true } });
    return new Map(t.map((x) => [x.id, x.codigoExterno]));
  }

  /**
   * Cria/atualiza a turma pelo código externo e sincroniza as matrículas: matricula quem veio
   * (criando a conta se preciso) e, com `removerAusentes`, desvincula quem não veio (histórico fica).
   */
  async sincronizarExterna(
    codigoExterno: string,
    d: {
      nome: string;
      periodoInicio: string;
      periodoFim: string;
      professorEmail: string;
      alunos: { nome: string; email: string; matricula?: string }[];
      removerAusentes?: boolean;
    },
    autorId: string,
  ) {
    const inicio = new Date(`${d.periodoInicio.slice(0, 10)}T00:00:00Z`);
    const fim = new Date(`${d.periodoFim.slice(0, 10)}T00:00:00Z`);
    if (fim < inicio) throw new BadRequestException('O fim do período deve ser depois do início');
    const professor = await this.usuarios.profissionalPorEmail(d.professorEmail);
    if (!professor || professor.papel === 'CORRETOR') {
      throw new BadRequestException(`Professor não encontrado: ${d.professorEmail}`);
    }
    const existente = await this.prisma.turma.findUnique({ where: { codigoExterno } });
    const turma = existente
      ? await this.prisma.turma.update({
          where: { id: existente.id },
          data: { nome: d.nome, periodoInicio: inicio, periodoFim: fim, professorResponsavelId: professor.id },
        })
      : await this.prisma.turma.create({
          data: { nome: d.nome, periodoInicio: inicio, periodoFim: fim, professorResponsavelId: professor.id, codigoExterno },
        });
    const relatorio = {
      turmaId: turma.id,
      criada: !existente,
      matriculados: 0,
      jaMatriculados: 0,
      desvinculados: 0,
      remocaoAusentesIgnorada: false,
      contasCriadas: [] as string[],
      erros: [] as { indice: number; email: string; mensagem: string }[],
    };
    const presentes = new Set<string>();
    // E-mail repetido na lista é processado uma vez (em paralelo, duas criações da mesma conta
    // colidiriam); as repetições contam como já matriculadas, como antes.
    const primeiros = new Map<string, number>();
    d.alunos.forEach((a, i) => {
      const chave = a.email.trim().toLowerCase();
      if (!primeiros.has(chave)) primeiros.set(chave, i);
    });
    const unicos = [...primeiros.values()];
    const resultados = await emParalelo(unicos, IMPORTACAO_SIMULTANEOS, async (indice) => {
      const a = d.alunos[indice]!;
      try {
        const r = await this.usuarios.localizarOuCriarAluno(a, autorId);
        return { indice, a, r, novaMatricula: await this.matricular(turma.id, r.aluno.id) };
      } catch (erro) {
        return { indice, a, erro: erro instanceof Error ? erro.message : 'erro' };
      }
    });
    for (const res of resultados) {
      if ('erro' in res) {
        relatorio.erros.push({ indice: res.indice, email: res.a.email, mensagem: res.erro! });
        continue;
      }
      presentes.add(res.r.aluno.id);
      if (res.r.situacao === 'CRIADO') relatorio.contasCriadas.push(res.r.aluno.email);
      if (res.novaMatricula) relatorio.matriculados++;
      else relatorio.jaMatriculados++;
    }
    relatorio.jaMatriculados += d.alunos.length - unicos.length;
    if (d.removerAusentes && relatorio.erros.length === 0) {
      const { count } = await this.prisma.matricula.updateMany({
        where: { turmaId: turma.id, dataDesvinculo: null, alunoId: { notIn: [...presentes] } },
        data: { dataDesvinculo: new Date() },
      });
      relatorio.desvinculados = count;
    } else if (d.removerAusentes) {
      // Falha fechada: um lote parcialmente processado nunca define quem está ausente.
      relatorio.remocaoAusentesIgnorada = true;
    }
    return relatorio;
  }

  /** Transfere o aluno: encerra o vínculo na turma de origem e matricula na de destino (histórico preservado). */
  async transferirAluno(u: UsuarioAutenticado, turmaId: string, alunoId: string, destinoId: string) {
    if (turmaId === destinoId) throw new BadRequestException('Escolha uma turma diferente');
    await this.buscar(u, turmaId);
    await this.buscar(u, destinoId);
    if (!(await this.alunoMatriculado(turmaId, alunoId))) throw new NotFoundException('Aluno não está nesta turma');
    await this.prisma.$transaction(async (tx) => {
      await tx.matricula.updateMany({
        where: { turmaId, alunoId, dataDesvinculo: null },
        data: { dataDesvinculo: new Date() },
      });
      const ativo = await tx.matricula.findFirst({ where: { turmaId: destinoId, alunoId, dataDesvinculo: null } });
      if (!ativo) await tx.matricula.createMany({ data: [{ turmaId: destinoId, alunoId }], skipDuplicates: true });
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'MATRICULA_TRANSFERIDA',
      recurso: 'turma',
      recursoId: turmaId,
      dados: { alunoId, destinoId },
    });
    return { origemId: turmaId, destinoId };
  }

  /**
   * Define os co-professores (substitui a lista). Co-professor matricula alunos e aplica
   * provas à turma; editar a turma e a equipe fica com o responsável e a gestão.
   */
  async definirProfessores(u: UsuarioAutenticado, id: string, professorIds: string[]) {
    const turma = await this.buscar(u, id);
    if (!this.podeGerir(u, turma)) {
      throw new ForbiddenException('Só o professor responsável ou a coordenação definem os professores');
    }
    const ids = [...new Set(professorIds)].filter((p) => p !== turma.professorResponsavelId);
    for (const pid of ids) {
      const prof = await this.usuarios.obterProfissional(pid);
      if (!prof || prof.papel === 'CORRETOR') {
        throw new BadRequestException('Professor inválido');
      }
    }
    await this.prisma.$transaction([
      this.prisma.turmaProfessor.deleteMany({ where: { turmaId: id, professorId: { notIn: ids } } }),
      this.prisma.turmaProfessor.createMany({
        data: ids.map((professorId) => ({ turmaId: id, professorId })),
        skipDuplicates: true,
      }),
    ]);
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'TURMA_PROFESSORES_DEFINIDOS',
      recurso: 'turma',
      recursoId: id,
      dados: { professorIds: ids },
    });
    return this.obter(u, id);
  }

  async adicionarAluno(u: UsuarioAutenticado, turmaId: string, dto: AdicionarAlunoDto) {
    await this.buscar(u, turmaId);
    const resultado = await this.usuarios.localizarOuCriarAluno(dto, u.id);
    const novo = await this.matricular(turmaId, resultado.aluno.id);
    if (!novo) throw new ConflictException('Este aluno já está matriculado na turma');
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'ALUNO_MATRICULADO',
      recurso: 'turma',
      recursoId: turmaId,
      dados: { alunoId: resultado.aluno.id },
    });
    return {
      aluno: resultado.aluno,
      senhaTemporaria: resultado.situacao === 'CRIADO' ? resultado.senhaTemporaria : null,
      conviteEnviado: resultado.situacao === 'CRIADO' ? resultado.conviteEnviado : false,
    };
  }

  /** Exceção do RF03: desfaz só o vínculo ativo; tentativas e notas continuam no histórico. */
  async removerAluno(u: UsuarioAutenticado, turmaId: string, alunoId: string) {
    await this.buscar(u, turmaId);
    const { count } = await this.prisma.matricula.updateMany({
      where: { turmaId, alunoId, dataDesvinculo: null },
      data: { dataDesvinculo: new Date() },
    });
    if (count === 0) throw new NotFoundException('Aluno não está matriculado nesta turma');
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'ALUNO_DESVINCULADO',
      recurso: 'turma',
      recursoId: turmaId,
      dados: { alunoId },
    });
  }

  /**
   * Alternativa do RF03: importação em lote. Linhas inválidas são rejeitadas com motivo;
   * as válidas são processadas (cada linha independente).
   */
  async importarCsv(u: UsuarioAutenticado, turmaId: string, conteudo: string): Promise<RelatorioImportacao> {
    await this.buscar(u, turmaId);
    const linhas = lerCsv(conteudo).filter((l) => l.some((c) => c.trim() !== ''));
    if (linhas.length < 2) {
      throw new BadRequestException('O arquivo precisa de um cabeçalho e ao menos uma linha de aluno');
    }
    if (linhas.length - 1 > MAX_LINHAS_CSV) {
      throw new BadRequestException(`Máximo de ${MAX_LINHAS_CSV} alunos por arquivo`);
    }

    const cabecalho = linhas[0]!.map((c) =>
      c.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
    );
    const col = {
      nome: cabecalho.indexOf('nome'),
      email: cabecalho.findIndex((c) => c === 'email' || c === 'e-mail'),
      matricula: cabecalho.indexOf('matricula'),
    };
    if (col.nome < 0 || col.email < 0) {
      throw new BadRequestException('Cabeçalho inválido: as colunas "nome" e "email" são obrigatórias (opcional: "matricula")');
    }

    const relatorio: RelatorioImportacao = {
      totalLinhas: linhas.length - 1,
      matriculados: 0,
      jaMatriculados: 0,
      criados: [],
      erros: [],
    };
    const vistos = new Set<string>();
    const matriculasVistas = new Set<string>();
    const validas: { numero: number; nome: string; email: string; matricula: string }[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const numero = i + 1; // linha no arquivo (1 = cabeçalho)
      const l = linhas[i]!;
      const nome = (l[col.nome] ?? '').trim();
      const email = (l[col.email] ?? '').trim().toLowerCase();
      const matricula = col.matricula >= 0 ? (l[col.matricula] ?? '').trim() : '';

      const erro = !nome
        ? 'Nome em branco'
        : !email
          ? 'E-mail em branco'
          : !EMAIL.test(email)
            ? `E-mail inválido: ${email}`
            : vistos.has(email)
              ? `E-mail repetido no arquivo: ${email}`
              : matricula && matriculasVistas.has(matricula)
                ? `Matrícula repetida no arquivo: ${matricula}`
                : nome.length > 200 || matricula.length > 50
                  ? 'Campo muito longo'
                  : null;
      if (erro) {
        relatorio.erros.push({ linha: numero, mensagem: erro });
        continue;
      }
      vistos.add(email);
      if (matricula) matriculasVistas.add(matricula);
      validas.push({ numero, nome, email, matricula });
    }

    // Até 5 linhas ao mesmo tempo: o hash Argon2 da senha temporária e o convite por e-mail de cada
    // aluno novo deixam de somar em série (1000 linhas estouravam o tempo da requisição — BUG-049).
    const resultados = await emParalelo(validas, IMPORTACAO_SIMULTANEOS, async (v) => {
      try {
        const r = await this.usuarios.localizarOuCriarAluno({ nome: v.nome, email: v.email, matricula: v.matricula }, u.id);
        return { v, r, novaMatricula: await this.matricular(turmaId, r.aluno.id) };
      } catch (e) {
        return { v, erro: e instanceof HttpException ? e.message : 'Erro inesperado ao processar a linha' };
      }
    });
    for (const res of resultados) {
      if ('erro' in res) {
        relatorio.erros.push({ linha: res.v.numero, mensagem: res.erro! });
        continue;
      }
      if (res.r.situacao === 'CRIADO') {
        relatorio.criados.push({ linha: res.v.numero, nome: res.v.nome, email: res.v.email, senhaTemporaria: res.r.senhaTemporaria, conviteEnviado: res.r.conviteEnviado });
      }
      if (res.novaMatricula) relatorio.matriculados++;
      else relatorio.jaMatriculados++;
    }
    relatorio.erros.sort((a, b) => a.linha - b.linha);

    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'TURMA_IMPORTACAO_CSV',
      recurso: 'turma',
      recursoId: turmaId,
      dados: {
        totalLinhas: relatorio.totalLinhas,
        matriculados: relatorio.matriculados,
        criados: relatorio.criados.length,
        erros: relatorio.erros.length,
      },
    });
    return relatorio;
  }

  // ------------------------------------------------- usado por outros módulos

  async obterVisivel(u: UsuarioAutenticado, turmaId: string) {
    return this.buscar(u, turmaId);
  }

  /** Quais destes alunos estão matriculados (vínculo ativo) em turmas visíveis ao usuário. */
  async alunosVisiveis(u: UsuarioAutenticado, alunoIds: string[]): Promise<Set<string>> {
    if (ehGestor(u)) return new Set(alunoIds);
    const m = await this.prisma.matricula.findMany({
      where: { alunoId: { in: alunoIds }, dataDesvinculo: null, turma: this.visiveis(u) },
      select: { alunoId: true },
      distinct: ['alunoId'],
    });
    return new Set(m.map((x) => x.alunoId));
  }

  /** O aluno está (ou esteve) em alguma turma visível ao usuário? */
  async alunoVisivel(u: UsuarioAutenticado, alunoId: string): Promise<boolean> {
    return (await this.prisma.matricula.count({ where: { alunoId, turma: this.visiveis(u) } })) > 0;
  }

  async nomeAluno(alunoId: string): Promise<string | null> {
    return (await this.usuarios.resumos([alunoId])).get(alunoId)?.nome ?? null;
  }

  async alunosAtivos(turmaId: string): Promise<string[]> {
    const m = await this.prisma.matricula.findMany({
      where: { turmaId, dataDesvinculo: null },
      select: { alunoId: true },
    });
    return m.map((x) => x.alunoId);
  }

  async turmasAtivasDoAluno(alunoId: string): Promise<string[]> {
    const m = await this.prisma.matricula.findMany({
      where: { alunoId, dataDesvinculo: null },
      select: { turmaId: true },
    });
    return m.map((x) => x.turmaId);
  }

  async alunoMatriculado(turmaId: string, alunoId: string): Promise<boolean> {
    return (await this.prisma.matricula.count({ where: { turmaId, alunoId, dataDesvinculo: null } })) > 0;
  }

  /** LGPD: encerra os vínculos ativos do aluno (histórico preservado). */
  async desvincularTodas(alunoId: string, tx: Prisma.TransactionClient): Promise<number> {
    return (
      await tx.matricula.updateMany({
        where: { alunoId, dataDesvinculo: null },
        data: { dataDesvinculo: new Date() },
      })
    ).count;
  }

  async nomes(ids: string[]): Promise<Map<string, string>> {
    const turmas = await this.prisma.turma.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, nome: true },
    });
    return new Map(turmas.map((t) => [t.id, t.nome]));
  }

  // ---------------------------------------------------------------- apoio

  private podeGerir(u: UsuarioAutenticado, turma: { professorResponsavelId: string }) {
    return ehGestor(u) || turma.professorResponsavelId === u.id;
  }

  private async buscar(u: UsuarioAutenticado, id: string) {
    const turma = await this.prisma.turma.findFirst({ where: { AND: [{ id }, this.visiveis(u)] } });
    if (!turma) throw new NotFoundException('Turma não encontrada');
    return turma;
  }

  /** Cria a matrícula se não houver vínculo ativo. Retorna false se já estava matriculado. */
  private async matricular(turmaId: string, alunoId: string): Promise<boolean> {
    if (await this.alunoMatriculado(turmaId, alunoId)) return false;
    try {
      await this.prisma.matricula.create({ data: { turmaId, alunoId } });
      return true;
    } catch (erro) {
      if ((erro as { code?: string }).code === 'P2002' && (await this.alunoMatriculado(turmaId, alunoId))) return false;
      throw erro;
    }
  }

  private async validar(u: UsuarioAutenticado, dto: SalvarTurmaDto, responsavelAtual?: string) {
    const inicio = new Date(`${dto.periodoInicio.slice(0, 10)}T00:00:00Z`);
    const fim = new Date(`${dto.periodoFim.slice(0, 10)}T00:00:00Z`);
    if (fim < inicio) throw new BadRequestException('O fim do período deve ser depois do início');

    let professorResponsavelId = responsavelAtual ?? u.id;
    if (ehGestor(u) && dto.professorResponsavelId) {
      const prof = await this.usuarios.obterProfissional(dto.professorResponsavelId);
      if (!prof || prof.papel === 'CORRETOR') {
        throw new BadRequestException('Professor responsável inválido');
      }
      professorResponsavelId = prof.id;
    }
    return { nome: dto.nome, periodoInicio: inicio, periodoFim: fim, professorResponsavelId };
  }
}
