import { Controller, Get, Param, ParseEnumPipe, Query, Res, StreamableFile } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import type { Response } from 'express';
import { AmbienteRequerido, Delegavel, Papeis } from '../../common/auth/decorators.js';
import { escreverCsv } from '../../common/csv/csv.js';
import { gerarXlsx } from '../../common/xlsx/xlsx.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { AuditoriaService, type FiltroAuditoria } from './auditoria.service.js';
import { periodoNoFuso } from '../../common/fuso/fuso.js';

class FiltroAuditoriaDto {
  @IsOptional() @IsString() @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  acao?: string;

  @IsOptional() @IsString() @MaxLength(50)
  recurso?: string;

  @IsOptional() @IsUUID()
  usuarioId?: string;

  /** Data inicial (AAAA-MM-DD, inclusive). */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inicial inválida (use AAAA-MM-DD)' })
  de?: string;

  /** Data final (AAAA-MM-DD, inclusive — vale o dia inteiro). */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data final inválida (use AAAA-MM-DD)' })
  ate?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000)
  pagina = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  tamanho = 50;
}

function filtro(dto: FiltroAuditoriaDto): FiltroAuditoria {
  return {
    acao: dto.acao,
    recurso: dto.recurso,
    usuarioId: dto.usuarioId,
    // Dias no fuso da instituição (ADR-0058), não em UTC.
    ...periodoNoFuso(dto.de, dto.ate),
  };
}

@Controller('auditoria')
@AmbienteRequerido('PROFISSIONAL')
@Papeis('ADMINISTRADOR')
@Delegavel('CONSULTAR_AUDITORIA')
export class AuditoriaController {
  constructor(
    private readonly auditoria: AuditoriaService,
    private readonly usuarios: UsuariosService,
  ) {}

  @Get()
  async listar(@Query() dto: FiltroAuditoriaDto) {
    const r = await this.auditoria.listar({ ...filtro(dto), pagina: dto.pagina, tamanho: dto.tamanho });
    const nomes = await this.usuarios.resumos(r.itens.map((e) => e.usuarioId).filter((x): x is string => !!x));
    return {
      ...r,
      itens: r.itens.map((e) => ({ ...e, usuarioNome: e.usuarioId ? (nomes.get(e.usuarioId)?.nome ?? '—') : null })),
    };
  }

  /** Até 10 mil eventos do filtro, em CSV (UTF-8 com BOM, separador ;) ou Excel (.xlsx). */
  @Get(':formato')
  async exportar(
    @Param('formato', new ParseEnumPipe({ csv: 'csv', xlsx: 'xlsx' })) formato: 'csv' | 'xlsx',
    @Query() dto: FiltroAuditoriaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const eventos = await this.auditoria.exportar(filtro(dto));
    const nomes = await this.usuarios.resumos(eventos.map((e) => e.usuarioId).filter((x): x is string => !!x));
    res.setHeader('Content-Disposition', `attachment; filename="auditoria.${formato}"`);
    const cabecalho = ['data_hora', 'usuario', 'usuario_id', 'acao', 'recurso', 'recurso_id', 'justificativa', 'ip', 'dados'];
    const linhas = eventos.map((e) => [
        e.criadoEm.toISOString(),
        e.usuarioId ? (nomes.get(e.usuarioId)?.nome ?? '—') : 'sistema',
        e.usuarioId,
        e.acao,
        e.recurso,
        e.recursoId,
        e.justificativa,
        e.ip,
        e.dados ? JSON.stringify(e.dados) : '',
      ]);
    if (formato === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return new StreamableFile(gerarXlsx('Auditoria', cabecalho, linhas));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return escreverCsv(cabecalho, linhas);
  }
}
