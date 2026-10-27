import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { cenarios } from './cenarios.js';
import { autenticar, criarApp, limparBanco } from './utilitarios.js';

/** Lote 8 — seções e sorteio, nota por seção, associação/ordenação, correção (designados, às cegas, rubrica) e recurso encaminhado. */
describe('Seções, correção e recursos (lote 8) — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const c = cenarios(() => app);
  const http = () => c.http();

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  async function pessoas() {
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const revisor = await autenticar(app, prisma, 'PROFESSOR', { email: 'revisor@teste.local' });
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    return { prof, revisor, aluno };
  }
  const vf = (n: number, correta = 0) => ({ disciplina: 'Física', dificuldade: 'FACIL', formato: 'VERDADEIRO_FALSO', enunciado: `Afirmação ${n}.`, alternativaCorreta: correta });

  async function provaRascunho(auth: string, extras: Record<string, unknown> = {}) {
    const { body } = await http().post('/api/v1/provas').set('Authorization', auth).send({
      titulo: 'Prova com seções', visibilidade: 'PRIVADA', criterioAprovacao: { tipo: 'NOTA_MINIMA', valor: 6 },
      tempoLimiteMin: 30, tentativasPermitidas: 1, modoNavegacao: 'LIVRE', ordemQuestoes: 'FIXA', ...extras,
    }).expect(201);
    return body.id as string;
  }

  it('seções com sorteio: valida, publica e cada aluno recebe as sorteadas; nota mínima por seção', async () => {
    const { prof, revisor, aluno } = await pessoas();
    const fixa = await c.questaoPublicada(prof.auth, revisor.auth, vf(1));
    const pool = [];
    for (let i = 2; i <= 5; i++) pool.push(await c.questaoPublicada(prof.auth, revisor.auth, vf(i, 1)));
    const provaId = await provaRascunho(prof.auth);
    const compor = (secoes: unknown) => http().put(`/api/v1/provas/${provaId}/composicao`).set('Authorization', prof.auth).send({ secoes });

    await compor([{ titulo: 'Sorteio', modo: 'SORTEIO', sortear: 9, peso: 100, itens: pool.map((p) => ({ versaoQuestaoId: p.versaoId })) }]).expect(400);
    await compor([
      { titulo: 'Fixa', modo: 'FIXA', itens: [{ versaoQuestaoId: fixa.versaoId, peso: 40 }] },
      { titulo: 'Sorteio', modo: 'SORTEIO', sortear: 2, peso: 50, notaMinima: 5, itens: pool.map((p) => ({ versaoQuestaoId: p.versaoId })) },
    ]).expect(200);
    const pesoErrado = await http().post(`/api/v1/provas/${provaId}/publicar`).set('Authorization', prof.auth).expect(400);
    expect(pesoErrado.body.codigo).toBe('PESO_INVALIDO');
    const ok = await compor([
      { titulo: 'Fixa', modo: 'FIXA', itens: [{ versaoQuestaoId: fixa.versaoId, peso: 40 }] },
      { titulo: 'Sorteio', modo: 'SORTEIO', sortear: 2, peso: 60, notaMinima: 5, itens: pool.map((p) => ({ versaoQuestaoId: p.versaoId })) },
    ]).expect(200);
    expect(ok.body).toMatchObject({ somaPesos: 100, questoesPorParticipante: 3 });
    expect(ok.body.secoes.map((s: { titulo: string }) => s.titulo)).toEqual(['Fixa', 'Sorteio']);
    await http().post(`/api/v1/provas/${provaId}/publicar`).set('Authorization', prof.auth).expect(200);

    const turmaId = await c.turmaCom(prof.auth, ['aluno@teste.local']);
    const aplicacaoId = await c.aplicar(prof.auth, provaId, turmaId);
    const lista = await http().get('/api/v1/aluno/aplicacoes').set('Authorization', aluno.auth).expect(200);
    expect(lista.body[0].totalQuestoes).toBe(3);
    const t = await c.executar(aluno.auth, aplicacaoId);
    const exec = await http().get(`/api/v1/aluno/tentativas/${t.tentativaId}`).set('Authorization', aluno.auth).expect(200);
    expect(exec.body.questoes).toHaveLength(3);
    expect(exec.body.questoes.map((q: { secaoTitulo: string }) => q.secaoTitulo)).toEqual(['Fixa', 'Sorteio', 'Sorteio']);

    // Acerta a fixa (V) e erra as sorteadas (correta é F): 4/10 → reprova também pela seção
    for (const q of exec.body.questoes) await t.responder(q.versaoQuestaoId, { alternativaId: 'V' }).expect(200);
    const env = await t.enviar();
    const r = await http().get(`/api/v1/aluno/resultados/${env.body.resultado.notaId}`).set('Authorization', aluno.auth).expect(200);
    expect(r.body).toMatchObject({ notaFinal: '4', statusAprovacao: 'REPROVADO' });
    expect(r.body.notasSecao).toEqual([
      expect.objectContaining({ titulo: 'Fixa', nota: 10, atingiu: null }),
      expect.objectContaining({ titulo: 'Sorteio', nota: 0, notaMinima: 5, atingiu: false }),
    ]);

    // Duplicar copia seções
    const { body: dup } = await http().post(`/api/v1/provas/${provaId}/duplicar`).set('Authorization', prof.auth).expect(201);
    const copia = await http().get(`/api/v1/provas/${dup.id}`).set('Authorization', prof.auth).expect(200);
    expect(copia.body.secoes).toHaveLength(2);
    expect(copia.body.itens.filter((i: { secaoId: string | null }) => i.secaoId).length).toBe(5);
  });

  it('associação e ordenação: correção parcial automática', async () => {
    const { prof, revisor, aluno } = await pessoas();
    const ass = await c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'Geografia', dificuldade: 'MEDIO', formato: 'ASSOCIACAO', enunciado: 'Associe país e capital.',
      associacoes: [{ item: 'Brasil', opcao: 'Brasília' }, { item: 'Chile', opcao: 'Santiago' }, { item: 'Peru', opcao: 'Lima' }, { item: 'Uruguai', opcao: 'Montevidéu' }],
      opcoesExtras: ['Quito'],
    });
    const ord = await c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'História', dificuldade: 'MEDIO', formato: 'ORDENACAO', enunciado: 'Ordene.', itensOrdem: ['Colônia', 'Império', 'República'],
    });
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: ass.versaoId, peso: 50 }, { versaoQuestaoId: ord.versaoId, peso: 50 }]);
    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, await c.turmaCom(prof.auth, ['aluno@teste.local'])));
    const exec = await http().get(`/api/v1/aluno/tentativas/${t.tentativaId}`).set('Authorization', aluno.auth).expect(200);
    type Alt = { id: string; texto: string; grupo?: string };
    const qOrd = exec.body.questoes.find((q: { formato: string }) => q.formato === 'ORDENACAO');
    expect(qOrd.alternativas.map((a: Alt) => a.texto)).not.toEqual(['Colônia', 'Império', 'República']); // nunca na ordem certa
    const qAss = exec.body.questoes.find((q: { formato: string }) => q.formato === 'ASSOCIACAO');
    expect(qAss.alternativas.filter((a: Alt) => a.grupo === 'OPCAO')).toHaveLength(5);
    // Gabarito não dedutível pelos IDs (antes: I1→O1 e ordem A,B,C): IDs opacos da instância
    const todos = [...qOrd.alternativas, ...qAss.alternativas].map((a: Alt) => a.id);
    expect(todos.some((id: string) => /^([IO]\d+|[A-E])$/.test(id))).toBe(false);
    const id = (alts: Alt[], texto: string) => alts.find((a) => a.texto === texto)!.id;
    const a = (texto: string) => id(qAss.alternativas, texto);
    const o = (texto: string) => id(qOrd.alternativas, texto);

    await t.responder(ass.versaoId, { pares: { [a('Brasil')]: 'O9' } }).expect(400);
    await t.responder(ass.versaoId, {
      pares: { [a('Brasil')]: a('Brasília'), [a('Chile')]: a('Santiago'), [a('Peru')]: a('Montevidéu'), [a('Uruguai')]: a('Lima') },
    }).expect(200);
    await t.responder(ord.versaoId, { ordem: [o('Colônia'), o('Império')] }).expect(400);
    await t.responder(ord.versaoId, { ordem: [o('Império'), o('Colônia'), o('República')] }).expect(200);
    const env = await t.enviar();
    // associação 2/4 = 0,5 × 50 + ordenação 2/3 pares × 50 = 25 + 33,33 → 5,83
    expect(env.body.resultado.notaFinal).toBe('5.83');
  });

  it('correção: designados, às cegas e rubrica com critérios', async () => {
    const { prof, revisor, aluno } = await pessoas();
    const corretor = await autenticar(app, prisma, 'CORRETOR', { email: 'corretor@teste.local' });
    const outroCorretor = await autenticar(app, prisma, 'CORRETOR', { email: 'outro@teste.local' });
    const q = await c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'Biologia', dificuldade: 'MEDIO', formato: 'DISSERTATIVA', enunciado: 'Explique a fotossíntese.',
      rubrica: 'Ver critérios', rubricaItens: [{ descricao: 'Cita luz e clorofila', pontos: 2 }, { descricao: 'Cita glicose e O2', pontos: 3 }],
    });
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }], { correcaoAsCegas: true });
    await http().put(`/api/v1/provas/${provaId}/corretores`).set('Authorization', prof.auth).send({ usuarioIds: [aluno.usuario.id] }).expect(400);
    await http().put(`/api/v1/provas/${provaId}/corretores`).set('Authorization', prof.auth).send({ usuarioIds: [corretor.usuario.id] }).expect(200);

    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, await c.turmaCom(prof.auth, ['aluno@teste.local'])));
    await t.responder(q.versaoId, { texto: 'Luz e clorofila produzem glicose.' }).expect(200);
    await t.enviar();

    const fila = await http().get('/api/v1/correcao/pendentes').set('Authorization', corretor.auth).expect(200);
    expect(fila.body).toHaveLength(1);
    expect(fila.body[0].participanteNome).toMatch(/^Participante [0-9A-F]{6}$/);
    expect((await http().get('/api/v1/correcao/pendentes').set('Authorization', outroCorretor.auth).expect(200)).body).toHaveLength(0);
    const notaId = fila.body[0].notaId as string;
    const det = await http().get(`/api/v1/correcao/notas/${notaId}`).set('Authorization', corretor.auth).expect(200);
    expect(JSON.stringify(det.body)).not.toContain('aluno@teste.local');
    expect(det.body).toMatchObject({ usuarioId: null, tentativaId: null }); // sem atalho para a identidade
    await http().get(`/api/v1/correcao/notas/${notaId}`).set('Authorization', outroCorretor.auth).expect(404);

    await http().post(`/api/v1/correcao/notas/${notaId}/questoes/${q.versaoId}`).set('Authorization', corretor.auth)
      .send({ pontosItens: [2] }).expect(400);
    const corr = await http().post(`/api/v1/correcao/notas/${notaId}/questoes/${q.versaoId}`).set('Authorization', corretor.auth)
      .send({ pontosItens: [2, 1.5], feedback: 'Faltou o O2.' }).expect(201);
    expect(corr.body).toMatchObject({ status: 'CONSOLIDADA', notaFinal: '7', participanteNome: 'Usuário ALUNO' }); // consolidou: nome volta
    expect(corr.body.usuarioId).toBe(aluno.usuario.id);
    expect(corr.body.questoes[0].avaliacaoItens).toEqual([
      { descricao: 'Cita luz e clorofila', pontos: 2, maximo: 2 },
      { descricao: 'Cita glicose e O2', pontos: 1.5, maximo: 3 },
    ]);
  });

  it('correção simultânea de questões diferentes da mesma nota consolida (trava na nota)', async () => {
    const { prof, revisor, aluno } = await pessoas();
    const corretor = await autenticar(app, prisma, 'CORRETOR', { email: 'corretor@teste.local' });
    const diss = (n: number) => c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'Biologia', dificuldade: 'MEDIO', formato: 'DISSERTATIVA', enunciado: `Dissertativa ${n}.`, rubrica: 'Livre',
    });
    const q1 = await diss(1);
    const q2 = await diss(2);
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q1.versaoId, peso: 50 }, { versaoQuestaoId: q2.versaoId, peso: 50 }]);
    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, await c.turmaCom(prof.auth, ['aluno@teste.local'])));
    await t.responder(q1.versaoId, { texto: 'Resposta 1' }).expect(200);
    await t.responder(q2.versaoId, { texto: 'Resposta 2' }).expect(200);
    await t.enviar();
    const nota = await prisma.nota.findFirstOrThrow({ where: { provaId } });

    // Dois corretores ao mesmo tempo, cada um numa questão: sem a trava, cada transação via a
    // questão do outro ainda pendente e a nota podia ficar "pendente" para sempre.
    await Promise.all([
      http().post(`/api/v1/correcao/notas/${nota.id}/questoes/${q1.versaoId}`).set('Authorization', prof.auth).send({ percentual: 100 }).expect(201),
      http().post(`/api/v1/correcao/notas/${nota.id}/questoes/${q2.versaoId}`).set('Authorization', corretor.auth).send({ percentual: 50 }).expect(201),
    ]);
    const final = await prisma.nota.findUniqueOrThrow({ where: { id: nota.id } });
    expect(final.status).toBe('CONSOLIDADA');
    expect(Number(final.notaFinal)).toBe(7.5);
    // Depois de consolidada, nova correção é recusada (checagem dentro da transação)
    await http().post(`/api/v1/correcao/notas/${nota.id}/questoes/${q1.versaoId}`).set('Authorization', prof.auth).send({ percentual: 0 }).expect(409);
  });

  it('recurso encaminhado à coordenação: só a gestão decide', async () => {
    const { prof, revisor, aluno } = await pessoas();
    const coord = await autenticar(app, prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    const q = await c.questaoPublicada(prof.auth, revisor.auth, vf(1));
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }]);
    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, await c.turmaCom(prof.auth, ['aluno@teste.local'])));
    await t.responder(q.versaoId, { alternativaId: 'F' }).expect(200);
    const notaId = (await t.enviar()).body.resultado.notaId;
    const { body: rec } = await http().post('/api/v1/aluno/recursos').set('Authorization', aluno.auth)
      .send({ notaId, versaoQuestaoId: q.versaoId, justificativa: 'Ambígua' }).expect(201);

    await http().post(`/api/v1/recursos/${rec.id}/encaminhar`).set('Authorization', prof.auth).send({}).expect(400);
    const enc = await http().post(`/api/v1/recursos/${rec.id}/encaminhar`).set('Authorization', prof.auth)
      .send({ motivo: 'Sou o autor da questão; prefiro decisão da coordenação.' }).expect(200);
    expect(enc.body).toMatchObject({ status: 'EM_ANALISE', motivoEncaminhamento: expect.stringContaining('coordenação') });
    expect(await prisma.notificacao.count({ where: { usuarioId: coord.usuario.id } })).toBe(1);
    await http().post(`/api/v1/recursos/${rec.id}/decidir`).set('Authorization', prof.auth)
      .send({ deferido: false, decisao: 'Mantida' }).expect(403);
    await http().post(`/api/v1/recursos/${rec.id}/decidir`).set('Authorization', coord.auth)
      .send({ deferido: false, decisao: 'Mantida pela coordenação' }).expect(200);
  });
});
