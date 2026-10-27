import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AmbienteRequerido, Delegavel, Papeis, Publico, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA, PAPEIS_GESTAO } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { RotaExecucao, RotaPin } from '../../common/throttle/throttlers.js';
import { AplicacoesService } from './aplicacoes.service.js';
import {
  CriarAplicacaoDto,
  EventoTentativaDto,
  FiltroAplicacoesDto,
  IniciarPublicoDto,
  ReabrirTentativaDto,
  SalvarRespostaDto,
} from './dto.js';
import { ExecucaoService, type Ator } from './execucao.service.js';

/** Identificador da sessão de execução (sessão única por tentativa). */
const CABECALHO_SESSAO = 'x-sessao-execucao';

@Controller('aplicacoes')
@AmbienteRequerido('PROFISSIONAL')
@Papeis(...PAPEIS_AUTORIA)
export class AplicacoesController {
  constructor(private readonly aplicacoes: AplicacoesService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado, @Query() f: FiltroAplicacoesDto) {
    return this.aplicacoes.listar(u, f.provaId);
  }

  @Post()
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: CriarAplicacaoDto) {
    return this.aplicacoes.criar(u, dto);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.aplicacoes.obter(u, id);
  }

  @Post(':id/encerrar')
  @HttpCode(200)
  encerrar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.aplicacoes.encerrar(u, id);
  }

  @Get('tentativas/:tentativaId/eventos')
  eventos(@UsuarioAtual() u: UsuarioAutenticado, @Param('tentativaId', ParseUUIDPipe) tentativaId: string) {
    return this.aplicacoes.eventos(u, tentativaId);
  }

  /** Reabertura administrativa (RN-40): Administrador e Coordenador, ou quem recebeu a delegação. */
  @Post('tentativas/:tentativaId/reabrir')
  @Papeis(...PAPEIS_GESTAO)
  @Delegavel('REABRIR_TENTATIVAS')
  @HttpCode(200)
  reabrir(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('tentativaId', ParseUUIDPipe) tentativaId: string,
    @Body() dto: ReabrirTentativaDto,
  ) {
    return this.aplicacoes.reabrir(u, tentativaId, dto.justificativa, dto.minutos);
  }
}

/**
 * Execução pelo aluno. Autosave é frequente e já exige autenticação, então fica fora
 * do limite por IP (turma inteira na mesma rede — ADR-0011).
 */
@Controller('aluno')
@AmbienteRequerido('ALUNO')
@Papeis('ALUNO')
export class ExecucaoAlunoController {
  constructor(
    private readonly aplicacoes: AplicacoesService,
    private readonly execucao: ExecucaoService,
  ) {}

  private ator(u: UsuarioAutenticado): Ator {
    return { tipo: 'ALUNO', usuarioId: u.id };
  }

  @Get('aplicacoes')
  disponiveis(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.aplicacoes.doAluno(u.id);
  }

  @Post('aplicacoes/:id/iniciar')
  @HttpCode(200)
  async iniciar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    const { tentativa } = await this.execucao.iniciarAluno(u.id, id);
    return { tentativaId: tentativa.id };
  }

  @Get('tentativas/:id')
  @SkipThrottle()
  @RotaExecucao()
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.execucao.obter(this.ator(u), id);
  }

  @Post('tentativas/:id/sessao')
  @SkipThrottle()
  @RotaExecucao()
  @HttpCode(200)
  abrirSessao(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.execucao.abrirSessao(this.ator(u), id);
  }

  @Put('tentativas/:id/respostas/:versaoQuestaoId')
  @SkipThrottle()
  @RotaExecucao()
  salvar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versaoQuestaoId', ParseUUIDPipe) versaoQuestaoId: string,
    @Body() dto: SalvarRespostaDto,
    @Headers(CABECALHO_SESSAO) sessao?: string,
  ) {
    return this.execucao.salvarResposta(this.ator(u), id, versaoQuestaoId, dto, sessao);
  }

  @Post('tentativas/:id/enviar')
  @SkipThrottle()
  @RotaExecucao()
  @HttpCode(200)
  enviar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers(CABECALHO_SESSAO) sessao?: string,
  ) {
    return this.execucao.enviar(this.ator(u), id, sessao);
  }

  @Post('tentativas/:id/eventos')
  @SkipThrottle()
  @RotaExecucao()
  @HttpCode(200)
  evento(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EventoTentativaDto,
  ) {
    return this.execucao.registrarEvento(this.ator(u), id, dto.tipo, dto.ocorridoEm);
  }

  @Get('tentativas/:id/comprovante')
  comprovante(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.execucao.comprovante(this.ator(u), id);
  }
}

/** Prova pública: acesso por PIN/link com identificação mínima, sem conta (RF06 passo 1). */
@Controller('publico')
@Publico()
export class PublicoController {
  constructor(private readonly execucao: ExecucaoService) {}

  @Get('aplicacoes/:pin')
  @RotaPin()
  info(@Param('pin') pin: string) {
    return this.execucao.infoPublica(pin.slice(0, 20));
  }

  @Post('aplicacoes/:pin/iniciar')
  @RotaPin()
  @HttpCode(200)
  iniciar(@Param('pin') pin: string, @Body() dto: IniciarPublicoDto) {
    return this.execucao.iniciarExterno(pin.slice(0, 20), dto.nome, dto.email);
  }

  @Get('tentativas/:id')
  @SkipThrottle()
  @RotaExecucao()
  async obter(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') auth?: string) {
    return this.execucao.obter(await this.execucao.atorExterno(auth, id), id);
  }

  @Post('tentativas/:id/sessao')
  @SkipThrottle()
  @RotaExecucao()
  @HttpCode(200)
  async abrirSessao(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') auth?: string) {
    return this.execucao.abrirSessao(await this.execucao.atorExterno(auth, id), id);
  }

  @Put('tentativas/:id/respostas/:versaoQuestaoId')
  @SkipThrottle()
  @RotaExecucao()
  async salvar(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versaoQuestaoId', ParseUUIDPipe) versaoQuestaoId: string,
    @Body() dto: SalvarRespostaDto,
    @Headers('authorization') auth?: string,
    @Headers(CABECALHO_SESSAO) sessao?: string,
  ) {
    return this.execucao.salvarResposta(await this.execucao.atorExterno(auth, id), id, versaoQuestaoId, dto, sessao);
  }

  @Post('tentativas/:id/enviar')
  @SkipThrottle()
  @RotaExecucao()
  @HttpCode(200)
  async enviar(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') auth?: string,
    @Headers(CABECALHO_SESSAO) sessao?: string,
  ) {
    return this.execucao.enviar(await this.execucao.atorExterno(auth, id), id, sessao);
  }

  @Post('tentativas/:id/eventos')
  @SkipThrottle()
  @RotaExecucao()
  @HttpCode(200)
  async evento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EventoTentativaDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.execucao.registrarEvento(await this.execucao.atorExterno(auth, id), id, dto.tipo, dto.ocorridoEm);
  }

  @Get('tentativas/:id/comprovante')
  async comprovante(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') auth?: string) {
    return this.execucao.comprovante(await this.execucao.atorExterno(auth, id), id);
  }
}
