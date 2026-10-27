import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  PermiteSenhaPendente,
  Publico,
  UsuarioAtual,
} from '../../common/auth/decorators.js';
import {
  ambienteDoPapel,
  type UsuarioAutenticado,
} from '../../common/auth/tipos.js';
import { RotaCredencial } from '../../common/throttle/throttlers.js';
import type { Env } from '../../config/env.js';
import { AuthService, ResultadoLogin } from './auth.service.js';
import { RecuperacaoService } from './recuperacao.service.js';
import {
  EsqueciSenhaDto,
  LoginAlunoDto,
  LoginProfissionalDto,
  MfaTokenDto,
  RedefinirSenhaDto,
  TrocarSenhaDto,
  VerificarMfaDto,
} from './dto.js';
import {
  ContextoRequisicao,
  SessaoService,
  TokensEmitidos,
} from './sessao.service.js';

export const COOKIE_REFRESH = 'qz_refresh';
const CAMINHO_COOKIE = '/api/v1/auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessoes: SessaoService,
    private readonly config: ConfigService<Env, true>,
    private readonly recuperacao: RecuperacaoService,
  ) {}

  @Post('profissional/login')
  @Publico()
  @HttpCode(200)
  @RotaCredencial()
  async loginProfissional(
    @Body() dto: LoginProfissionalDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.responderLogin(
      await this.auth.login(
        'PROFISSIONAL',
        dto.email,
        dto.senha,
        contexto(req),
      ),
      res,
    );
  }

  @Post('aluno/login')
  @Publico()
  @HttpCode(200)
  @RotaCredencial()
  async loginAluno(
    @Body() dto: LoginAlunoDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.responderLogin(
      await this.auth.login('ALUNO', dto.login, dto.senha, contexto(req)),
      res,
    );
  }

  @Post('mfa/cadastro')
  @Publico()
  @HttpCode(200)
  @RotaCredencial()
  iniciarCadastroMfa(@Body() dto: MfaTokenDto) {
    return this.auth.iniciarCadastroMfa(dto.mfaToken);
  }

  @Post('mfa/verificar')
  @Publico()
  @HttpCode(200)
  @RotaCredencial()
  async verificarMfa(
    @Body() dto: VerificarMfaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.responderLogin(
      await this.auth.verificarMfa(dto.mfaToken, dto.codigo, contexto(req)),
      res,
    );
  }

  /** Renova o access token a partir do cookie httpOnly (rotação do refresh). */
  @Post('refresh')
  @Publico()
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const tokens = await this.sessoes.renovar(
        req.cookies?.[COOKIE_REFRESH] as string | undefined,
      );
      // Sem refresh novo (perdeu a corrida para outra aba): o cookie atual continua valendo.
      if (tokens.refreshToken && tokens.refreshExpiraEm) {
        this.gravarCookie(res, { ...tokens, refreshToken: tokens.refreshToken, refreshExpiraEm: tokens.refreshExpiraEm });
      }
      return { accessToken: tokens.accessToken };
    } catch (erro) {
      this.limparCookie(res);
      throw erro;
    }
  }

  @Post('logout')
  @PermiteSenhaPendente()
  @HttpCode(204)
  async logout(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.sessoes.revogar(usuario.sessaoId);
    this.limparCookie(res);
  }

  /** Recursos opcionais ligados no servidor (a tela de login mostra "Esqueci minha senha"). */
  @Get('recursos')
  @Publico()
  recursos() {
    return { emailHabilitado: this.recuperacao.habilitado };
  }

  /** Sempre 200 com a mesma mensagem — não revela se o e-mail tem conta. */
  @Post('senha/esqueci')
  @Publico()
  @HttpCode(200)
  @RotaCredencial()
  async esqueci(@Body() dto: EsqueciSenhaDto, @Req() req: Request) {
    await this.recuperacao.solicitar(dto.email, contexto(req).ip);
    return { mensagem: 'Se houver uma conta com este e-mail, enviaremos um link para redefinir a senha.' };
  }

  @Post('senha/redefinir')
  @Publico()
  @HttpCode(200)
  @RotaCredencial()
  async redefinir(@Body() dto: RedefinirSenhaDto) {
    await this.recuperacao.redefinir(dto.token, dto.novaSenha);
    return { mensagem: 'Senha redefinida. Entre com a nova senha.' };
  }

  @Get('me')
  @PermiteSenhaPendente()
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.auth
      .perfil(usuario.id)
      .then((perfil) => ({ ...perfil, ambiente: usuario.ambiente }));
  }

  @Post('senha')
  @PermiteSenhaPendente()
  @HttpCode(200)
  @RotaCredencial()
  trocarSenha(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: TrocarSenhaDto,
  ) {
    return this.auth.trocarSenha(usuario, dto.senhaAtual, dto.novaSenha);
  }

  private responderLogin(resultado: ResultadoLogin, res: Response) {
    if (resultado.status !== 'AUTENTICADO') return resultado;
    this.gravarCookie(res, resultado.tokens);
    return {
      status: resultado.status,
      accessToken: resultado.tokens.accessToken,
      usuario: {
        ...resultado.usuario,
        ambiente: ambienteDoPapel(resultado.usuario.papel),
      },
    };
  }

  private gravarCookie(res: Response, tokens: TokensEmitidos) {
    res.cookie(COOKIE_REFRESH, tokens.refreshToken, {
      httpOnly: true,
      secure: this.config.get('TLS_ATIVO', { infer: true }),
      sameSite: 'strict',
      path: CAMINHO_COOKIE,
      expires: tokens.refreshExpiraEm,
    });
  }

  private limparCookie(res: Response) {
    res.clearCookie(COOKIE_REFRESH, { path: CAMINHO_COOKIE });
  }
}

function contexto(req: Request): ContextoRequisicao {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}
