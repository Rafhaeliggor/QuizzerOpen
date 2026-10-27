import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { EmailService } from '../src/infra/email/email.service.js';
import { LgpdService } from '../src/modules/lgpd/lgpd.service.js';
import { NotificacoesService } from '../src/modules/notificacoes/notificacoes.service.js';
import { cenarios } from './cenarios.js';
import { autenticar, criarApp, limparBanco } from './utilitarios.js';

/** Lote 8 — API de integração, notificações em tempo real, fila de e-mail e LGPD (correção, retenção). */
describe('Integração e operação (lote 8) — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const c = cenarios(() => app);
  const http = () => c.http();

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  it('chaves de integração: só o admin cria; token mostrado uma vez; escopo e revogação valem', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin@teste.local' });
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    await http().post('/api/v1/integracao/chaves').set('Authorization', prof.auth).send({ nome: 'x', escopos: ['notas:ler'] }).expect(403);
    await http().post('/api/v1/integracao/chaves').set('Authorization', admin.auth).send({ nome: 'x', escopos: ['tudo'] }).expect(400);
    const { body: chave } = await http().post('/api/v1/integracao/chaves').set('Authorization', admin.auth)
      .send({ nome: 'Moodle', escopos: ['turmas:ler'] }).expect(201);
    expect(chave.token).toMatch(/^qz_[0-9a-f]{12}_[A-Za-z0-9_-]{43}$/);
    const lista = await http().get('/api/v1/integracao/chaves').set('Authorization', admin.auth).expect(200);
    expect(JSON.stringify(lista.body)).not.toContain(chave.token.split('_')[2]);
    expect(await prisma.chaveIntegracao.count({ where: { segredoHash: chave.token.split('_')[2] } })).toBe(0);

    const api = (rota: string, token = chave.token) => http().get(`/api/v1/integracao/v1/${rota}`).set('Authorization', `Bearer ${token}`);
    await api('turmas').expect(200);
    const semEscopo = await api('notas').expect(403);
    expect(semEscopo.body.codigo).toBe('ESCOPO_INSUFICIENTE');
    await api('turmas', `${chave.token.slice(0, -1)}x`).expect(401);
    await http().get('/api/v1/integracao/v1/turmas').set('Authorization', admin.auth).expect(401); // JWT de usuário não serve
    await http().post(`/api/v1/integracao/chaves/${chave.id}/revogar`).set('Authorization', admin.auth).expect(200);
    await api('turmas').expect(401);
  });

  it('integração: sincroniza turma pelo código externo e exporta notas com cursor', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin@teste.local' });
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const revisor = await autenticar(app, prisma, 'PROFESSOR', { email: 'revisor@teste.local' });
    const { body: chave } = await http().post('/api/v1/integracao/chaves').set('Authorization', admin.auth)
      .send({ nome: 'ERP', escopos: ['turmas:escrever', 'turmas:ler', 'notas:ler'] }).expect(201);
    const bearer = `Bearer ${chave.token}`;
    const turma = {
      nome: 'Cálculo I — 2026.2', periodoInicio: '2026-08-01', periodoFim: '2026-12-20', professorEmail: 'prof@teste.local',
      alunos: [{ nome: 'Ana', email: 'ana@teste.local', matricula: 'M1' }, { nome: 'Beto', email: 'beto@teste.local', matricula: 'M2' }],
    };
    const r1 = await http().put('/api/v1/integracao/v1/turmas/CALC1-2026.2').set('Authorization', bearer).send(turma).expect(200);
    expect(r1.body).toMatchObject({ criada: true, matriculados: 2, contasCriadas: ['ana@teste.local', 'beto@teste.local'] });
    const r2 = await http().put('/api/v1/integracao/v1/turmas/CALC1-2026.2').set('Authorization', bearer)
      .send({ ...turma, alunos: [turma.alunos[0]], removerAusentes: true }).expect(200);
    expect(r2.body).toMatchObject({ criada: false, jaMatriculados: 1, desvinculados: 1 });

    // Uma linha inválida não pode ser interpretada como aluno ausente e removida.
    await http().put('/api/v1/integracao/v1/turmas/CALC1-2026.2').set('Authorization', bearer)
      .send(turma).expect(200);
    const parcial = await http().put('/api/v1/integracao/v1/turmas/CALC1-2026.2').set('Authorization', bearer)
      .send({ ...turma, alunos: [turma.alunos[0], { ...turma.alunos[1], matricula: 'MATRICULA-INCORRETA' }], removerAusentes: true }).expect(200);
    expect(parcial.body).toMatchObject({ desvinculados: 0, remocaoAusentesIgnorada: true });
    const beto = await prisma.usuario.findUniqueOrThrow({ where: { email: 'beto@teste.local' } });
    expect(await prisma.matricula.count({ where: { turmaId: r1.body.turmaId, alunoId: beto.id, dataDesvinculo: null } })).toBe(1);

    await http().put('/api/v1/integracao/v1/turmas/codigo com espaço').set('Authorization', bearer).send(turma).expect(400);
    await http().put('/api/v1/integracao/v1/turmas/X').set('Authorization', bearer).send({ ...turma, professorEmail: 'naoexiste@teste.local' }).expect(400);

    // Prova para Ana: resultado consolidado aparece na exportação
    // Conta criada pela integração: troca de senha pendente; aqui simulamos que a Ana já definiu a senha.
    const ana = await prisma.usuario.update({ where: { email: 'ana@teste.local' }, data: { trocarSenha: false } });
    const { SessaoService } = await import('../src/modules/iam/sessao.service.js');
    const tokenAna = `Bearer ${(await app.get(SessaoService).criarSessao(ana, 'ALUNO', {})).accessToken}`;
    const q = await c.questaoPublicada(prof.auth, revisor.auth, { disciplina: 'Cálculo', dificuldade: 'FACIL', formato: 'VERDADEIRO_FALSO', enunciado: 'Derivada de x² é 2x.', alternativaCorreta: 0 });
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }]);
    const t = await c.executar(tokenAna, await c.aplicar(prof.auth, provaId, r1.body.turmaId));
    await t.responder(q.versaoId, { alternativaId: 'V' }).expect(200);
    await t.enviar();

    const notas = await http().get('/api/v1/integracao/v1/notas?limite=1&turma=CALC1-2026.2').set('Authorization', bearer).expect(200);
    expect(notas.body.itens[0]).toMatchObject({ turmaCodigoExterno: 'CALC1-2026.2', aluno: { email: 'ana@teste.local', matricula: 'M1' }, nota: 10, situacao: 'APROVADO' });
    expect(notas.body.proximoCursor).toBeNull();
    const futuro = await http().get(`/api/v1/integracao/v1/notas?desde=${new Date(Date.now() + 60_000).toISOString()}`).set('Authorization', bearer).expect(200);
    expect(futuro.body.itens).toHaveLength(0);
    await http().get('/api/v1/integracao/v1/notas?cursor=lixo').set('Authorization', bearer).expect(400);
    expect(await prisma.eventoAuditoria.count({ where: { acao: 'INTEGRACAO_TURMA_SINCRONIZADA', recursoId: r1.body.turmaId } })).toBe(4);
  });

  it('notificações em tempo real (SSE): o sinal chega ao dono, não a outros', async () => {
    await app.listen(0);
    const porta = (app.getHttpServer().address() as AddressInfo).port;
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    const outro = await autenticar(app, prisma, 'ALUNO', { email: 'outro@teste.local' });
    const ler = async (auth: string, ms: number) => {
      const ctrl = new AbortController();
      const res = await fetch(`http://127.0.0.1:${porta}/api/v1/notificacoes/fluxo`, { headers: { Authorization: auth }, signal: ctrl.signal });
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      let texto = '';
      const leitor = res.body!.getReader();
      const fim = Date.now() + ms;
      setTimeout(() => ctrl.abort(), ms);
      try {
        while (Date.now() < fim) {
          const { value, done } = await leitor.read();
          if (done) break;
          texto += new TextDecoder().decode(value);
        }
      } catch {
        /* abortado */
      }
      return texto;
    };
    const doAluno = ler(aluno.auth, 1500);
    const doOutro = ler(outro.auth, 1500);
    await new Promise((r) => setTimeout(r, 400));
    await app.get(NotificacoesService).notificar([aluno.usuario.id], { tipo: 'PROVA_DISPONIVEL', titulo: 'Nova prova', mensagem: 'x' });
    const [a, o] = await Promise.all([doAluno, doOutro]);
    expect(a).toContain('event: pronto');
    expect(a).toContain('event: notificacao');
    expect(a).toContain('Nova prova');
    expect(o).not.toContain('event: notificacao');
    const semToken = await fetch(`http://127.0.0.1:${porta}/api/v1/notificacoes/fluxo`);
    expect(semToken.status).toBe(401);
  });

  it('fila de e-mail: falha volta para a fila com espera crescente e reenvia depois', async () => {
    const email = app.get(EmailService);
    email.caixaDeSaida.length = 0;
    email.falharProximos = 1;
    await email.enfileirar({ para: 'x@teste.local', assunto: 'Aviso', texto: 'corpo' });
    const pendente = await prisma.emailPendente.findFirstOrThrow();
    expect(pendente).toMatchObject({ tentativas: 1, ultimoErro: 'falha simulada' });
    expect(pendente.proximaTentativaEm.getTime()).toBeGreaterThan(Date.now());
    expect(await email.processarFila()).toEqual({ enviados: 0, falhas: 0 }); // ainda não venceu
    // Duas rodadas ao mesmo tempo (worker atrasado + nova rodada): o e-mail sai uma vez só.
    const depois = new Date(Date.now() + 120_000);
    const [r1, r2] = await Promise.all([email.processarFila(depois), email.processarFila(depois)]);
    expect(r1.enviados + r2.enviados).toBe(1);
    expect(await prisma.emailPendente.count()).toBe(0);
    expect(email.caixaDeSaida.map((m) => m.assunto)).toEqual(['Aviso']);
  });

  it('LGPD: titular pede correção do nome (aplicada também nos resultados) e retenção de externos', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin@teste.local' });
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    await http().post('/api/v1/minha-conta/solicitacoes').set('Authorization', aluno.auth).send({ tipo: 'CORRECAO', correcao: {} }).expect(400);
    const { body: s } = await http().post('/api/v1/minha-conta/solicitacoes').set('Authorization', aluno.auth)
      .send({ tipo: 'CORRECAO', correcao: { nome: 'Nome Correto da Silva' }, justificativa: 'Erro de digitação' }).expect(201);
    expect(s).toMatchObject({ tipo: 'CORRECAO', status: 'PENDENTE' });
    const ev = await prisma.eventoAuditoria.findFirstOrThrow({ where: { acao: 'LGPD_CORRECAO_SOLICITADA', recursoId: s.id } });
    expect(JSON.stringify(ev)).not.toContain('Nome Correto'); // auditoria sem dado pessoal
    await prisma.nota.create({
      data: {
        tentativaId: '0190a000-0000-7000-8000-000000000001', aplicacaoId: '0190a000-0000-7000-8000-000000000002', provaId: '0190a000-0000-7000-8000-000000000003',
        usuarioId: aluno.usuario.id, provaTitulo: 'P', participanteNome: 'Nome Errado', participanteEmail: 'aluno@teste.local', tentativaNumero: 1,
        criterioAprovacao: { tipo: 'NENHUM' }, inicioEm: new Date(), fimEm: new Date(),
      },
    });
    await http().post(`/api/v1/lgpd/solicitacoes/${s.id}/concluir`).set('Authorization', admin.auth).send({}).expect(200);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: aluno.usuario.id } })).nome).toBe('Nome Correto da Silva');
    expect((await prisma.nota.findFirstOrThrow({ where: { usuarioId: aluno.usuario.id } })).participanteNome).toBe('Nome Correto da Silva');

    // Retenção: desligada por padrão; ligada, anonimiza externos antigos e preserva recentes
    const lgpd = app.get(LgpdService);
    expect(await lgpd.aplicarRetencao()).toMatchObject({ ligada: false });
    const base = { aplicacaoId: '0190a000-0000-7000-8000-000000000002', provaId: '0190a000-0000-7000-8000-000000000003', provaTitulo: 'P', tentativaNumero: 1, criterioAprovacao: { tipo: 'NENHUM' } };
    await prisma.nota.create({ data: { ...base, tentativaId: '0190a000-0000-7000-8000-000000000011', participanteNome: 'Externo Antigo', participanteEmail: 'velho@x.com', inicioEm: new Date('2025-01-01'), fimEm: new Date('2025-01-01') } });
    await prisma.nota.create({ data: { ...base, tentativaId: '0190a000-0000-7000-8000-000000000012', participanteNome: 'Externo Novo', participanteEmail: 'novo@x.com', inicioEm: new Date(), fimEm: new Date() } });
    const r = await lgpd.aplicarRetencao(new Date(), 180);
    expect(r).toMatchObject({ ligada: true, dias: 180, notas: 1 });
    const nomes = (await prisma.nota.findMany({ where: { usuarioId: null } })).map((n) => n.participanteNome).sort();
    expect(nomes).toEqual(['Externo Novo', 'Titular anonimizado']);
  });

  it('métricas HTTP (ADR-0054): contam 5xx/latência e ignoram o health check', async () => {
    const antes = (await http().get('/api/v1/health/metricas?janela=1').expect(200)).body;
    await http().get('/api/v1/health').expect(200);
    await http().get('/api/v1/provas').expect(401);
    const depois = (await http().get('/api/v1/health/metricas?janela=1').expect(200)).body;
    expect(depois.desdeInicio.requisicoes - antes.desdeInicio.requisicoes).toBe(1);
    expect(depois).toMatchObject({ janelaMin: 1, erros5xx: expect.any(Number) });
    expect(typeof depois.taxa5xxPct).toBe('number');
    expect(depois.latenciaP95Ms).toBeGreaterThan(0);
  });

  it('retenção de notificações: só as lidas com mais de 180 dias são apagadas', async () => {
    const { usuario } = await autenticar(app, prisma, 'PROFESSOR', { email: 'retencao@teste.local' });
    const velha = new Date(Date.now() - 200 * 86_400_000);
    const base = { usuarioId: usuario.id, tipo: 'PROVA_DISPONIVEL', titulo: 't', mensagem: 'm' };
    await prisma.notificacao.createMany({
      data: [
        { ...base, lida: true, criadoEm: velha },
        { ...base, lida: false, criadoEm: velha },
        { ...base, lida: true },
      ],
    });
    expect(await app.get(NotificacoesService).limparAntigas()).toBe(1);
    const restantes = await prisma.notificacao.findMany({ where: { usuarioId: usuario.id } });
    expect(restantes.map((n) => n.lida).sort((a, b) => Number(a) - Number(b))).toEqual([false, true]);
  });
});
