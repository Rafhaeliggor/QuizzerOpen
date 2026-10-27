import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AmbienteRequerido, Delegavel, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { CriarUsuarioDto, EditarUsuarioDto, JustificativaDto, ListarUsuariosDto } from './dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@AmbienteRequerido('PROFISSIONAL')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  @Papeis('ADMINISTRADOR')
  criar(@Body() dto: CriarUsuarioDto, @UsuarioAtual() u: UsuarioAutenticado) {
    return this.usuarios.criar(dto, u.id);
  }

  @Get()
  @Papeis('ADMINISTRADOR', 'COORDENADOR')
  @Delegavel('DESBLOQUEAR_CONTAS')
  listar(@Query() filtro: ListarUsuariosDto) {
    return this.usuarios.listar(filtro);
  }

  /** Para escolher co-professores de turma: só nome e e-mail de professores ativos. */
  @Get('professores')
  @Papeis(...PAPEIS_AUTORIA)
  professores() {
    return this.usuarios.professoresAtivos();
  }

  /** Para designar corretores de prova (lote 8): nome/e-mail de corretores e professores ativos. */
  @Get('corretores')
  @Papeis(...PAPEIS_AUTORIA)
  corretores() {
    return this.usuarios.possiveisCorretores();
  }

  @Get(':id')
  @Papeis('ADMINISTRADOR', 'COORDENADOR')
  @Delegavel('DESBLOQUEAR_CONTAS')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.obter(id);
  }

  @Patch(':id')
  @Papeis('ADMINISTRADOR')
  editar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: EditarUsuarioDto) {
    return this.usuarios.editar(u, id, dto);
  }

  @Post(':id/desativar')
  @Papeis('ADMINISTRADOR')
  @HttpCode(200)
  desativar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: JustificativaDto) {
    return this.usuarios.definirAtivo(u, id, false, dto.justificativa);
  }

  @Post(':id/reativar')
  @Papeis('ADMINISTRADOR')
  @HttpCode(200)
  reativar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: JustificativaDto) {
    return this.usuarios.definirAtivo(u, id, true, dto.justificativa);
  }

  @Post(':id/redefinir-senha')
  @Papeis('ADMINISTRADOR')
  @HttpCode(200)
  redefinirSenha(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.redefinirSenha(u, id);
  }

  /** Coordenação também desbloqueia (atendimento de aluno/professor bloqueado). */
  @Post(':id/desbloquear')
  @Papeis('ADMINISTRADOR', 'COORDENADOR')
  @Delegavel('DESBLOQUEAR_CONTAS')
  @HttpCode(200)
  desbloquear(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.desbloquear(u, id);
  }

  @Post(':id/resetar-mfa')
  @Papeis('ADMINISTRADOR')
  @HttpCode(200)
  resetarMfa(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string, @Body() dto: JustificativaDto) {
    return this.usuarios.resetarMfa(u, id, dto.justificativa);
  }
}
