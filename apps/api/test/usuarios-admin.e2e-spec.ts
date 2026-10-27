import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { autenticar, cookieRefresh, criarApp, criarUsuario, limparBanco, SENHA } from './utilitarios.js';

describe('Administração de usuários (RF02) — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  async function loginProfessor() {
    const res = await http()
      .post('/api/v1/auth/profissional/login')
      .send({ email: 'professor@teste.local', senha: SENHA })
      .expect(200);
    return cookieRefresh(res.headers['set-cookie'])!;
  }

  it('edita dados e papel; mudar o papel encerra as sessões', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const prof = await criarUsuario(prisma, 'PROFESSOR');
    const cookie = await loginProfessor();

    const r = await http()
      .patch(`/api/v1/usuarios/${prof.id}`)
      .set('Authorization', admin.auth)
      .send({ nome: 'Profa. Ana', papel: 'COORDENADOR' })
      .expect(200);
    expect(r.body).toMatchObject({ nome: 'Profa. Ana', papel: 'COORDENADOR', sessoesAtivas: 0 });
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);

    // Admin não altera o próprio papel
    await http()
      .patch(`/api/v1/usuarios/${admin.usuario.id}`)
      .set('Authorization', admin.auth)
      .send({ papel: 'PROFESSOR' })
      .expect(400);
  });

  it('desativa (bloqueia login e sessões) e reativa, com justificativa auditada', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const prof = await criarUsuario(prisma, 'PROFESSOR');
    const cookie = await loginProfessor();
    const { body: login2 } = await http()
      .post('/api/v1/auth/profissional/login')
      .send({ email: 'professor@teste.local', senha: SENHA })
      .expect(200);
    const accessProf = `Bearer ${login2.accessToken}`;
    await http().get('/api/v1/auth/me').set('Authorization', accessProf).expect(200);

    await http().post(`/api/v1/usuarios/${prof.id}/desativar`).set('Authorization', admin.auth).send({}).expect(400);
    await http()
      .post(`/api/v1/usuarios/${prof.id}/desativar`)
      .set('Authorization', admin.auth)
      .send({ justificativa: 'Desligado da instituição' })
      .expect(200);
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
    await http()
      .post('/api/v1/auth/profissional/login')
      .send({ email: 'professor@teste.local', senha: SENHA })
      .expect(401);
    // O access token já emitido também deixa de valer na hora (ADR-0027)
    await http().get('/api/v1/auth/me').set('Authorization', accessProf).expect(401);

    await http()
      .post(`/api/v1/usuarios/${prof.id}/reativar`)
      .set('Authorization', admin.auth)
      .send({ justificativa: 'Retorno' })
      .expect(200);
    await loginProfessor();

    const evento = await prisma.eventoAuditoria.findFirst({ where: { acao: 'USUARIO_DESATIVADO', recursoId: prof.id } });
    expect(evento?.justificativa).toBe('Desligado da instituição');
    // Admin não desativa a si mesmo
    await http()
      .post(`/api/v1/usuarios/${admin.usuario.id}/desativar`)
      .set('Authorization', admin.auth)
      .send({ justificativa: 'x' })
      .expect(400);
  });

  it('redefine senha (temporária + troca obrigatória) e desbloqueia conta', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const coord = await autenticar(app, prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    const prof = await criarUsuario(prisma, 'PROFESSOR');
    await prisma.usuario.update({ where: { id: prof.id }, data: { bloqueadoAte: new Date(Date.now() + 3_600_000) } });

    const lista = await http().get('/api/v1/usuarios?papel=PROFESSOR').set('Authorization', coord.auth).expect(200);
    expect(lista.body.itens[0]).toMatchObject({ ativo: true, bloqueado: true });

    // Coordenação desbloqueia; não redefine senha
    await http().post(`/api/v1/usuarios/${prof.id}/desbloquear`).set('Authorization', coord.auth).expect(200);
    await http().post(`/api/v1/usuarios/${prof.id}/redefinir-senha`).set('Authorization', coord.auth).expect(403);

    const { body } = await http().post(`/api/v1/usuarios/${prof.id}/redefinir-senha`).set('Authorization', admin.auth).expect(200);
    expect(body.senhaTemporaria).toHaveLength(16);
    const login = await http()
      .post('/api/v1/auth/profissional/login')
      .send({ email: 'professor@teste.local', senha: body.senhaTemporaria })
      .expect(200);
    expect(login.body.usuario.trocarSenha).toBe(true);
    await http().post('/api/v1/auth/profissional/login').send({ email: 'professor@teste.local', senha: SENHA }).expect(401);
  });

  it('reseta o MFA: o próximo login pede novo cadastro', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const coord = await criarUsuario(prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    await prisma.usuario.update({ where: { id: coord.id }, data: { mfaHabilitado: true, mfaSegredoCifrado: 'v1.x.y.z' } });

    await http()
      .post(`/api/v1/usuarios/${coord.id}/resetar-mfa`)
      .set('Authorization', admin.auth)
      .send({ justificativa: 'Perdeu o celular' })
      .expect(200);
    const login = await http()
      .post('/api/v1/auth/profissional/login')
      .send({ email: 'coord@teste.local', senha: SENHA })
      .expect(200);
    expect(login.body.status).toBe('MFA_CADASTRO_REQUERIDO');
    // O próprio MFA não pode ser resetado por si
    await http()
      .post(`/api/v1/usuarios/${admin.usuario.id}/resetar-mfa`)
      .set('Authorization', admin.auth)
      .send({ justificativa: 'x' })
      .expect(400);
  });
});
