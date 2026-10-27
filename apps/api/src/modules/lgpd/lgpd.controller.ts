import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import type { Response } from 'express';
import { AmbienteRequerido, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { StatusSolicitacaoLgpd } from '../../generated/prisma/enums.js';
import { LgpdService } from './lgpd.service.js';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class CorrecaoDadosDto {
  @IsOptional() @Transform(aparar) @IsString() @MaxLength(200)
  nome?: string;

  @IsOptional() @Transform(aparar) @IsString() @MaxLength(50)
  matricula?: string;
}

class SolicitarDto {
  @IsOptional() @Transform(aparar) @IsString() @MaxLength(2000)
  justificativa?: string;

  /** EXCLUSAO (padrão) ou CORRECAO de dados (lote 8). */
  @IsOptional() @IsIn(['EXCLUSAO', 'CORRECAO'])
  tipo?: 'EXCLUSAO' | 'CORRECAO';

  @IsOptional() @ValidateNested() @Type(() => CorrecaoDadosDto)
  correcao?: CorrecaoDadosDto;
}

class RespostaDto {
  @IsOptional() @Transform(aparar) @IsString() @MaxLength(2000)
  resposta?: string;
}

class RecusaDto {
  @Transform(aparar) @IsString() @IsNotEmpty({ message: 'Explique o motivo da recusa ao titular' }) @MaxLength(2000)
  resposta!: string;
}

class ExternoDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @Transform(aparar) @IsString() @IsNotEmpty({ message: 'A justificativa é obrigatória' }) @MaxLength(2000)
  justificativa!: string;
}

class FiltroDto {
  @IsOptional() @IsEnum(StatusSolicitacaoLgpd)
  status?: StatusSolicitacaoLgpd;
}

/** Direitos do titular — disponível nos dois ambientes. */
@Controller('minha-conta')
export class MinhaContaController {
  constructor(private readonly lgpd: LgpdService) {}

  @Get('dados')
  async exportar(@UsuarioAtual() u: UsuarioAutenticado, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-quizzer.json"');
    return this.lgpd.exportar(u);
  }

  @Get('solicitacoes')
  minhas(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.lgpd.minhas(u.id);
  }

  @Post('solicitacoes')
  solicitar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: SolicitarDto) {
    return this.lgpd.solicitar(u, dto.justificativa, dto.tipo, dto.correcao);
  }
}

@Controller('lgpd')
@AmbienteRequerido('PROFISSIONAL')
@Papeis('ADMINISTRADOR')
export class LgpdController {
  constructor(private readonly lgpd: LgpdService) {}

  @Get('solicitacoes')
  listar(@Query() f: FiltroDto) {
    return this.lgpd.listar(f.status);
  }

  @Post('solicitacoes/:id/concluir')
  @HttpCode(200)
  concluir(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RespostaDto) {
    return this.lgpd.concluir(u, id, dto.resposta);
  }

  @Post('solicitacoes/:id/recusar')
  @HttpCode(200)
  recusar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RecusaDto) {
    return this.lgpd.recusar(u, id, dto.resposta);
  }

  /** Executa agora a retenção de dados de externos (se configurada) — lote 8. */
  @Post('retencao/aplicar')
  @HttpCode(200)
  aplicarRetencao() {
    return this.lgpd.aplicarRetencao();
  }

  @Post('externos/anonimizar')
  @HttpCode(200)
  anonimizarExterno(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: ExternoDto) {
    return this.lgpd.anonimizarExterno(u, dto.email, dto.justificativa);
  }
}
