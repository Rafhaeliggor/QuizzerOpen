import type { INestApplication } from '@nestjs/common';
import { readdir, rm, utimes } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { MidiasService } from '../src/modules/questoes/midias.service.js';
import { cenarios } from './cenarios.js';
import { autenticar, criarApp, limparBanco } from './utilitarios.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 2)]);

/** Lote 7 — várias corretas, numérica, fórmulas, versão mais nova, alunos escolhidos, transferência, mídias órfãs, limites, Excel. */
describe('Formatos e aplicação (lote 7) — e2e', () => {
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
    const aluno2 = await autenticar(app, prisma, 'ALUNO', { email: 'aluno2@teste.local' });
    return { prof, revisor, aluno, aluno2 };
  }
  const base = { disciplina: 'Matemática', dificuldade: 'MEDIO' };

  it('várias corretas (parcial) e numérica (tolerância), com fórmula e mídia no resultado', async () => {
    const { prof, revisor, aluno } = await pessoas();
    await http().post('/api/v1/questoes').set('Authorization', prof.auth)
      .send({ ...base, formato: 'MULTIPLA_RESPOSTA', enunciado: 'x', alternativas: [{ texto: 'a' }, { texto: 'b' }], alternativasCorretas: [] })
      .expect(400);
    await http().post('/api/v1/questoes').set('Authorization', prof.auth)
      .send({ ...base, formato: 'RESPOSTA_NUMERICA', enunciado: 'x' }).expect(400);

    const up = await http().post('/api/v1/midias').set('Authorization', prof.auth).attach('arquivo', PNG, 'grafico.png').expect(201);
    const mr = await c.questaoPublicada(prof.auth, revisor.auth, {
      ...base, formato: 'MULTIPLA_RESPOSTA', enunciado: 'Quais são primos? \\(p > 1\\)',
      alternativas: [{ texto: '2' }, { texto: '4' }, { texto: '5' }, { texto: '9' }], alternativasCorretas: [0, 2], midiaIds: [up.body.id],
    });
    const num = await c.questaoPublicada(prof.auth, revisor.auth, {
      ...base, formato: 'RESPOSTA_NUMERICA', enunciado: 'Quanto é \\(\\pi\\) com duas casas?', valorNumerico: 3.14, tolerancia: 0.005,
    });
    const det = await http().get(`/api/v1/questoes/${mr.id}`).set('Authorization', prof.auth).expect(200);
    expect(det.body.versoes[0].gabarito).toEqual({ alternativaIds: ['A', 'C'] });

    const provaId = await c.provaPublicada(prof.auth, [
      { versaoQuestaoId: mr.versaoId, peso: 50 },
      { versaoQuestaoId: num.versaoId, peso: 50 },
    ], { exibirGabarito: 'APOS_CORRECAO' });
    const turmaId = await c.turmaCom(prof.auth, ['aluno@teste.local']);
    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, turmaId));
    await t.responder(mr.versaoId, { alternativaIds: ['A', 'Z'] }).expect(400);
    await t.responder(mr.versaoId, { alternativaIds: ['A'] }).expect(200);
    await t.responder(num.versaoId, { texto: 'x'.repeat(51) }).expect(400);
    await t.responder(num.versaoId, { texto: '3,141' }).expect(200);
    const env = await t.enviar();
    expect(env.body.resultado).toMatchObject({ notaFinal: '7.5' }); // 0,5 × 50 + 1 × 50

    const r = await http().get(`/api/v1/aluno/resultados/${env.body.resultado.notaId}`).set('Authorization', aluno.auth).expect(200);
    const qmr = r.body.questoes.find((q: { formato: string }) => q.formato === 'MULTIPLA_RESPOSTA');
    expect(qmr).toMatchObject({ fracao: '0.5', gabarito: { alternativaIds: ['A', 'C'] } });
    expect(qmr.midias[0].url).toBe(up.body.url);
    expect(qmr.enunciado).toContain('\\(p > 1\\)');
  });

  it('prova em rascunho troca para a versão mais nova das questões; publicada só avisa', async () => {
    const { prof, revisor } = await pessoas();
    const corpo = { ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Versão 1', alternativaCorreta: 0 };
    const q = await c.questaoPublicada(prof.auth, revisor.auth, corpo);
    const { body: prova } = await http().post('/api/v1/provas').set('Authorization', prof.auth).send({
      titulo: 'P', visibilidade: 'PRIVADA', criterioAprovacao: { tipo: 'NENHUM' }, tentativasPermitidas: 1, modoNavegacao: 'LIVRE', ordemQuestoes: 'FIXA',
    }).expect(201);
    await http().put(`/api/v1/provas/${prova.id}/questoes`).set('Authorization', prof.auth)
      .send({ itens: [{ versaoQuestaoId: q.versaoId, peso: 100 }] }).expect(200);
    await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).send({ ...corpo, enunciado: 'Versão 2' }).expect(200);

    const antes = await http().get(`/api/v1/provas/${prova.id}`).set('Authorization', prof.auth).expect(200);
    expect(antes.body.itens[0]).toMatchObject({ numeroVersao: 1, versaoMaisNova: 2 });
    const depois = await http().post(`/api/v1/provas/${prova.id}/atualizar-versoes`).set('Authorization', prof.auth).expect(200);
    expect(depois.body.versoesAtualizadas).toBe(1);
    expect(depois.body.itens[0]).toMatchObject({ numeroVersao: 2, versaoMaisNova: null, peso: 100, enunciado: 'Versão 2' });

    await http().post(`/api/v1/provas/${prova.id}/publicar`).set('Authorization', prof.auth).expect(200);
    await http().post(`/api/v1/provas/${prova.id}/atualizar-versoes`).set('Authorization', prof.auth).expect(409);
  });

  it('aplicação para alunos escolhidos: só eles veem e iniciam; professor só escolhe alunos das próprias turmas', async () => {
    const { prof, revisor, aluno, aluno2 } = await pessoas();
    const de_fora = await autenticar(app, prisma, 'ALUNO', { email: 'fora@teste.local' });
    const q = await c.questaoPublicada(prof.auth, revisor.auth, { ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Segunda chamada.', alternativaCorreta: 0 });
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }]);
    await c.turmaCom(prof.auth, ['aluno@teste.local', 'aluno2@teste.local']);
    const agora = Date.now();
    const janela = { janelaInicio: new Date(agora - 60_000).toISOString(), janelaFim: new Date(agora + 3_600_000).toISOString() };

    await http().post('/api/v1/aplicacoes').set('Authorization', prof.auth)
      .send({ provaId, destinoTipo: 'ALUNO_AVULSO', alunoIds: [], ...janela }).expect(400);
    await http().post('/api/v1/aplicacoes').set('Authorization', prof.auth)
      .send({ provaId, destinoTipo: 'ALUNO_AVULSO', alunoIds: [de_fora.usuario.id], ...janela }).expect(400);
    const { body: apl } = await http().post('/api/v1/aplicacoes').set('Authorization', prof.auth)
      .send({ provaId, destinoTipo: 'ALUNO_AVULSO', alunoIds: [aluno.usuario.id], ...janela }).expect(201);

    const lista1 = await http().get('/api/v1/aluno/aplicacoes').set('Authorization', aluno.auth).expect(200);
    expect(lista1.body.find((a: { aplicacaoId: string }) => a.aplicacaoId === apl.id)).toMatchObject({ turmaNome: 'Aplicação individual', podeIniciar: true });
    const lista2 = await http().get('/api/v1/aluno/aplicacoes').set('Authorization', aluno2.auth).expect(200);
    expect(lista2.body.some((a: { aplicacaoId: string }) => a.aplicacaoId === apl.id)).toBe(false);
    await http().post(`/api/v1/aluno/aplicacoes/${apl.id}/iniciar`).set('Authorization', aluno2.auth).expect(404);
    await http().post(`/api/v1/aluno/aplicacoes/${apl.id}/iniciar`).set('Authorization', aluno.auth).expect(200);

    const acomp = await http().get(`/api/v1/aplicacoes/${apl.id}`).set('Authorization', prof.auth).expect(200);
    expect(acomp.body.participantes.map((p: { email: string }) => p.email)).toEqual(['aluno@teste.local']);
    const listaProf = await http().get('/api/v1/aplicacoes').set('Authorization', prof.auth).expect(200);
    expect(listaProf.body[0]).toMatchObject({ destinoTipo: 'ALUNO_AVULSO', alunosSelecionados: 1 });
  });

  it('transferência de aluno entre turmas preserva o histórico', async () => {
    const { prof, aluno } = await pessoas();
    const a = await c.turmaCom(prof.auth, ['aluno@teste.local'], 'Turma A');
    const b = await c.turmaCom(prof.auth, [], 'Turma B');
    await http().post(`/api/v1/turmas/${a}/alunos/${aluno.usuario.id}/transferir`).set('Authorization', prof.auth)
      .send({ turmaDestinoId: a }).expect(400);
    await http().post(`/api/v1/turmas/${a}/alunos/${aluno.usuario.id}/transferir`).set('Authorization', prof.auth)
      .send({ turmaDestinoId: b }).expect(200);
    expect((await http().get(`/api/v1/turmas/${a}`).set('Authorization', prof.auth)).body.alunos).toHaveLength(0);
    expect((await http().get(`/api/v1/turmas/${b}`).set('Authorization', prof.auth)).body.alunos).toHaveLength(1);
    expect(await prisma.matricula.count({ where: { alunoId: aluno.usuario.id } })).toBe(2);
    await http().post(`/api/v1/turmas/${a}/alunos/${aluno.usuario.id}/transferir`).set('Authorization', prof.auth)
      .send({ turmaDestinoId: b }).expect(404);
  });

  it('limpeza de mídias órfãs: remove uploads não usados e arquivos sem registro, preserva os usados', async () => {
    const { prof, revisor } = await pessoas();
    const midias = app.get(MidiasService);
    // A pasta de mídias dos e2e é compartilhada entre execuções: começa vazia.
    for (const f of await readdir(midias.pasta)) await rm(resolve(midias.pasta, f), { force: true });
    const orfa = await http().post('/api/v1/midias').set('Authorization', prof.auth).attach('arquivo', PNG, 'orfa.png').expect(201);
    const usada = await http().post('/api/v1/midias').set('Authorization', prof.auth).attach('arquivo', PNG, 'usada.png').expect(201);
    await c.questaoPublicada(prof.auth, revisor.auth, { ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Com imagem.', alternativaCorreta: 0, midiaIds: [usada.body.id] });
    const arquivo = (url: string) => resolve(midias.pasta, url.split('/').pop()!);

    expect(await midias.limparOrfas()).toEqual({ registros: 0, arquivos: 0 }); // recentes: nada sai
    const velho = new Date(Date.now() - 2 * 86_400_000);
    await prisma.midia.updateMany({ data: { criadoEm: velho } });
    for (const u of [orfa.body.url, usada.body.url]) await utimes(arquivo(u), velho, velho);
    expect(await midias.limparOrfas()).toEqual({ registros: 1, arquivos: 1 });
    expect(existsSync(arquivo(orfa.body.url))).toBe(false);
    expect(existsSync(arquivo(usada.body.url))).toBe(true);
    await http().get(usada.body.url).expect(200);
  });

  it('rotas de execução têm teto por sessão (300/min) sem limitar colegas no mesmo IP', async () => {
    const { prof, revisor, aluno, aluno2 } = await pessoas();
    const q = await c.questaoPublicada(prof.auth, revisor.auth, { ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Limite.', alternativaCorreta: 0 });
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }]);
    const aplicacaoId = await c.aplicar(prof.auth, provaId, await c.turmaCom(prof.auth, ['aluno@teste.local', 'aluno2@teste.local']));
    const t1 = await c.executar(aluno.auth, aplicacaoId);
    const t2 = await c.executar(aluno2.auth, aplicacaoId);
    const status: number[] = [];
    for (let i = 0; i < 300; i++) status.push((await t1.responder(q.versaoId, { alternativaId: i % 2 ? 'V' : 'F' })).status);
    expect(status.every((s) => s === 200)).toBe(true);
    expect((await t1.responder(q.versaoId, { alternativaId: 'V' })).status).toBe(429);
    expect((await t2.responder(q.versaoId, { alternativaId: 'V' })).status).toBe(200);
  }, 60_000);

  it('exporta relatório em Excel (.xlsx) e traz indícios', async () => {
    const { prof, revisor, aluno } = await pessoas();
    const q = await c.questaoPublicada(prof.auth, revisor.auth, { ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Excel.', alternativaCorreta: 0 });
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }]);
    const t = await c.executar(aluno.auth, await c.aplicar(prof.auth, provaId, await c.turmaCom(prof.auth, ['aluno@teste.local'])));
    await t.responder(q.versaoId, { alternativaId: 'V' }).expect(200);
    await t.enviar();
    const rel = await http().get(`/api/v1/relatorios/provas/${provaId}`).set('Authorization', prof.auth).expect(200);
    expect(rel.body.indicios).toEqual([]);
    const xlsx = await http().get(`/api/v1/relatorios/provas/${provaId}/xlsx`).set('Authorization', prof.auth)
      .buffer(true).parse((res, cb) => {
        const partes: Buffer[] = [];
        res.on('data', (d: Buffer) => partes.push(d));
        res.on('end', () => cb(null, Buffer.concat(partes)));
      }).expect(200);
    expect(xlsx.headers['content-type']).toContain('spreadsheetml');
    expect(xlsx.headers['content-disposition']).toContain('.xlsx');
    expect((xlsx.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    await http().get(`/api/v1/relatorios/provas/${provaId}/pdf`).set('Authorization', prof.auth).expect(400);
    const audit = await http().get('/api/v1/auditoria/xlsx').set('Authorization', (await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'adm@teste.local' })).auth).expect(200);
    expect(audit.headers['content-type']).toContain('spreadsheetml');
  });
});
