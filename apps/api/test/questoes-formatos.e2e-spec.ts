import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { cenarios } from './cenarios.js';
import { autenticar, criarApp, limparBanco } from './utilitarios.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

/** Lote 6 — RF04: formatos de questão, mídia e aprovação de alterações de alto risco. */
describe('Questões: formatos, mídias e alto risco — e2e', () => {
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
    const coord = await autenticar(app, prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    return { prof, revisor, coord, aluno };
  }

  const base = { disciplina: 'Geografia', dificuldade: 'FACIL' };

  it('cria V/F e resposta curta, corrige automaticamente na execução e congela no snapshot', async () => {
    const { prof, revisor, aluno } = await pessoas();

    // Validações por formato
    await http().post('/api/v1/questoes').set('Authorization', prof.auth)
      .send({ ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'x' }).expect(400);
    await http().post('/api/v1/questoes').set('Authorization', prof.auth)
      .send({ ...base, formato: 'RESPOSTA_CURTA', enunciado: 'x', respostasAceitas: ['  '] }).expect(400);
    await http().post('/api/v1/questoes').set('Authorization', prof.auth)
      .send({ ...base, formato: 'DISSERTATIVA', natureza: 'FECHADA', enunciado: 'x' }).expect(400);

    const vf = await c.questaoPublicada(prof.auth, revisor.auth, {
      ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Brasília é a capital do Brasil.', alternativaCorreta: 0,
    });
    const curta = await c.questaoPublicada(prof.auth, revisor.auth, {
      ...base, formato: 'RESPOSTA_CURTA', enunciado: 'Qual é o maior oceano?', respostasAceitas: ['Pacífico', 'Oceano Pacífico'],
    });
    const det = await http().get(`/api/v1/questoes/${vf.id}`).set('Authorization', prof.auth).expect(200);
    expect(det.body).toMatchObject({ formato: 'VERDADEIRO_FALSO', natureza: 'FECHADA' });
    expect(det.body.versoes[0].alternativas).toEqual([{ id: 'V', texto: 'Verdadeiro' }, { id: 'F', texto: 'Falso' }]);

    const provaId = await c.provaPublicada(prof.auth, [
      { versaoQuestaoId: vf.versaoId, peso: 50 },
      { versaoQuestaoId: curta.versaoId, peso: 50 },
    ], { ordemQuestoes: 'RANDOMIZADA' });
    const turmaId = await c.turmaCom(prof.auth, ['aluno@teste.local']);
    const aplicacaoId = await c.aplicar(prof.auth, provaId, turmaId);

    const t = await c.executar(aluno.auth, aplicacaoId);
    const exec = await http().get(`/api/v1/aluno/tentativas/${t.tentativaId}`).set('Authorization', aluno.auth).expect(200);
    const qvf = exec.body.questoes.find((q: { versaoQuestaoId: string }) => q.versaoQuestaoId === vf.versaoId);
    expect(qvf).toMatchObject({ formato: 'VERDADEIRO_FALSO', alternativas: [{ id: 'V' }, { id: 'F' }] }); // não embaralha V/F
    expect(JSON.stringify(exec.body)).not.toContain('respostasAceitas');

    await t.responder(vf.versaoId, { alternativaId: 'X' }).expect(400);
    await t.responder(vf.versaoId, { alternativaId: 'V' }).expect(200);
    await t.responder(curta.versaoId, { texto: 'x'.repeat(501) }).expect(400);
    await t.responder(curta.versaoId, { texto: '  oceano PACIFICO ' }).expect(200);
    const env = await t.enviar();
    expect(env.body.resultado).toMatchObject({ notaFinal: '10', statusAprovacao: 'APROVADO' });

    const correcoes = await prisma.correcaoQuestao.findMany({ orderBy: { formato: 'asc' } });
    expect(correcoes.map((x) => [x.formato, x.disciplina, Number(x.fracao), x.automatica])).toEqual([
      ['RESPOSTA_CURTA', 'Geografia', 1, true],
      ['VERDADEIRO_FALSO', 'Geografia', 1, true],
    ]);
  });

  it('mídia: valida assinatura, liga à versão e é servida com cabeçalhos seguros', async () => {
    const { prof, revisor, aluno } = await pessoas();
    // SVG (pode conter script) é recusado mesmo com mime/extensão de imagem
    await http().post('/api/v1/midias').set('Authorization', prof.auth)
      .attach('arquivo', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), {
        filename: 'x.png', contentType: 'image/png',
      }).expect(400);
    // Aluno não envia mídia
    await http().post('/api/v1/midias').set('Authorization', aluno.auth)
      .attach('arquivo', PNG, 'a.png').expect(403);

    const up = await http().post('/api/v1/midias').set('Authorization', prof.auth)
      .attach('arquivo', PNG, { filename: 'mapa.png', contentType: 'application/octet-stream' }).expect(201);
    expect(up.body).toMatchObject({ tipo: 'IMAGEM', nomeOriginal: 'mapa.png' });
    expect(up.body.url).toMatch(/^\/api\/v1\/midias\/[0-9a-f]{32}$/);

    // Outra pessoa não pode usar a mídia enviada por mim
    await http().post('/api/v1/questoes').set('Authorization', revisor.auth)
      .send({ ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Mapa', alternativaCorreta: 1, midiaIds: [up.body.id] }).expect(403);

    const q = await c.questaoPublicada(prof.auth, revisor.auth, {
      ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'O mapa mostra a Amazônia.', alternativaCorreta: 1, midiaIds: [up.body.id],
    });
    const det = await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).expect(200);
    expect(det.body.versoes[0].midias).toEqual([expect.objectContaining({ id: up.body.id, url: up.body.url })]);

    const arquivo = await http().get(up.body.url).expect(200);
    expect(arquivo.headers['content-type']).toBe('image/png');
    expect(arquivo.headers['x-content-type-options']).toBe('nosniff');
    expect(arquivo.headers['content-security-policy']).toContain('sandbox');
    await http().get('/api/v1/midias/00000000000000000000000000000000').expect(404);
    await http().get('/api/v1/midias/..%2F..%2Fetc%2Fpasswd').expect(404);

    // Nova versão mantém a mídia (cópia do vínculo)
    await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth)
      .send({ ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'O mapa mostra o Cerrado.', alternativaCorreta: 1, midiaIds: [up.body.id] })
      .expect(200);
    const v2 = await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).expect(200);
    expect(v2.body.versoes.map((v: { midias: { url: string }[] }) => v.midias[0]?.url)).toEqual([up.body.url, up.body.url]);
  });

  it('alto risco: alteração de publicada fica pendente até outra pessoa aprovar', async () => {
    const { prof, revisor, coord } = await pessoas();
    const corpo = { ...base, formato: 'VERDADEIRO_FALSO', enunciado: 'Afirmação certificada.', alternativaCorreta: 0, altoRisco: true };
    const q = await c.questaoPublicada(prof.auth, revisor.auth, corpo);

    const ed = await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth)
      .send({ ...corpo, enunciado: 'Afirmação certificada (revisada).' }).expect(200);
    expect(ed.body.versaoPendente).toBe(true);
    const det = await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).expect(200);
    expect(det.body.versaoPendenteId).toBeTruthy();
    expect(det.body.podeAprovarVersao).toBe(false); // autor não aprova

    // Composição usa a vigente (aprovada); a pendente não pode ser usada
    await http().post('/api/v1/provas').set('Authorization', prof.auth).send({
      titulo: 'P', visibilidade: 'PRIVADA', criterioAprovacao: { tipo: 'NENHUM' }, tentativasPermitidas: 1,
      modoNavegacao: 'LIVRE', ordemQuestoes: 'FIXA',
    }).expect(201).then(async ({ body }) => {
      await http().put(`/api/v1/provas/${body.id}/questoes`).set('Authorization', prof.auth)
        .send({ itens: [{ versaoQuestaoId: det.body.versaoPendenteId, peso: 100 }] }).expect(400);
    });
    const lista = await http().get('/api/v1/questoes?escopo=revisao').set('Authorization', revisor.auth).expect(200);
    expect(lista.body.itens.map((i: { id: string; versaoPendente: boolean; versaoVigente: { numeroVersao: number } }) => [i.id, i.versaoPendente, i.versaoVigente.numeroVersao]))
      .toEqual([[q.id, true, 1]]);

    // Professor não desmarca o alto risco de questão publicada; coordenação pode
    await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).send({ ...corpo, altoRisco: false }).expect(403);

    await http().post(`/api/v1/questoes/${q.id}/versoes/${det.body.versaoPendenteId}/aprovar`).set('Authorization', prof.auth).expect(403);
    await http().post(`/api/v1/questoes/${q.id}/versoes/${det.body.versaoPendenteId}/aprovar`).set('Authorization', revisor.auth).expect(200);
    const aprovada = await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).expect(200);
    expect(aprovada.body.versaoPendenteId).toBeNull();
    expect(aprovada.body.versoes[0]).toMatchObject({ numeroVersao: 2, pendente: false, enunciado: 'Afirmação certificada (revisada).' });

    // Recusa descarta a pendente
    await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).send({ ...corpo, enunciado: 'Versão ruim' }).expect(200);
    const pend = (await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth)).body.versaoPendenteId;
    await http().post(`/api/v1/questoes/${q.id}/versoes/${pend}/rejeitar`).set('Authorization', coord.auth)
      .send({ comentario: 'Mantenha a redação atual' }).expect(200);
    const final = await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).expect(200);
    expect(final.body.versoes.map((v: { numeroVersao: number }) => v.numeroVersao)).toEqual([2, 1]);
    expect(final.body.comentarioRevisao).toBe('Mantenha a redação atual');

    await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', coord.auth).send({ ...corpo, altoRisco: false }).expect(200);
  });

  it('banco de questões filtra por tipo e dificuldade (Figma — feature 037)', async () => {
    const { prof, revisor } = await pessoas();
    await c.questaoPublicada(prof.auth, revisor.auth, { disciplina: 'Física', dificuldade: 'FACIL', formato: 'VERDADEIRO_FALSO', enunciado: 'Afirmação.', alternativaCorreta: 0 });
    await c.questaoPublicada(prof.auth, revisor.auth, { disciplina: 'Física', dificuldade: 'DIFICIL', formato: 'DISSERTATIVA', enunciado: 'Explique.', rubrica: 'r' });
    const listar = (q: string) => http().get(`/api/v1/questoes?escopo=todas&${q}`).set('Authorization', prof.auth).expect(200);
    const vf = (await listar('formato=VERDADEIRO_FALSO')).body;
    expect(vf.total).toBe(1);
    expect(vf.itens[0]).toMatchObject({ formato: 'VERDADEIRO_FALSO', dificuldade: 'FACIL' });
    expect((await listar('dificuldade=DIFICIL')).body.total).toBe(1);
    expect((await listar('formato=DISSERTATIVA&dificuldade=FACIL')).body.total).toBe(0);
    const ruim = await http().get('/api/v1/questoes?formato=XYZ').set('Authorization', prof.auth).expect(400);
    expect(JSON.stringify(ruim.body.message)).toContain('Tipo de questão inválido');
  });
});

