import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { cenarios } from './cenarios.js';
import { autenticar, criarApp, limparBanco } from './utilitarios.js';

/** Lote 6 — RF05/RF06/RF07/RF08/RF09: duplicar prova, eventos, gabarito, prazo de recurso e relatórios. */
describe('Políticas da prova e relatórios — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const c = cenarios(() => app);
  const http = () => c.http();

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  async function preparar(extras: Record<string, unknown>) {
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const revisor = await autenticar(app, prisma, 'PROFESSOR', { email: 'revisor@teste.local' });
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    const bio = await c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'Biologia', dificuldade: 'FACIL', formato: 'MULTIPLA_ESCOLHA', enunciado: 'Organela da respiração?',
      alternativas: [{ texto: 'Ribossomo' }, { texto: 'Mitocôndria' }], alternativaCorreta: 1,
    });
    const qui = await c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'Química', dificuldade: 'FACIL', formato: 'RESPOSTA_CURTA', enunciado: 'Símbolo do sódio?', respostasAceitas: ['Na'],
    });
    const provaId = await c.provaPublicada(prof.auth, [
      { versaoQuestaoId: bio.versaoId, peso: 50 },
      { versaoQuestaoId: qui.versaoId, peso: 50 },
    ], extras);
    const turmaId = await c.turmaCom(prof.auth, ['aluno@teste.local']);
    return { prof, revisor, aluno, bio, qui, provaId, turmaId };
  }

  it('gabarito APOS_CORRECAO aparece no resultado; prazo de recurso é aplicado', async () => {
    const { prof, aluno, bio, qui, provaId, turmaId } = await preparar({ exibirGabarito: 'APOS_CORRECAO', prazoRecursoDias: 2 });
    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, turmaId));
    await t.responder(bio.versaoId, { alternativaId: 'A' }).expect(200);
    await t.responder(qui.versaoId, { texto: 'na' }).expect(200);
    const env = await t.enviar();
    const notaId = env.body.resultado.notaId as string;

    const r = await http().get(`/api/v1/aluno/resultados/${notaId}`).set('Authorization', aluno.auth).expect(200);
    expect(r.body).toMatchObject({ notaFinal: '5', gabaritoVisivel: true, recursoEncerrado: false });
    expect(r.body.questoes.map((q: { gabarito: unknown }) => q.gabarito)).toEqual([{ alternativaId: 'B' }, { respostasAceitas: ['Na'] }]);
    expect(new Date(r.body.prazoRecursoAte).getTime()).toBeGreaterThan(Date.now() + 86_400_000);

    // Fim do prazo: recurso recusado
    await prisma.nota.update({ where: { id: notaId }, data: { consolidadaEm: new Date(Date.now() - 3 * 86_400_000) } });
    const tarde = await http().post('/api/v1/aluno/recursos').set('Authorization', aluno.auth)
      .send({ notaId, versaoQuestaoId: bio.versaoId, justificativa: 'Discordo' }).expect(409);
    expect(tarde.body.codigo).toBe('PRAZO_RECURSO_ENCERRADO');
    expect((await http().get(`/api/v1/aluno/resultados/${notaId}`).set('Authorization', aluno.auth)).body.recursoEncerrado).toBe(true);
  });

  it('gabarito NUNCA (padrão) não aparece; APOS_ENCERRAMENTO só depois da janela', async () => {
    const { prof, aluno, bio, provaId, turmaId } = await preparar({ exibirGabarito: 'APOS_ENCERRAMENTO' });
    const aplicacaoId = await c.aplicar(prof.auth, provaId, turmaId);
    const t = await c.executar(aluno.auth, aplicacaoId);
    await t.responder(bio.versaoId, { alternativaId: 'B' }).expect(200);
    const notaId = (await t.enviar()).body.resultado.notaId as string;

    const antes = await http().get(`/api/v1/aluno/resultados/${notaId}`).set('Authorization', aluno.auth).expect(200);
    expect(antes.body.gabaritoVisivel).toBe(false);
    expect(antes.body.gabaritoDisponivelEm).toBeTruthy();
    expect(antes.body.questoes.every((q: { gabarito: unknown; rubrica: unknown }) => q.gabarito === null && q.rubrica === null)).toBe(true);

    await prisma.nota.update({ where: { id: notaId }, data: { janelaFim: new Date(Date.now() - 1000) } });
    const depois = await http().get(`/api/v1/aluno/resultados/${notaId}`).set('Authorization', aluno.auth).expect(200);
    expect(depois.body.gabaritoVisivel).toBe(true);

    await prisma.nota.update({ where: { id: notaId }, data: { exibirGabarito: 'NUNCA' } });
    const nunca = await http().get(`/api/v1/aluno/resultados/${notaId}`).set('Authorization', aluno.auth).expect(200);
    expect(nunca.body.gabaritoVisivel).toBe(false);
  });

  it('eventos de comportamento: registra saídas da aba, conta no acompanhamento e ignora após o envio', async () => {
    const { prof, aluno, revisor, provaId, turmaId } = await preparar({});
    const aplicacaoId = await c.aplicar(prof.auth, provaId, turmaId);
    const t = await c.executar(aluno.auth, aplicacaoId);
    const evento = (tipo: string, extra: object = {}) =>
      http().post(`/api/v1/aluno/tentativas/${t.tentativaId}/eventos`).set('Authorization', aluno.auth).send({ tipo, ...extra });
    await evento('COPIOU').expect(400);
    await evento('SAIU_DA_PROVA').expect(200);
    await evento('VOLTOU_A_PROVA').expect(200);
    // Horário futuro informado pelo cliente é substituído pelo do servidor
    await evento('SAIU_DA_PROVA', { ocorridoEm: new Date(Date.now() + 3_600_000).toISOString() }).expect(200);

    const acomp = await http().get(`/api/v1/aplicacoes/${aplicacaoId}`).set('Authorization', prof.auth).expect(200);
    expect(acomp.body.participantes[0].tentativas[0].saidasDeFoco).toBe(2);
    const linha = await http().get(`/api/v1/aplicacoes/tentativas/${t.tentativaId}/eventos`).set('Authorization', prof.auth).expect(200);
    expect(linha.body.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['SAIU_DA_PROVA', 'VOLTOU_A_PROVA', 'SAIU_DA_PROVA']);
    expect(new Date(linha.body.eventos[2].ocorridoEm).getTime()).toBeLessThanOrEqual(Date.now());
    // Outro professor não vê
    await http().get(`/api/v1/aplicacoes/tentativas/${t.tentativaId}/eventos`).set('Authorization', revisor.auth).expect(404);

    await t.enviar();
    const depois = await evento('SAIU_DA_PROVA').expect(200);
    expect(depois.body.registrado).toBe(false);
  });

  it('relatórios por disciplina, por aluno e por período (RF09)', async () => {
    const { prof, revisor, aluno, bio, qui, provaId, turmaId } = await preparar({});
    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, turmaId));
    await t.responder(bio.versaoId, { alternativaId: 'B' }).expect(200);
    await t.responder(qui.versaoId, { texto: 'Cl' }).expect(200);
    await t.enviar();

    const disc = await http().get('/api/v1/relatorios/disciplinas').set('Authorization', prof.auth).expect(200);
    expect(disc.body.disciplinas).toEqual([
      expect.objectContaining({ disciplina: 'Biologia', taxaAcerto: 100 }),
      expect.objectContaining({ disciplina: 'Química', taxaAcerto: 0 }),
    ]);
    const prova = await http().get(`/api/v1/relatorios/provas/${provaId}`).set('Authorization', prof.auth).expect(200);
    expect(prova.body.disciplinas).toHaveLength(2);

    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date());
    const noPeriodo = await http().get(`/api/v1/relatorios/provas?de=${hoje}&ate=${hoje}`).set('Authorization', prof.auth).expect(200);
    expect(noPeriodo.body).toHaveLength(1);
    const fora = await http().get('/api/v1/relatorios/provas?ate=2020-01-01').set('Authorization', prof.auth).expect(200);
    expect(fora.body).toHaveLength(0);

    const porAluno = await http().get(`/api/v1/relatorios/alunos/${aluno.usuario.id}`).set('Authorization', prof.auth).expect(200);
    expect(porAluno.body).toMatchObject({ alunoId: aluno.usuario.id, media: 5 });
    expect(porAluno.body.provas).toHaveLength(1);
    // Professor sem relação com o aluno não vê
    await http().get(`/api/v1/relatorios/alunos/${aluno.usuario.id}`).set('Authorization', revisor.auth).expect(404);

    const turma = await http().get(`/api/v1/relatorios/turmas/${turmaId}?de=${hoje}`).set('Authorization', prof.auth).expect(200);
    expect(turma.body.disciplinas).toHaveLength(2);
  });

  it('duplicar prova (RF05): novo rascunho com os mesmos parâmetros e questões', async () => {
    const { prof, revisor, provaId } = await preparar({ exibirGabarito: 'APOS_CORRECAO', prazoRecursoDias: 5 });
    const { body } = await http().post(`/api/v1/provas/${provaId}/duplicar`).set('Authorization', prof.auth).expect(201);
    const copia = await http().get(`/api/v1/provas/${body.id}`).set('Authorization', prof.auth).expect(200);
    expect(copia.body).toMatchObject({
      titulo: 'Prova do lote 6 (cópia)', status: 'RASCUNHO', exibirGabarito: 'APOS_CORRECAO', prazoRecursoDias: 5,
    });
    expect(copia.body.itens).toHaveLength(2);
    await http().post(`/api/v1/provas/${provaId}/duplicar`).set('Authorization', revisor.auth).expect(404);
  });
});
