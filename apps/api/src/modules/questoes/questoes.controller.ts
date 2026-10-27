import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AmbienteRequerido, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { EnviarRevisaoDto, ListarQuestoesDto, RejeitarDto, SalvarQuestaoDto } from './dto.js';
import { QuestoesService } from './questoes.service.js';

@Controller('questoes')
@AmbienteRequerido('PROFISSIONAL')
@Papeis(...PAPEIS_AUTORIA)
export class QuestoesController {
  constructor(private readonly questoes: QuestoesService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() filtro: ListarQuestoesDto) {
    return this.questoes.listar(u, filtro);
  }

  @Get('disciplinas')
  disciplinas(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.questoes.disciplinas(u);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.questoes.obter(u, id);
  }

  @Post()
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: SalvarQuestaoDto) {
    return this.questoes.criar(u, dto);
  }

  @Put(':id')
  editar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SalvarQuestaoDto,
  ) {
    return this.questoes.editar(u, id, dto);
  }

  @Post(':id/enviar-revisao')
  @HttpCode(200)
  enviarRevisao(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnviarRevisaoDto,
  ) {
    return this.questoes.enviarRevisao(u, id, dto.confirmarDuplicidade);
  }

  @Post(':id/aprovar')
  @HttpCode(200)
  aprovar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.questoes.aprovar(u, id);
  }

  @Post(':id/rejeitar')
  @HttpCode(200)
  rejeitar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejeitarDto,
  ) {
    return this.questoes.rejeitar(u, id, dto.comentario);
  }

  @Post(':id/versoes/:versaoId/aprovar')
  @HttpCode(200)
  aprovarVersao(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versaoId', ParseUUIDPipe) versaoId: string,
  ) {
    return this.questoes.aprovarVersao(u, id, versaoId);
  }

  @Post(':id/versoes/:versaoId/rejeitar')
  @HttpCode(200)
  rejeitarVersao(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versaoId', ParseUUIDPipe) versaoId: string,
    @Body() dto: RejeitarDto,
  ) {
    return this.questoes.rejeitarVersao(u, id, versaoId, dto.comentario);
  }

  @Post(':id/arquivar')
  @HttpCode(200)
  arquivar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.questoes.arquivar(u, id);
  }
}
