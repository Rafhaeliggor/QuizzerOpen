import type { INestApplication } from '@nestjs/common';
import { generate } from 'otplib';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { cenarios } from './cenarios.js';
import { autenticar, criarApp, limparBanco, SENHA } from './utilitarios.js';

/** Lote 6 — RF01/RF02/RF03/RF11/RNF05: delegação, MFA opcional, sessões, co-professores e auditoria. */
describe('Acesso e conta — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const c = cenarios(() => app);
  const http = () => c.http();

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  it('delegação de permissão (RF02): concede, vale nas rotas delegáveis e some ao mudar o papel', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin@teste.local' });
    const coord = await autenticar(app, prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });

    await http().get('/api/v1/auditoria').set('Authorization', prof.auth).expect(403);
    await http().get('/api/v1/usuarios').set('Authorization', prof.auth).expect(403);

    const cat = await http().get('/api/v1/permissoes/catalogo').set('Authorization', coord.auth).expect(200);
    expect(cat.body.map((p: { codigo: string }) => p.codigo)).toEqual(['REABRIR_TENTATIVAS', 'DESBLOQUEAR_CONTAS', 'CONSULTAR_AUDITORIA']);
    // Professor não delega; não se delega a aluno nem a si mesmo; permissão desconhecida é recusada
    await http().put(`/api/v1/permissoes/usuarios/${prof.usuario.id}/CONSULTAR_AUDITORIA`).set('Authorization', prof.auth)
      .send({ justificativa: 'x' }).expect(403);
    await http().put(`/api/v1/permissoes/usuarios/${aluno.usuario.id}/CONSULTAR_AUDITORIA`).set('Authorization', coord.auth)
      .send({ justificativa: 'x' }).expect(400);
    await http().put(`/api/v1/permissoes/usuarios/${prof.usuario.id}/VIRAR_ADMIN`).set('Authorization', coord.auth)
      .send({ justificativa: 'x' }).expect(400);
    await http().put(`/api/v1/permissoes/usuarios/${prof.usuario.id}/CONSULTAR_AUDITORIA`).set('Authorization', coord.auth)
      .send({}).expect(400);

    const conc = await http().put(`/api/v1/permissoes/usuarios/${prof.usuario.id}/CONSULTAR_AUDITORIA`).set('Authorization', coord.auth)
      .send({ justificativa: 'Apoio à secretaria' }).expect(200);
    expect(conc.body[0]).toMatchObject({ permissao: 'CONSULTAR_AUDITORIA', concedidoPor: 'Usuário COORDENADOR' });
    await http().get('/api/v1/auditoria').set('Authorization', prof.auth).expect(200);
    await http().get('/api/v1/usuarios').set('Authorization', prof.auth).expect(403); // só o que foi delegado
    const me = await http().get('/api/v1/auth/me').set('Authorization', prof.auth).expect(200);
    expect(me.body.permissoes).toEqual(['CONSULTAR_AUDITORIA']);

    // Mudança de papel remove as delegações
    await http().patch(`/api/v1/usuarios/${prof.usuario.id}`).set('Authorization', admin.auth).send({ papel: 'CORRETOR' }).expect(200);
    expect(await prisma.permissaoDelegada.count()).toBe(0);
    const eventos = await prisma.eventoAuditoria.findMany({ where: { acao: 'PERMISSAO_CONCEDIDA', recursoId: prof.usuario.id } });
    expect(eventos[0]?.justificativa).toBe('Apoio à secretaria');
  });

  it('DESBLOQUEAR_CONTAS delegada libera consultar usuários e desbloquear', async () => {
    const coord = await autenticar(app, prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const alvo = await autenticar(app, prisma, 'ALUNO', { email: 'bloqueado@teste.local' });
    await prisma.usuario.update({ where: { id: alvo.usuario.id }, data: { bloqueadoAte: new Date(Date.now() + 600_000) } });
    await http().post(`/api/v1/usuarios/${alvo.usuario.id}/desbloquear`).set('Authorization', prof.auth).expect(403);
    await http().put(`/api/v1/permissoes/usuarios/${prof.usuario.id}/DESBLOQUEAR_CONTAS`).set('Authorization', coord.auth)
      .send({ justificativa: 'Plantão' }).expect(200);
    await http().get('/api/v1/usuarios').set('Authorization', prof.auth).expect(200);
    await http().post(`/api/v1/usuarios/${alvo.usuario.id}/desbloquear`).set('Authorization', prof.auth).expect(200);
    await http().post(`/api/v1/usuarios/${alvo.usuario.id}/desativar`).set('Authorization', prof.auth)
      .send({ justificativa: 'x' }).expect(403);
    await http().post(`/api/v1/permissoes/usuarios/${prof.usuario.id}/DESBLOQUEAR_CONTAS/revogar`).set('Authorization', coord.auth)
      .send({ justificativa: 'Fim do plantão' }).expect(200);
    await http().get('/api/v1/usuarios').set('Authorization', prof.auth).expect(403);
  });

  it('MFA opcional (RNF05): aluno ativa, prova com exigeMfa só inicia com MFA, desativa com senha + código', async () => {
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const revisor = await autenticar(app, prisma, 'PROFESSOR', { email: 'revisor@teste.local' });
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin@teste.local' });

    const q = await c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'Ética', dificuldade: 'MEDIO', formato: 'VERDADEIRO_FALSO', enunciado: 'Plágio é permitido.', alternativaCorreta: 1,
    });
    // Prova pública não pode exigir MFA
    await http().post('/api/v1/provas').set('Authorization', prof.auth).send({
      titulo: 'P', visibilidade: 'PUBLICA', criterioAprovacao: { tipo: 'NENHUM' }, tentativasPermitidas: 1,
      modoNavegacao: 'LIVRE', ordemQuestoes: 'FIXA', exigeMfa: true,
    }).expect(400);
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }], { exigeMfa: true });
    const turmaId = await c.turmaCom(prof.auth, ['aluno@teste.local']);
    const aplicacaoId = await c.aplicar(prof.auth, provaId, turmaId);

    const negado = await http().post(`/api/v1/aluno/aplicacoes/${aplicacaoId}/iniciar`).set('Authorization', aluno.auth).expect(409);
    expect(negado.body.codigo).toBe('MFA_NECESSARIO');

    expect((await http().get('/api/v1/minha-conta/mfa').set('Authorization', aluno.auth).expect(200)).body)
      .toEqual({ habilitado: false, obrigatorio: false, codigosRecuperacaoRestantes: 0 });
    const { body: cadastro } = await http().post('/api/v1/minha-conta/mfa/iniciar').set('Authorization', aluno.auth).expect(200);
    await http().post('/api/v1/minha-conta/mfa/confirmar').set('Authorization', aluno.auth).send({ codigo: '000000' }).expect(400);
    await http().post('/api/v1/minha-conta/mfa/confirmar').set('Authorization', aluno.auth)
      .send({ codigo: await generate({ secret: cadastro.segredo }) }).expect(200);

    await http().post(`/api/v1/aluno/aplicacoes/${aplicacaoId}/iniciar`).set('Authorization', aluno.auth).expect(200);

    // Login agora pede o segundo fator
    const login = await http().post('/api/v1/auth/aluno/login').send({ login: 'aluno@teste.local', senha: SENHA }).expect(200);
    expect(login.body.status).toBe('MFA_REQUERIDO');

    // Desativar: senha errada recusa; administrador (MFA obrigatório) não pode desativar
    await prisma.usuario.update({ where: { id: aluno.usuario.id }, data: { mfaUltimoPasso: null } });
    const codigo = await generate({ secret: cadastro.segredo });
    await http().post('/api/v1/minha-conta/mfa/desativar').set('Authorization', aluno.auth).send({ senha: 'errada', codigo }).expect(401);
    await http().post('/api/v1/minha-conta/mfa/desativar').set('Authorization', aluno.auth).send({ senha: SENHA, codigo }).expect(200);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: aluno.usuario.id } })).mfaHabilitado).toBe(false);
    await http().post('/api/v1/minha-conta/mfa/desativar').set('Authorization', admin.auth).send({ senha: SENHA, codigo: '123456' }).expect(409);
  });

  it('sessões abertas: lista, encerra outra e encerra as demais', async () => {
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const login = async () => {
      const r = await http().post('/api/v1/auth/profissional/login').set('User-Agent', 'Teste/1.0 (Linux) Firefox/150')
        .send({ email: 'prof@teste.local', senha: SENHA }).expect(200);
      return `Bearer ${r.body.accessToken}`;
    };
    const outra = await login();
    const terceira = await login();
    const lista = await http().get('/api/v1/minha-conta/sessoes').set('Authorization', prof.auth).expect(200);
    expect(lista.body).toHaveLength(3);
    expect(lista.body.filter((s: { atual: boolean }) => s.atual)).toHaveLength(1);

    const alvo = lista.body.find((s: { atual: boolean; userAgent: string | null }) => !s.atual && s.userAgent);
    const r = await http().delete(`/api/v1/minha-conta/sessoes/${alvo.id}`).set('Authorization', prof.auth).expect(200);
    expect(r.body.atual).toBe(false);
    // Sessão de outra pessoa não é encontrada
    const intruso = await autenticar(app, prisma, 'PROFESSOR', { email: 'intruso@teste.local' });
    await http().delete(`/api/v1/minha-conta/sessoes/${alvo.id}`).set('Authorization', intruso.auth).expect(404);

    await http().post('/api/v1/minha-conta/sessoes/encerrar-outras').set('Authorization', prof.auth).expect(200);
    for (const token of [outra, terceira]) await http().get('/api/v1/auth/me').set('Authorization', token).expect(401);
    await http().get('/api/v1/auth/me').set('Authorization', prof.auth).expect(200);
  });

  it('co-professores (RF03): veem a turma e aplicam provas; só o responsável altera a equipe', async () => {
    const resp = await autenticar(app, prisma, 'PROFESSOR', { email: 'resp@teste.local' });
    const co = await autenticar(app, prisma, 'PROFESSOR', { email: 'co@teste.local' });
    const outro = await autenticar(app, prisma, 'PROFESSOR', { email: 'outro@teste.local' });
    const corretor = await autenticar(app, prisma, 'CORRETOR', { email: 'corretor@teste.local' });
    const turmaId = await c.turmaCom(resp.auth, []);

    await http().get(`/api/v1/turmas/${turmaId}`).set('Authorization', co.auth).expect(404);
    const prof = await http().get('/api/v1/usuarios/professores').set('Authorization', co.auth).expect(200);
    expect(prof.body.map((p: { email: string }) => p.email)).toEqual(expect.arrayContaining(['co@teste.local', 'resp@teste.local']));
    expect(prof.body.map((p: { email: string }) => p.email)).not.toContain('corretor@teste.local');

    await http().put(`/api/v1/turmas/${turmaId}/professores`).set('Authorization', resp.auth)
      .send({ professorIds: [corretor.usuario.id] }).expect(400);
    const det = await http().put(`/api/v1/turmas/${turmaId}/professores`).set('Authorization', resp.auth)
      .send({ professorIds: [co.usuario.id] }).expect(200);
    expect(det.body.coProfessores.map((p: { id: string }) => p.id)).toEqual([co.usuario.id]);

    const vista = await http().get(`/api/v1/turmas/${turmaId}`).set('Authorization', co.auth).expect(200);
    expect(vista.body.podeGerirProfessores).toBe(false);
    await http().post(`/api/v1/turmas/${turmaId}/alunos`).set('Authorization', co.auth)
      .send({ nome: 'Nova', email: 'nova@teste.local' }).expect(201);
    await http().put(`/api/v1/turmas/${turmaId}/professores`).set('Authorization', co.auth)
      .send({ professorIds: [co.usuario.id, outro.usuario.id] }).expect(403);
    await http().put(`/api/v1/turmas/${turmaId}`).set('Authorization', co.auth)
      .send({ nome: 'Renomeada', periodoInicio: '2026-01-01', periodoFim: '2026-12-31' }).expect(403);
    await http().get(`/api/v1/turmas/${turmaId}`).set('Authorization', outro.auth).expect(404);
    const listaCo = await http().get('/api/v1/turmas').set('Authorization', co.auth).expect(200);
    expect(listaCo.body[0]).toMatchObject({ id: turmaId, souResponsavel: false });
  });

  it('auditoria: nome do usuário, filtro por período e exportação CSV', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin@teste.local' });
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    await c.turmaCom(prof.auth, [], 'Turma auditada');

    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date());
    const r = await http().get(`/api/v1/auditoria?acao=TURMA_CRIADA&de=${hoje}&ate=${hoje}`).set('Authorization', admin.auth).expect(200);
    expect(r.body.itens[0]).toMatchObject({ acao: 'TURMA_CRIADA', usuarioNome: 'Usuário PROFESSOR' });
    const vazio = await http().get('/api/v1/auditoria?acao=TURMA_CRIADA&ate=2000-01-01').set('Authorization', admin.auth).expect(200);
    expect(vazio.body.total).toBe(0);
    await http().get('/api/v1/auditoria?de=ontem').set('Authorization', admin.auth).expect(400);

    const csv = await http().get('/api/v1/auditoria/csv?acao=TURMA_CRIADA').set('Authorization', admin.auth).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.headers['content-disposition']).toContain('auditoria.csv');
    expect(csv.text).toContain('data_hora;usuario;usuario_id;acao');
    expect(csv.text).toContain('Usuário PROFESSOR');
  });
});
