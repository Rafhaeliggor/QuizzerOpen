import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { autenticar, criarApp, limparBanco, SENHA } from './utilitarios.js';

describe('LGPD (RNF05) — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  /** Nota mínima (registro acadêmico) para verificar a anonimização do snapshot. */
  async function criarNota(dados: { usuarioId: string | null; nome: string; email: string }) {
    return prisma.nota.create({
      data: {
        tentativaId: crypto.randomUUID(),
        aplicacaoId: crypto.randomUUID(),
        provaId: crypto.randomUUID(),
        usuarioId: dados.usuarioId,
        provaTitulo: 'Prova',
        participanteNome: dados.nome,
        participanteEmail: dados.email,
        tentativaNumero: 1,
        certificado: dados.usuarioId !== null,
        criterioAprovacao: { tipo: 'NENHUM' },
        inicioEm: new Date(),
        fimEm: new Date(),
        status: 'CONSOLIDADA',
        notaFinal: 7,
      },
    });
  }

  it('titular exporta os dados, solicita exclusão e o administrador anonimiza', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const prof = await autenticar(app, prisma, 'PROFESSOR');
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'bruno@teste.local', matricula: '2026' });
    const nota = await criarNota({ usuarioId: aluno.usuario.id, nome: 'Bruno', email: 'bruno@teste.local' });
    const turma = await prisma.turma.create({
      data: { nome: 'T', periodoInicio: new Date(), periodoFim: new Date(), professorResponsavelId: prof.usuario.id },
    });
    await prisma.matricula.create({ data: { turmaId: turma.id, alunoId: aluno.usuario.id } });

    // Exportação (art. 18, II)
    const exp = await http().get('/api/v1/minha-conta/dados').set('Authorization', aluno.auth).expect(200);
    expect(exp.headers['content-disposition']).toContain('meus-dados-quizzer.json');
    expect(exp.body.cadastro).toMatchObject({ email: 'bruno@teste.local', matricula: '2026' });
    expect(exp.body.resultados).toHaveLength(1);
    expect(exp.body.turmasAtivas[0].nome).toBe('T');
    expect(JSON.stringify(exp.body)).not.toContain('senhaHash');

    // Solicitação
    const { body: sol } = await http()
      .post('/api/v1/minha-conta/solicitacoes')
      .set('Authorization', aluno.auth)
      .send({ justificativa: 'Concluí o curso' })
      .expect(201);
    await http().post('/api/v1/minha-conta/solicitacoes').set('Authorization', aluno.auth).send({}).expect(409);
    const notif = await http().get('/api/v1/notificacoes').set('Authorization', admin.auth).expect(200);
    expect(notif.body.itens[0].tipo).toBe('LGPD_SOLICITACAO');
    // Só administrador administra
    await http().get('/api/v1/lgpd/solicitacoes').set('Authorization', prof.auth).expect(403);

    const lista = await http().get('/api/v1/lgpd/solicitacoes?status=PENDENTE').set('Authorization', admin.auth).expect(200);
    expect(lista.body[0]).toMatchObject({ id: sol.id, titularEmail: 'bruno@teste.local' });

    // Anonimização (art. 18, VI)
    const r = await http().post(`/api/v1/lgpd/solicitacoes/${sol.id}/concluir`).set('Authorization', admin.auth).send({}).expect(200);
    expect(r.body).toMatchObject({ status: 'CONCLUIDA', notas: 1, vinculos: 1 });

    const u = await prisma.usuario.findUniqueOrThrow({ where: { id: aluno.usuario.id } });
    expect(u).toMatchObject({ nome: 'Titular anonimizado', matricula: null, ativo: false });
    expect(u.email).toMatch(/@anonimizado\.invalid$/);
    expect(u.anonimizadoEm).not.toBeNull();
    const n = await prisma.nota.findUniqueOrThrow({ where: { id: nota.id } });
    expect(n).toMatchObject({ participanteNome: 'Titular anonimizado', participanteEmail: '' });
    expect(Number(n.notaFinal)).toBe(7); // registro acadêmico preservado
    expect(await prisma.matricula.count({ where: { alunoId: u.id, dataDesvinculo: null } })).toBe(0);
    expect(await prisma.sessao.count({ where: { usuarioId: u.id } })).toBe(0);

    // O titular não entra mais e o token já emitido deixa de valer
    await http().get('/api/v1/auth/me').set('Authorization', aluno.auth).expect(401);
    await http().post('/api/v1/auth/aluno/login').send({ login: 'bruno@teste.local', senha: SENHA }).expect(401);
    // Conta anonimizada não volta
    await http()
      .post(`/api/v1/usuarios/${u.id}/reativar`)
      .set('Authorization', admin.auth)
      .send({ justificativa: 'x' })
      .expect(400);

    const ev = await prisma.eventoAuditoria.findFirst({ where: { acao: 'LGPD_TITULAR_ANONIMIZADO', recursoId: u.id } });
    expect(JSON.stringify(ev)).not.toContain('bruno@teste.local');
    await http().post(`/api/v1/lgpd/solicitacoes/${sol.id}/concluir`).set('Authorization', admin.auth).send({}).expect(409);
  });

  it('recusa exige resposta ao titular', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const prof = await autenticar(app, prisma, 'PROFESSOR');
    const { body: sol } = await http().post('/api/v1/minha-conta/solicitacoes').set('Authorization', prof.auth).send({}).expect(201);
    await http().post(`/api/v1/lgpd/solicitacoes/${sol.id}/recusar`).set('Authorization', admin.auth).send({}).expect(400);
    await http()
      .post(`/api/v1/lgpd/solicitacoes/${sol.id}/recusar`)
      .set('Authorization', admin.auth)
      .send({ resposta: 'Há processo disciplinar em curso que exige a guarda dos dados.' })
      .expect(200);
    const minhas = await http().get('/api/v1/minha-conta/solicitacoes').set('Authorization', prof.auth).expect(200);
    expect(minhas.body[0]).toMatchObject({ status: 'RECUSADA', resposta: expect.stringContaining('processo') });
  });

  it('administrador não atende a si mesmo nem anonimiza o último administrador', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const { body: sol } = await http().post('/api/v1/minha-conta/solicitacoes').set('Authorization', admin.auth).send({}).expect(201);
    await http().post(`/api/v1/lgpd/solicitacoes/${sol.id}/concluir`).set('Authorization', admin.auth).send({}).expect(400);

    const outro = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin2@teste.local' });
    await prisma.usuario.update({ where: { id: outro.usuario.id }, data: { ativo: true } });
    // Com dois admins ativos, o outro pode atender
    await http().post(`/api/v1/lgpd/solicitacoes/${sol.id}/concluir`).set('Authorization', outro.auth).send({}).expect(200);
    // Agora "outro" é o último ativo
    const { body: sol2 } = await http().post('/api/v1/minha-conta/solicitacoes').set('Authorization', outro.auth).send({}).expect(201);
    const terceiro = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin3@teste.local' });
    await prisma.usuario.update({ where: { id: terceiro.usuario.id }, data: { ativo: false } });
    await http().post(`/api/v1/lgpd/solicitacoes/${sol2.id}/concluir`).set('Authorization', outro.auth).send({}).expect(400);
  });

  it('anonimiza participante externo (sem conta) pelo e-mail', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR');
    const nota = await criarNota({ usuarioId: null, nome: 'Visitante', email: 'visitante@externo.com' });
    const aplicacao = await prisma.aplicacao.create({
      data: {
        provaId: crypto.randomUUID(),
        destinoTipo: 'PUBLICO',
        janelaInicio: new Date(),
        janelaFim: new Date(Date.now() + 3_600_000),
        criadoPorId: admin.usuario.id,
      },
    });
    await prisma.instancia.create({
      data: {
        aplicacaoId: aplicacao.id,
        participanteChave: 'e:visitante@externo.com',
        identificacaoMinima: { nome: 'Visitante', email: 'visitante@externo.com' },
        questoesFixadas: [],
        gabaritoCongelado: {},
      },
    });

    const r = await http()
      .post('/api/v1/lgpd/externos/anonimizar')
      .set('Authorization', admin.auth)
      .send({ email: 'Visitante@Externo.com', justificativa: 'Pedido por e-mail em 11/10/2026' })
      .expect(200);
    expect(r.body).toEqual({ notas: 1, instancias: 1 });
    expect((await prisma.nota.findUniqueOrThrow({ where: { id: nota.id } })).participanteEmail).toBe('');
    const inst = await prisma.instancia.findFirstOrThrow({ where: { aplicacaoId: aplicacao.id } });
    expect(inst.participanteChave).not.toContain('visitante');
    expect(inst.identificacaoMinima).toBeNull();
    const ev = await prisma.eventoAuditoria.findFirst({ where: { acao: 'LGPD_EXTERNO_ANONIMIZADO' }, orderBy: { criadoEm: 'desc' } });
    expect(JSON.stringify(ev)).not.toContain('visitante@externo.com');
    await http()
      .post('/api/v1/lgpd/externos/anonimizar')
      .set('Authorization', admin.auth)
      .send({ email: 'visitante@externo.com', justificativa: 'de novo' })
      .expect(404);
  });
});
