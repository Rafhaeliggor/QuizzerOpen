import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';
import type { Papel } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { SessaoService } from '../src/modules/iam/sessao.service.js';

export const SENHA = 'SenhaDeTeste123';

export async function criarApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/**
 * Limpa as tabelas usadas pelos testes. `auditoria.eventos` é somente inserção
 * (trigger) e por isso não é truncada — os testes não dependem dela estar vazia.
 */
export async function limparBanco(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    `TRUNCATE iam.sessoes, iam.permissoes_delegadas, iam.redefinicoes_senha, iam.chaves_integracao, iam.usuarios,
      turmas.matriculas, turmas.turma_professores, turmas.turmas,
      questoes.midias, questoes.versoes_questao, questoes.questoes,
      provas.prova_questoes, provas.secoes, provas.prova_corretores, provas.provas,
      aplicacao.respostas, aplicacao.eventos_tentativa, aplicacao.aplicacao_alunos, aplicacao.tentativas, aplicacao.instancias, aplicacao.aplicacoes,
      correcao.correcoes_questao, correcao.notas, correcao.anulacoes,
      recursos.recursos, notificacoes.notificacoes, notificacoes.emails_pendentes, iam.solicitacoes_lgpd CASCADE`,
  );
}

/** Cria o usuário e devolve o header Authorization (o fluxo de login/MFA tem teste próprio). */
export async function autenticar(
  app: INestApplication,
  prisma: PrismaService,
  papel: Papel,
  extra: Partial<{ email: string; matricula: string }> = {},
) {
  const usuario = await criarUsuario(prisma, papel, extra);
  const ambiente = papel === 'ALUNO' ? 'ALUNO' : 'PROFISSIONAL';
  const { accessToken } = await app.get(SessaoService).criarSessao(usuario, ambiente, {});
  return { usuario, auth: `Bearer ${accessToken}` };
}

let hashCache: string | undefined;
export async function criarUsuario(
  prisma: PrismaService,
  papel: Papel,
  extra: Partial<{
    email: string;
    matricula: string;
    trocarSenha: boolean;
  }> = {},
) {
  hashCache ??= await argon2.hash(SENHA, { type: argon2.argon2id });
  return prisma.usuario.create({
    data: {
      nome: `Usuário ${papel}`,
      email: extra.email ?? `${papel.toLowerCase()}@teste.local`,
      matricula: extra.matricula,
      papel,
      senhaHash: hashCache,
      trocarSenha: extra.trocarSenha ?? false,
    },
  });
}

/** Extrai o valor do cookie de refresh de uma resposta. */
export function cookieRefresh(
  setCookie: string | string[] | undefined,
): string | undefined {
  const lista = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  return lista.find((c) => c.startsWith('qz_refresh='))?.split(';')[0];
}
