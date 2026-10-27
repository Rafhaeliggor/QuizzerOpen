import type { INestApplication } from '@nestjs/common';
import { generate } from 'otplib';
import request from 'supertest';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import {
  cookieRefresh,
  criarApp,
  criarUsuario,
  limparBanco,
  SENHA,
} from './utilitarios.js';

/** Aguarda o próximo time-step TOTP (para não reutilizar o mesmo código). */
async function codigoDoProximoPasso(segredo: string) {
  const restante = 30_000 - (Date.now() % 30_000);
  await new Promise((r) => setTimeout(r, restante + 50));
  return generate({ secret: segredo });
}

describe('Autenticação (RF01) — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  // App novo por teste: isola também o armazenamento em memória do rate limit.
  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  describe('login profissional sem MFA obrigatório', () => {
    it('autentica professor, devolve access token e grava cookie httpOnly de refresh', async () => {
      await criarUsuario(prisma, 'PROFESSOR');
      const res = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'PROFESSOR@teste.local', senha: SENHA })
        .expect(200);

      expect(res.body.status).toBe('AUTENTICADO');
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.usuario).toMatchObject({
        papel: 'PROFESSOR',
        ambiente: 'PROFISSIONAL',
      });
      expect(res.body.usuario.senhaHash).toBeUndefined();

      const setCookie = ([] as string[])
        .concat(res.headers['set-cookie'] ?? [])
        .join(';');
      expect(setCookie).toMatch(/qz_refresh=.+HttpOnly/);
      expect(setCookie).toMatch(/SameSite=Strict/);
      expect(setCookie).toMatch(/Path=\/api\/v1\/auth/);

      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200)
        .expect((r) => expect(r.body.email).toBe('professor@teste.local'));
    });

    it('retorna mensagem genérica para usuário inexistente e senha errada', async () => {
      await criarUsuario(prisma, 'PROFESSOR');
      const a = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'ninguem@teste.local', senha: SENHA })
        .expect(401);
      const b = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'professor@teste.local', senha: 'errada' })
        .expect(401);
      expect(a.body.message).toBe(b.body.message);
    });
  });

  describe('isolamento entre ambientes', () => {
    it('aluno não autentica no portal profissional (e vice-versa)', async () => {
      await criarUsuario(prisma, 'ALUNO');
      await criarUsuario(prisma, 'PROFESSOR');
      await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'aluno@teste.local', senha: SENHA })
        .expect(401);
      await http()
        .post('/api/v1/auth/aluno/login')
        .send({ login: 'professor@teste.local', senha: SENHA })
        .expect(401);
    });

    it('aluno entra por matrícula e não acessa rotas profissionais', async () => {
      await criarUsuario(prisma, 'ALUNO', { matricula: '2026123' });
      const res = await http()
        .post('/api/v1/auth/aluno/login')
        .send({ login: '2026123', senha: SENHA })
        .expect(200);
      expect(res.body.usuario.ambiente).toBe('ALUNO');

      await http()
        .get('/api/v1/usuarios')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(403);
    });
  });

  describe('bloqueio por tentativas inválidas', () => {
    it('bloqueia a conta ao atingir o limite e recusa até a senha correta', async () => {
      await criarUsuario(prisma, 'PROFESSOR');
      const tentar = (senha: string) =>
        http()
          .post('/api/v1/auth/profissional/login')
          .send({ email: 'professor@teste.local', senha });

      // LOGIN_MAX_TENTATIVAS=3 no ambiente de teste
      await tentar('errada1').expect(401);
      await tentar('errada2').expect(401);
      await tentar('errada3').expect(401);

      // Bloqueada: mesma resposta de credencial inválida, inclusive com a senha certa (BUG-048) —
      // quem tenta não descobre se a conta existe. O titular recebe a notificação do bloqueio.
      const bloqueado = await tentar(SENHA).expect(401);
      const inexistente = await http().post('/api/v1/auth/profissional/login')
        .send({ email: 'ninguem@teste.local', senha: SENHA }).expect(401);
      expect(bloqueado.body.message).toBe(inexistente.body.message);
      expect(bloqueado.body.codigo).toBeUndefined();
      const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'professor@teste.local' } });
      expect(await prisma.notificacao.count({ where: { usuarioId: u.id, tipo: 'CONTA_BLOQUEADA' } })).toBe(1);
    });

    it('migra hash com parâmetros antigos no login (re-hash transparente)', async () => {
      const u = await criarUsuario(prisma, 'PROFESSOR'); // utilitário usa os padrões antigos da lib
      expect(u.senhaHash).toContain('m=65536');
      await http().post('/api/v1/auth/profissional/login').send({ email: 'professor@teste.local', senha: SENHA }).expect(200);
      const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } });
      expect(depois.senhaHash).toMatch(/m=19456,p=1,t=2/);
      await http().post('/api/v1/auth/profissional/login').send({ email: 'professor@teste.local', senha: SENHA }).expect(200);
    });

    it('login com sucesso zera o contador de falhas', async () => {
      const u = await criarUsuario(prisma, 'PROFESSOR');
      const tentar = (senha: string) =>
        http()
          .post('/api/v1/auth/profissional/login')
          .send({ email: 'professor@teste.local', senha });
      await tentar('errada1').expect(401);
      await tentar('errada2').expect(401);
      await tentar(SENHA).expect(200);
      const atual = await prisma.usuario.findUniqueOrThrow({
        where: { id: u.id },
      });
      expect(atual.tentativasLoginFalha).toBe(0);
    });
  });

  describe('MFA obrigatório para Administrador/Coordenador', () => {
    it('primeiro login exige cadastro do TOTP; logins seguintes exigem o código', async () => {
      await criarUsuario(prisma, 'ADMINISTRADOR');

      const login = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'administrador@teste.local', senha: SENHA })
        .expect(200);
      expect(login.body).toEqual({
        status: 'MFA_CADASTRO_REQUERIDO',
        mfaToken: expect.any(String),
      });
      expect(login.headers['set-cookie']).toBeUndefined();

      // O token intermediário não serve como access token.
      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${login.body.mfaToken}`)
        .expect(401);

      const cadastro = await http()
        .post('/api/v1/auth/mfa/cadastro')
        .send({ mfaToken: login.body.mfaToken })
        .expect(200);
      expect(cadastro.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      const segredo: string = cadastro.body.segredo;

      // O segredo fica cifrado no banco.
      const salvo = await prisma.usuario.findUniqueOrThrow({
        where: { email: 'administrador@teste.local' },
      });
      expect(salvo.mfaSegredoCifrado).not.toContain(segredo);

      await http()
        .post('/api/v1/auth/mfa/verificar')
        .send({ mfaToken: login.body.mfaToken, codigo: '000000' })
        .expect(401);

      const codigo = await generate({ secret: segredo });
      const verificado = await http()
        .post('/api/v1/auth/mfa/verificar')
        .send({ mfaToken: login.body.mfaToken, codigo })
        .expect(200);
      expect(verificado.body.status).toBe('AUTENTICADO');
      expect(verificado.body.usuario.mfaHabilitado).toBe(true);

      // Segundo login: agora pede apenas o código.
      const login2 = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'administrador@teste.local', senha: SENHA })
        .expect(200);
      expect(login2.body.status).toBe('MFA_REQUERIDO');

      // Duas requisições concorrentes com o mesmo código: uma única aceitação.
      const codigoConcorrente = await codigoDoProximoPasso(segredo);
      const concorrentes = await Promise.all([
        http().post('/api/v1/auth/mfa/verificar').send({ mfaToken: login2.body.mfaToken, codigo: codigoConcorrente }),
        http().post('/api/v1/auth/mfa/verificar').send({ mfaToken: login2.body.mfaToken, codigo: codigoConcorrente }),
      ]);
      expect(concorrentes.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 401]);

      // Cadastro não pode ser refeito por quem já tem MFA.
      await http()
        .post('/api/v1/auth/mfa/cadastro')
        .send({ mfaToken: login2.body.mfaToken })
        .expect(400);

    }, 45_000);
  });

  describe('sessão: refresh com rotação e logout', () => {
    it('renova o access token, rotaciona o refresh e revoga a sessão em caso de reuso', async () => {
      await criarUsuario(prisma, 'PROFESSOR');
      const login = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'professor@teste.local', senha: SENHA })
        .expect(200);
      const cookie1 = cookieRefresh(login.headers['set-cookie'])!;

      const r1 = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie1)
        .expect(200);
      expect(r1.body.accessToken).toEqual(expect.any(String));
      const cookie2 = cookieRefresh(r1.headers['set-cookie'])!;
      expect(cookie2).not.toBe(cookie1);

      // Reapresentar o refresh antigo FORA da janela de tolerância revoga a sessão — inclusive o novo.
      await prisma.sessao.updateMany({ data: { rotacionadaEm: new Date(Date.now() - 60_000) } });
      await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie1)
        .expect(401);
      await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie2)
        .expect(401);
    });

    it('duas abas renovando juntas não derrubam a sessão (BUG-047)', async () => {
      await criarUsuario(prisma, 'PROFESSOR');
      const login = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'professor@teste.local', senha: SENHA })
        .expect(200);
      const cookie1 = cookieRefresh(login.headers['set-cookie'])!;

      // As duas apresentam o mesmo refresh ao mesmo tempo: ambas recebem access token.
      const [a, b] = await Promise.all([
        http().post('/api/v1/auth/refresh').set('Cookie', cookie1),
        http().post('/api/v1/auth/refresh').set('Cookie', cookie1),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      // Só uma rotacionou (grava cookie novo); a outra não sobrescreve o cookie do vencedor.
      const novos = [a, b].map((r) => cookieRefresh(r.headers['set-cookie'])).filter(Boolean);
      expect(novos).toHaveLength(1);
      // O refresh do vencedor continua válido e a sessão segue ativa.
      await http().post('/api/v1/auth/refresh').set('Cookie', novos[0]!).expect(200);
      expect(await prisma.sessao.count({ where: { revogadaEm: null } })).toBe(1);
    });

    it('logout revoga a sessão', async () => {
      await criarUsuario(prisma, 'PROFESSOR');
      const login = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'professor@teste.local', senha: SENHA })
        .expect(200);
      const cookie = cookieRefresh(login.headers['set-cookie'])!;

      await http()
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(204);
      await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .expect(401);
    });
  });

  describe('troca de senha obrigatória no primeiro acesso', () => {
    it('bloqueia demais rotas até trocar a senha', async () => {
      await criarUsuario(prisma, 'PROFESSOR', { trocarSenha: true });

      const login = await http()
        .post('/api/v1/auth/profissional/login')
        .send({ email: 'professor@teste.local', senha: SENHA })
        .expect(200);
      const auth = `Bearer ${login.body.accessToken}`;
      expect(login.body.usuario.trocarSenha).toBe(true);

      const bloqueado = await http()
        .get('/api/v1/usuarios')
        .set('Authorization', auth)
        .expect(403);
      expect(bloqueado.body.codigo).toBe('TROCA_SENHA_OBRIGATORIA');

      await http()
        .post('/api/v1/auth/senha')
        .set('Authorization', auth)
        .send({ senhaAtual: SENHA, novaSenha: 'curta' })
        .expect(400);

      const troca = await http()
        .post('/api/v1/auth/senha')
        .set('Authorization', auth)
        .send({ senhaAtual: SENHA, novaSenha: 'NovaSenhaForte2026' })
        .expect(200);
      expect(troca.body.usuario.trocarSenha).toBe(false);

      // Novo token não tem mais a restrição (professor → 403 por papel, não por senha).
      const depois = await http()
        .get('/api/v1/usuarios')
        .set('Authorization', `Bearer ${troca.body.accessToken}`)
        .expect(403);
      expect(depois.body.codigo).toBeUndefined();
    });
  });

  describe('rate limit nas rotas de credencial', () => {
    const logar = (email: string) =>
      http()
        .post('/api/v1/auth/profissional/login')
        .send({ email, senha: 'qualquer' });

    it('limita tentativas repetidas do mesmo identificador', async () => {
      const status: number[] = [];
      for (let i = 0; i < 11; i++)
        status.push((await logar('x@teste.local')).status);
      expect(status.slice(0, 10).every((s) => s === 401)).toBe(true);
      expect(status[10]).toBe(429);
    });

    it('não bloqueia colegas na mesma rede (mesmo IP, identificadores diferentes)', async () => {
      for (let i = 0; i < 10; i++) await logar('x@teste.local');
      await logar('x@teste.local').expect(429);
      // 30 alunos diferentes saindo pelo mesmo IP continuam conseguindo tentar.
      for (let i = 0; i < 30; i++)
        await logar(`aluno${i}@teste.local`).expect(401);
    });
  });
});
