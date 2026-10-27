import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AmbienteRequerido, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_CORRECAO } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { CorrecaoService } from './correcao.service.js';

class CorrigirDto {
  /** Percentual direto (0–100) — ou `pontosItens` quando a rubrica tem critérios. */
  @IsOptional()
  @IsInt({ message: 'Informe um percentual inteiro' })
  @Min(0)
  @Max(100)
  percentual?: number;

  /** Pontos dados em cada critério da rubrica, na ordem (lote 8). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { each: true })
  @Min(0, { each: true })
  @ArrayMaxSize(20)
  pontosItens?: number[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}

class FiltroNotasDto {
  @IsOptional() @IsUUID()
  provaId?: string;

  @IsOptional() @IsUUID()
  aplicacaoId?: string;
}

@Controller('correcao')
@AmbienteRequerido('PROFISSIONAL')
@Papeis(...PAPEIS_CORRECAO)
export class CorrecaoController {
  constructor(private readonly correcao: CorrecaoService) {}

  @Get('pendentes')
  pendentes(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.correcao.pendentes(u);
  }

  @Get('notas')
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() f: FiltroNotasDto) {
    return this.correcao.listar(u, f);
  }

  @Get('notas/:id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.correcao.obter(u, id);
  }

  @Post('notas/:id/questoes/:versaoQuestaoId')
  corrigir(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versaoQuestaoId', ParseUUIDPipe) versaoQuestaoId: string,
    @Body() dto: CorrigirDto,
  ) {
    return this.correcao.corrigir(u, id, versaoQuestaoId, { percentual: dto.percentual, pontosItens: dto.pontosItens }, dto.feedback);
  }
}

@Controller('aluno/resultados')
@AmbienteRequerido('ALUNO')
@Papeis('ALUNO')
export class ResultadosAlunoController {
  constructor(private readonly correcao: CorrecaoService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.correcao.resultadosDoAluno(u.id);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.correcao.resultadoDoAluno(u.id, id);
  }
}
