import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SessaoService } from '../src/modules/iam/sessao.service.js';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { criarApp, criarUsuario, limparBanco, SENHA } from './utilitarios.js';

describe('Usuários (RF02) — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  /** Gera sessão direto pelo serviço (o fluxo MFA já é coberto em auth.e2e-spec). */
  async function tokenDe(papel: 'ADMINISTRADOR' | 'PROFESSOR') {
    const usuario = await criarUsuario(prisma, papel);
    const { accessToken } = await app
      .get(SessaoService)
      .criarSessao(usuario, 'PROFISSIONAL', {});
    return `Bearer ${accessToken}`;
  }

  it('administrador cadastra usuário com senha temporária e troca obrigatória', async () => {
    const auth = await tokenDe('ADMINISTRADOR');
    const res = await http()
      .post('/api/v1/usuarios')
      .set('Authorization', auth)
      .send({
        nome: '  Carla Dias ',
        email: 'Carla@Teste.local',
        papel: 'CORRETOR',
      })
      .expect(201);

    expect(res.body.usuario).toMatchObject({
      nome: 'Carla Dias',
      email: 'carla@teste.local',
      papel: 'CORRETOR',
      trocarSenha: true,
    });
    expect(res.body.senhaTemporaria).toHaveLength(16);

    // Novo usuário entra com a senha temporária e recebe a flag de troca.
    const login = await http()
      .post('/api/v1/auth/profissional/login')
      .send({ email: 'carla@teste.local', senha: res.body.senhaTemporaria })
      .expect(200);
    expect(login.body.usuario.trocarSenha).toBe(true);
  });

  it('bloqueia e-mail duplicado', async () => {
    const auth = await tokenDe('ADMINISTRADOR');
    await criarUsuario(prisma, 'ALUNO', { email: 'dup@teste.local' });
    await http()
      .post('/api/v1/usuarios')
      .set('Authorization', auth)
      .send({ nome: 'Outro', email: 'dup@teste.local', papel: 'ALUNO' })
      .expect(409);
  });

  it('professor não pode cadastrar usuários', async () => {
    const auth = await tokenDe('PROFESSOR');
    await http()
      .post('/api/v1/usuarios')
      .set('Authorization', auth)
      .send({ nome: 'X', email: 'x@teste.local', papel: 'ALUNO' })
      .expect(403);
  });

  it('lista usuários com filtro e paginação', async () => {
    const auth = await tokenDe('ADMINISTRADOR');
    await criarUsuario(prisma, 'ALUNO', { email: 'a1@teste.local' });
    await criarUsuario(prisma, 'ALUNO', { email: 'a2@teste.local' });
    const res = await http()
      .get('/api/v1/usuarios?papel=ALUNO&tamanho=1')
      .set('Authorization', auth)
      .expect(200);
    expect(res.body.total).toBe(2);
    expect(res.body.itens).toHaveLength(1);
    expect(res.body.itens[0].senhaHash).toBeUndefined();
  });

  it('valida o payload (campos extras e papel inválido)', async () => {
    const auth = await tokenDe('ADMINISTRADOR');
    await http()
      .post('/api/v1/usuarios')
      .set('Authorization', auth)
      .send({
        nome: 'X',
        email: 'x@teste.local',
        papel: 'SUPERUSUARIO',
        senhaHash: SENHA,
      })
      .expect(400);
  });
});
