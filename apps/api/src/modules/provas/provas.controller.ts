import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AmbienteRequerido, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { ComporProvaDto, ComporSecoesDto, DefinirCorretoresDto, ListarProvasDto, SalvarProvaDto } from './dto.js';
import { ProvasService } from './provas.service.js';

@Controller('provas')
@AmbienteRequerido('PROFISSIONAL')
@Papeis(...PAPEIS_AUTORIA)
export class ProvasController {
  constructor(private readonly provas: ProvasService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() f: ListarProvasDto) {
    return this.provas.listar(u, f);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.provas.obter(u, id);
  }

  @Post()
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: SalvarProvaDto) {
    return this.provas.criar(u, dto);
  }

  @Put(':id')
  editar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SalvarProvaDto) {
    return this.provas.editar(u, id, dto);
  }

  @Put(':id/composicao')
  comporSecoes(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ComporSecoesDto) {
    return this.provas.comporSecoes(u, id, dto);
  }

  @Put(':id/corretores')
  definirCorretores(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DefinirCorretoresDto) {
    return this.provas.definirCorretores(u, id, dto.usuarioIds);
  }

  @Put(':id/questoes')
  compor(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ComporProvaDto) {
    return this.provas.compor(u, id, dto);
  }

  @Post(':id/publicar')
  @HttpCode(200)
  publicar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.provas.publicar(u, id);
  }

  @Post(':id/atualizar-versoes')
  @HttpCode(200)
  atualizarVersoes(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.provas.atualizarVersoes(u, id);
  }

  @Post(':id/duplicar')
  duplicar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.provas.duplicar(u, id);
  }

  @Post(':id/arquivar')
  @HttpCode(200)
  arquivar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.provas.arquivar(u, id);
  }
}
