import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinDate } from 'class-validator';
import { AmbienteRequerido, Papeis, PermiteSenhaPendente, UsuarioAtual } from '../../common/auth/decorators.js';
import { RotaCredencial } from '../../common/throttle/throttlers.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { ContaService } from './conta.service.js';
import { PermissoesService } from './permissoes.service.js';

class CodigoDto {
  @Matches(/^\d{6}$/, { message: 'O código deve ter 6 dígitos' })
  codigo!: string;
}

class DesativarMfaDto extends CodigoDto {
  @IsString() @IsNotEmpty({ message: 'Informe a senha' }) @MaxLength(128)
  senha!: string;
}

class JustificativaDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @IsNotEmpty({ message: 'A justificativa é obrigatória' }) @MaxLength(2000)
  justificativa!: string;
}

class ConcederDto extends JustificativaDto {
  /** Validade opcional (lote 7): depois dela a permissão deixa de valer sozinha. */
  @IsOptional() @Type(() => Date) @IsDate({ message: 'Data de validade inválida' })
  @MinDate(() => new Date(), { message: 'A validade deve ser no futuro' })
  expiraEm?: Date;
}

class AceitarPoliticaDto {
  /** Versão exibida ao usuário; se não for a vigente, o aceite é recusado (ADR-0060). */
  @IsOptional() @IsString() @MaxLength(32)
  versao?: string;
}

class PreferenciasDto {
  @IsOptional() @IsBoolean()
  notificacoesPorEmail?: boolean;
}

/** Autoatendimento: verificação em duas etapas e sessões abertas (os dois ambientes). */
@Controller('minha-conta')
export class ContaController {
  constructor(
    private readonly conta: ContaService,
    private readonly permissoes: PermissoesService,
  ) {}

  @Get('mfa')
  mfa(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.conta.situacaoMfa(u);
  }

  @Post('mfa/iniciar')
  @HttpCode(200)
  iniciarMfa(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.conta.iniciarMfa(u);
  }

  @Post('mfa/confirmar')
  @HttpCode(200)
  @RotaCredencial()
  confirmarMfa(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: CodigoDto) {
    return this.conta.confirmarMfa(u, dto.codigo);
  }

  @Post('mfa/desativar')
  @HttpCode(200)
  @RotaCredencial()
  desativarMfa(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: DesativarMfaDto) {
    return this.conta.desativarMfa(u, dto.senha, dto.codigo);
  }

  @Post('mfa/codigos-recuperacao')
  @HttpCode(200)
  @RotaCredencial()
  novosCodigos(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: CodigoDto) {
    return this.conta.novosCodigosRecuperacao(u, dto.codigo);
  }

  @Get('sessoes')
  sessoes(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.conta.sessoesAtivas(u);
  }

  @Delete('sessoes/:id')
  encerrar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.conta.encerrarSessao(u, id);
  }

  @Post('sessoes/encerrar-outras')
  @HttpCode(200)
  encerrarOutras(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.conta.encerrarOutras(u);
  }

  @Post('politica/aceitar')
  @HttpCode(200)
  @PermiteSenhaPendente()
  aceitarPolitica(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: AceitarPoliticaDto) {
    return this.conta.aceitarPolitica(u, dto.versao);
  }

  @Patch('preferencias')
  preferencias(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: PreferenciasDto) {
    return this.conta.preferencias(u, dto);
  }

  @Get('permissoes')
  minhasPermissoes(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.permissoes.doUsuario(u.id);
  }
}

/** RF02 — delegação de permissões (gestão concede a professor/corretor). */
@Controller('permissoes')
@AmbienteRequerido('PROFISSIONAL')
@Papeis('ADMINISTRADOR', 'COORDENADOR')
export class PermissoesController {
  constructor(private readonly permissoes: PermissoesService) {}

  @Get('catalogo')
  catalogo() {
    return this.permissoes.catalogo();
  }

  @Get('usuarios/:id')
  listar(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissoes.listar(id);
  }

  @Put('usuarios/:id/:permissao')
  conceder(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissao') permissao: string,
    @Body() dto: ConcederDto,
  ) {
    return this.permissoes.conceder(u, id, permissao, dto.justificativa, dto.expiraEm);
  }

  /** POST (e não DELETE) porque leva justificativa no corpo. */
  @Post('usuarios/:id/:permissao/revogar')
  @HttpCode(200)
  revogar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissao') permissao: string,
    @Body() dto: JustificativaDto,
  ) {
    return this.permissoes.revogar(u, id, permissao, dto.justificativa);
  }
}
