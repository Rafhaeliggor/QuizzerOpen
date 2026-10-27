import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { EmailService } from '../../infra/email/email.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { SenhaService } from './senha.service.js';
import { SessaoService } from './sessao.service.js';

const MIN = 60_000;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * "Esqueci minha senha" e convite de primeiro acesso por e-mail (ADR-0041). O token vai só no
 * link do e-mail; no banco fica o SHA-256. Uso único, validade curta, pedidos anteriores
 * invalidados. A resposta ao pedido é sempre a mesma (não revela se o e-mail existe).
 */
@Injectable()
export class RecuperacaoService {
  private readonly logger = new Logger(RecuperacaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly senhas: SenhaService,
    private readonly sessoes: SessaoService,
    private readonly auditoria: AuditoriaService,
  ) {}

  get habilitado() {
    return this.email.habilitado;
  }

  async solicitar(emailInformado: string, ip?: string): Promise<void> {
    if (!this.email.habilitado) return;
    const usuario = await this.prisma.usuario.findUnique({ where: { email: emailInformado.trim().toLowerCase() } });
    if (!usuario || !usuario.ativo || usuario.anonimizadoEm) return;
    // Contém abuso: no máximo 3 pedidos por conta a cada 30 min.
    const recentes = await this.prisma.redefinicaoSenha.count({
      where: { usuarioId: usuario.id, criadoEm: { gt: new Date(Date.now() - 30 * MIN) } },
    });
    if (recentes >= 3) return;
    const token = await this.criarToken(usuario.id, 30 * MIN);
    const caminho = usuario.papel === 'ALUNO' ? '/aluno/redefinir-senha' : '/redefinir-senha';
    await this.email.enviar({
      para: usuario.email,
      assunto: 'Redefinição de senha',
      texto:
        `Olá, ${usuario.nome}.\n\nRecebemos um pedido para redefinir a sua senha. Use o link abaixo em até 30 minutos:\n\n` +
        `${this.email.link(`${caminho}?token=${token}`)}\n\nSe não foi você, ignore esta mensagem — a senha atual continua valendo.`,
    });
    await this.auditoria.registrar({ usuarioId: usuario.id, acao: 'SENHA_RECUPERACAO_SOLICITADA', recurso: 'usuario', recursoId: usuario.id, ip });
  }

  /** Convite de primeiro acesso (usuário criado pela administração ou por importação). */
  async enviarConvite(usuarioId: string): Promise<boolean> {
    if (!this.email.habilitado) return false;
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) return false;
    const token = await this.criarToken(usuario.id, 72 * 60 * MIN);
    const caminho = usuario.papel === 'ALUNO' ? '/aluno/redefinir-senha' : '/redefinir-senha';
    return this.email.enviar({
      para: usuario.email,
      assunto: 'Seu acesso ao Quizzer',
      texto:
        `Olá, ${usuario.nome}.\n\nUma conta foi criada para você no Quizzer. Defina a sua senha pelo link abaixo (válido por 3 dias):\n\n` +
        `${this.email.link(`${caminho}?token=${token}`)}\n\nDepois, entre com o e-mail ${usuario.email}` +
        `${usuario.matricula ? ` ou a matrícula ${usuario.matricula}` : ''}.`,
    });
  }

  async redefinir(token: string, novaSenha: string): Promise<void> {
    const pedido = await this.prisma.redefinicaoSenha.findUnique({ where: { tokenHash: hash(token) }, include: { usuario: true } });
    if (!pedido || pedido.usadoEm || pedido.expiraEm < new Date() || !pedido.usuario.ativo || pedido.usuario.anonimizadoEm) {
      throw new BadRequestException({ message: 'Link inválido ou expirado. Peça um novo.', codigo: 'TOKEN_INVALIDO' });
    }
    const usado = await this.prisma.redefinicaoSenha.updateMany({
      where: { id: pedido.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    if (usado.count === 0) throw new BadRequestException({ message: 'Link já utilizado.', codigo: 'TOKEN_INVALIDO' });
    await this.prisma.usuario.update({
      where: { id: pedido.usuarioId },
      data: {
        senhaHash: await this.senhas.hash(novaSenha),
        trocarSenha: false,
        tentativasLoginFalha: 0,
        bloqueadoAte: null,
      },
    });
    await this.sessoes.revogarTodas(pedido.usuarioId);
    await this.auditoria.registrar({ usuarioId: pedido.usuarioId, acao: 'SENHA_REDEFINIDA_POR_EMAIL', recurso: 'usuario', recursoId: pedido.usuarioId });
  }

  private async criarToken(usuarioId: string, validadeMs: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      // Só o link mais recente vale.
      this.prisma.redefinicaoSenha.updateMany({ where: { usuarioId, usadoEm: null }, data: { usadoEm: new Date() } }),
      this.prisma.redefinicaoSenha.create({ data: { usuarioId, tokenHash: hash(token), expiraEm: new Date(Date.now() + validadeMs) } }),
    ]);
    return token;
  }
}
