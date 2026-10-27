import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AmbienteRequerido, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { AbrirRecursoDto, DecidirRecursoDto, EncaminharRecursoDto, ListarRecursosDto } from './dto.js';
import { RecursosService } from './recursos.service.js';

@Controller('recursos')
@AmbienteRequerido('PROFISSIONAL')
@Papeis(...PAPEIS_AUTORIA)
export class RecursosController {
  constructor(private readonly recursos: RecursosService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() f: ListarRecursosDto) {
    return this.recursos.listar(u, f.status);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.recursos.obter(u, id);
  }

  @Post(':id/analisar')
  @HttpCode(200)
  analisar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.recursos.analisar(u, id);
  }

  @Post(':id/encaminhar')
  @HttpCode(200)
  encaminhar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EncaminharRecursoDto,
  ) {
    return this.recursos.encaminhar(u, id, dto.motivo);
  }

  @Post(':id/decidir')
  @HttpCode(200)
  decidir(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecidirRecursoDto,
  ) {
    return this.recursos.decidir(u, id, dto);
  }
}

@Controller('aluno/recursos')
@AmbienteRequerido('ALUNO')
@Papeis('ALUNO')
export class RecursosAlunoController {
  constructor(private readonly recursos: RecursosService) {}

  @Get()
  meus(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.recursos.doAluno(u.id);
  }

  @Post()
  abrir(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: AbrirRecursoDto) {
    return this.recursos.abrir(u, dto);
  }
}
