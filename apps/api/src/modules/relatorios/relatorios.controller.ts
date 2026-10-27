import { Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Query, Res, StreamableFile } from '@nestjs/common';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import type { Response } from 'express';
import { AmbienteRequerido, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { RelatoriosService } from './relatorios.service.js';
import { periodoNoFuso } from '../../common/fuso/fuso.js';

/** Período pelo envio da tentativa (datas inclusive). */
class PeriodoDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inicial inválida (use AAAA-MM-DD)' })
  de?: string;

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data final inválida (use AAAA-MM-DD)' })
  ate?: string;
}

class FiltroRelatorioDto extends PeriodoDto {
  @IsOptional() @IsUUID()
  aplicacaoId?: string;

  @IsOptional() @IsUUID()
  turmaId?: string;
}

/** Dias no fuso da instituição (ADR-0058); `ate` vale o dia inteiro (limite exclusivo no seguinte). */
function periodo(f: PeriodoDto & { aplicacaoId?: string; turmaId?: string }) {
  return { aplicacaoId: f.aplicacaoId, turmaId: f.turmaId, ...periodoNoFuso(f.de, f.ate) };
}

const FORMATOS = { csv: 'csv', xlsx: 'xlsx' } as const;

function enviarArquivo(res: Response, a: { nome: string; tipo: string; conteudo: string | Buffer }) {
  res.setHeader('Content-Type', a.tipo);
  res.setHeader('Content-Disposition', `attachment; filename="${a.nome}"`);
  return typeof a.conteudo === 'string' ? a.conteudo : new StreamableFile(a.conteudo);
}

@Controller('relatorios')
@AmbienteRequerido('PROFISSIONAL')
@Papeis(...PAPEIS_AUTORIA)
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('provas')
  provas(@UsuarioAtual() u: UsuarioAutenticado, @Query() f: PeriodoDto) {
    return this.relatorios.resumoProvas(u, periodo(f));
  }

  @Get('disciplinas')
  disciplinas(@UsuarioAtual() u: UsuarioAutenticado, @Query() f: FiltroRelatorioDto) {
    return this.relatorios.disciplinas(u, periodo(f));
  }

  @Get('alunos/:id')
  aluno(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Query() f: PeriodoDto) {
    return this.relatorios.aluno(u, id, periodo(f));
  }

  @Get('provas/:id')
  prova(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Query() f: FiltroRelatorioDto) {
    return this.relatorios.prova(u, id, periodo(f));
  }

  /** Exportação CSV ou Excel (.xlsx — ADR-0044). */
  @Get('provas/:id/:formato')
  async provaArquivo(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('formato', new ParseEnumPipe(FORMATOS)) formato: 'csv' | 'xlsx',
    @Query() f: FiltroRelatorioDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return enviarArquivo(res, await this.relatorios.exportarProva(u, id, periodo(f), formato));
  }

  @Get('turmas/:id')
  turma(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Query() f: PeriodoDto) {
    return this.relatorios.turma(u, id, periodo(f));
  }

  @Get('turmas/:id/:formato')
  async turmaArquivo(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('formato', new ParseEnumPipe(FORMATOS)) formato: 'csv' | 'xlsx',
    @Query() f: PeriodoDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return enviarArquivo(res, await this.relatorios.exportarTurma(u, id, periodo(f), formato));
  }
}
