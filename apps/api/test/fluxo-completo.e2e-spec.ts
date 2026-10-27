import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { ExecucaoService } from '../src/modules/aplicacao/execucao.service.js';
import { autenticar, criarApp, limparBanco } from './utilitarios.js';

/**
 * Ciclo completo do MVP (plano, Sprint 4):
 * Questão → Prova → Aplicação → Execução → Correção → Recurso → Relatório.
 */
describe('Fluxo completo — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
  });
  afterEach(() => app.close());

  async function cenario() {
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const revisor = await autenticar(app, prisma, 'PROFESSOR', { email: 'revisor@teste.local' });
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local', matricula: '111' });
    return { prof, revisor, aluno };
  }

  async function criarQuestaoPublicada(
    autor: string,
    revisor: string,
    corpo: Record<string, unknown>,
  ): Promise<{ id: string; versaoId: string }> {
    const { body } = await http().post('/api/v1/questoes').set('Authorization', autor).send(corpo).expect(201);
    await http()
      .post(`/api/v1/questoes/${body.id}/enviar-revisao`)
      .set('Authorization', autor)
      .send({ confirmarDuplicidade: true })
      .expect(200);
    await http().post(`/api/v1/questoes/${body.id}/aprovar`).set('Authorization', revisor).expect(200);
    const q = await http().get(`/api/v1/questoes/${body.id}`).set('Authorization', autor).expect(200);
    return { id: body.id, versaoId: q.body.versoes[0].id };
  }

  const fechada = {
    disciplina: 'Biologia',
    dificuldade: 'MEDIO',
    natureza: 'FECHADA',
    enunciado: 'Qual organela realiza a respiração celular?',
    alternativas: [{ texto: 'Ribossomo' }, { texto: 'Mitocôndria' }, { texto: 'Lisossomo' }],
    alternativaCorreta: 1,
  };
  const aberta = {
    disciplina: 'Biologia',
    dificuldade: 'DIFICIL',
    natureza: 'ABERTA',
    enunciado: 'Explique o papel do ATP no metabolismo.',
    rubrica: 'Citar armazenamento e transferência de energia.',
  };
  const parametros = {
    titulo: 'Avaliação de Biologia',
    visibilidade: 'PRIVADA',
    criterioAprovacao: { tipo: 'NOTA_MINIMA', valor: 6 },
    tempoLimiteMin: 30,
    tentativasPermitidas: 1,
    modoNavegacao: 'LIVRE',
    ordemQuestoes: 'FIXA',
  };

  describe('banco de questões (RF04)', () => {
    it('exige dupla checagem, alerta duplicidade e versiona questão publicada', async () => {
      const { prof, revisor } = await cenario();
      const { body: q } = await http().post('/api/v1/questoes').set('Authorization', prof.auth).send(fechada).expect(201);

      // Validação do conteúdo
      await http()
        .post('/api/v1/questoes')
        .set('Authorization', prof.auth)
        .send({ ...fechada, alternativas: [{ texto: 'só uma' }] })
        .expect(400);

      await http().post(`/api/v1/questoes/${q.id}/enviar-revisao`).set('Authorization', prof.auth).send({}).expect(200);
      // Autor não pode aprovar a própria questão
      await http().post(`/api/v1/questoes/${q.id}/aprovar`).set('Authorization', prof.auth).expect(403);
      // Revisor rejeita com comentário → volta a rascunho
      await http()
        .post(`/api/v1/questoes/${q.id}/rejeitar`)
        .set('Authorization', revisor.auth)
        .send({ comentario: 'Melhore o enunciado' })
        .expect(200);
      const rej = await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).expect(200);
      expect(rej.body).toMatchObject({ statusAtual: 'RASCUNHO', comentarioRevisao: 'Melhore o enunciado' });

      // Rascunho: edição no lugar (continua versão 1)
      await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).send(fechada).expect(200);
      await http().post(`/api/v1/questoes/${q.id}/enviar-revisao`).set('Authorization', prof.auth).send({}).expect(200);
      await http().post(`/api/v1/questoes/${q.id}/aprovar`).set('Authorization', revisor.auth).expect(200);

      // Duplicidade: questão quase igual exige confirmação
      const { body: dup } = await http()
        .post('/api/v1/questoes')
        .set('Authorization', prof.auth)
        .send({ ...fechada, enunciado: 'Qual organela realiza a respiração celular' })
        .expect(201);
      const alerta = await http()
        .post(`/api/v1/questoes/${dup.id}/enviar-revisao`)
        .set('Authorization', prof.auth)
        .send({})
        .expect(409);
      expect(alerta.body.codigo).toBe('POSSIVEL_DUPLICIDADE');
      expect(alerta.body.similares[0].id).toBe(q.id);

      // Publicada: edição gera nova versão e preserva a anterior
      await http()
        .put(`/api/v1/questoes/${q.id}`)
        .set('Authorization', prof.auth)
        .send({ ...fechada, enunciado: 'Qual organela produz ATP?' })
        .expect(200);
      const pub = await http().get(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).expect(200);
      expect(pub.body.statusAtual).toBe('PUBLICADA');
      expect(pub.body.versoes.map((v: { numeroVersao: number }) => v.numeroVersao)).toEqual([2, 1]);
      // Natureza não muda depois de publicada
      await http().put(`/api/v1/questoes/${q.id}`).set('Authorization', prof.auth).send(aberta).expect(400);
    });
  });

  describe('turmas (RF03)', () => {
    it('matricula individualmente, importa CSV com relatório de erros e desvincula preservando histórico', async () => {
      const { prof } = await cenario();
      const { body: turma } = await http()
        .post('/api/v1/turmas')
        .set('Authorization', prof.auth)
        .send({ nome: '1º Ano A', periodoInicio: '2026-08-01', periodoFim: '2026-12-20' })
        .expect(201);

      const novo = await http()
        .post(`/api/v1/turmas/${turma.id}/alunos`)
        .set('Authorization', prof.auth)
        .send({ nome: 'Carla', email: 'carla@teste.local', matricula: '222' })
        .expect(201);
      expect(novo.body.senhaTemporaria).toHaveLength(16);
      const existente = await http()
        .post(`/api/v1/turmas/${turma.id}/alunos`)
        .set('Authorization', prof.auth)
        .send({ nome: 'Aluno', email: 'aluno@teste.local' })
        .expect(201);
      expect(existente.body.senhaTemporaria).toBeNull();
      await http()
        .post(`/api/v1/turmas/${turma.id}/alunos`)
        .set('Authorization', prof.auth)
        .send({ nome: 'Aluno', email: 'aluno@teste.local' })
        .expect(409);
      // Professor não pode virar "aluno"
      await http()
        .post(`/api/v1/turmas/${turma.id}/alunos`)
        .set('Authorization', prof.auth)
        .send({ nome: 'X', email: 'prof@teste.local' })
        .expect(400);

      const csv = [
        'nome;email;matricula',
        'Diego;diego@teste.local;333',
        ';semnome@teste.local;',
        'Eva;email-invalido;',
        'Diego de novo;diego@teste.local;',
        'Carla;carla@teste.local;222',
        'Fábio;fabio@teste.local;111',
        'Gil;gil@teste.local;333',
      ].join('\n');
      const imp = await http()
        .post(`/api/v1/turmas/${turma.id}/importacao`)
        .set('Authorization', prof.auth)
        .send({ conteudo: csv })
        .expect(200);
      expect(imp.body).toMatchObject({ totalLinhas: 7, matriculados: 1, jaMatriculados: 1 });
      expect(imp.body.criados.map((c: { email: string }) => c.email)).toEqual(['diego@teste.local']);
      expect(imp.body.erros.map((e: { linha: number }) => e.linha)).toEqual([3, 4, 5, 7, 8]);
      // Matrícula repetida no próprio arquivo é barrada antes de processar (linhas em paralelo)
      expect(imp.body.erros.find((e: { linha: number }) => e.linha === 8).mensagem).toBe('Matrícula repetida no arquivo: 333');
      // Matrícula de outra pessoa: o erro não expõe o e-mail dela (BUG-051)
      expect(imp.body.erros.find((e: { linha: number }) => e.linha === 7).mensagem).toBe('A matrícula 111 já está em uso por outra conta');

      const det = await http().get(`/api/v1/turmas/${turma.id}`).set('Authorization', prof.auth).expect(200);
      expect(det.body.alunos).toHaveLength(3);

      const carla = det.body.alunos.find((a: { email: string }) => a.email === 'carla@teste.local');
      await http().delete(`/api/v1/turmas/${turma.id}/alunos/${carla.id}`).set('Authorization', prof.auth).expect(204);
      expect(await prisma.matricula.count({ where: { turmaId: turma.id } })).toBe(3); // vínculo preservado
      const depois = await http().get(`/api/v1/turmas/${turma.id}`).set('Authorization', prof.auth).expect(200);
      expect(depois.body.alunos).toHaveLength(2);
    });

    it('aceita CSV grande (centenas de linhas) no corpo da requisição', async () => {
      const { prof } = await cenario();
      const { body: turma } = await http()
        .post('/api/v1/turmas')
        .set('Authorization', prof.auth)
        .send({ nome: 'Grande', periodoInicio: '2026-08-01', periodoFim: '2026-12-20' })
        .expect(201);
      const linhas = ['nome,email', ...Array.from({ length: 900 }, (_, i) => `Aluno com um nome propositalmente bem comprido para o teste número ${i},aluno.${i}@uma-instituicao-de-ensino-superior.edu.br`)];
      expect(linhas.join('\n').length).toBeGreaterThan(100_000);
      const imp = await http()
        .post(`/api/v1/turmas/${turma.id}/importacao`)
        .set('Authorization', prof.auth)
        .send({ conteudo: linhas.join('\n') })
        .expect(200);
      expect(imp.body.matriculados).toBe(900);
    }, 120_000);
  });

  it('ciclo: compõe, publica, aplica, executa, corrige, contesta, anula e gera relatório', async () => {
    const { prof, revisor, aluno } = await cenario();
    const q1 = await criarQuestaoPublicada(prof.auth, revisor.auth, fechada);
    const q2 = await criarQuestaoPublicada(prof.auth, revisor.auth, aberta);

    // ---- Prova (RF05)
    const { body: prova } = await http().post('/api/v1/provas').set('Authorization', prof.auth).send(parametros).expect(201);
    await http()
      .put(`/api/v1/provas/${prova.id}/questoes`)
      .set('Authorization', prof.auth)
      .send({ itens: [{ versaoQuestaoId: q1.versaoId, peso: 60 }, { versaoQuestaoId: q2.versaoId, peso: 30 }] })
      .expect(200);
    const pesoErrado = await http().post(`/api/v1/provas/${prova.id}/publicar`).set('Authorization', prof.auth).expect(400);
    expect(pesoErrado.body.codigo).toBe('PESO_INVALIDO');
    await http()
      .put(`/api/v1/provas/${prova.id}/questoes`)
      .set('Authorization', prof.auth)
      .send({ itens: [{ versaoQuestaoId: q1.versaoId, peso: 60 }, { versaoQuestaoId: q2.versaoId, peso: 40 }] })
      .expect(200);
    await http().post(`/api/v1/provas/${prova.id}/publicar`).set('Authorization', prof.auth).expect(200);
    await http().put(`/api/v1/provas/${prova.id}`).set('Authorization', prof.auth).send(parametros).expect(409);

    // ---- Turma e aplicação (RF06)
    const { body: turma } = await http()
      .post('/api/v1/turmas')
      .set('Authorization', prof.auth)
      .send({ nome: 'Turma', periodoInicio: '2026-08-01', periodoFim: '2026-12-20' })
      .expect(201);
    await http()
      .post(`/api/v1/turmas/${turma.id}/alunos`)
      .set('Authorization', prof.auth)
      .send({ nome: 'Aluno', email: 'aluno@teste.local' })
      .expect(201);
    const agora = Date.now();
    const { body: aplicacao } = await http()
      .post('/api/v1/aplicacoes')
      .set('Authorization', prof.auth)
      .send({
        provaId: prova.id,
        destinoTipo: 'TURMA',
        turmaId: turma.id,
        janelaInicio: new Date(agora - 60_000).toISOString(),
        janelaFim: new Date(agora + 3_600_000).toISOString(),
      })
      .expect(201);
    expect(aplicacao.pinAcesso).toBeNull();
    // Prova privada não pode ser aplicada por PIN
    await http()
      .post('/api/v1/aplicacoes')
      .set('Authorization', prof.auth)
      .send({
        provaId: prova.id,
        destinoTipo: 'PUBLICO',
        janelaInicio: new Date(agora).toISOString(),
        janelaFim: new Date(agora + 3_600_000).toISOString(),
      })
      .expect(400);

    // Aluno recebe notificação e vê a prova disponível
    const notif = await http().get('/api/v1/notificacoes').set('Authorization', aluno.auth).expect(200);
    expect(notif.body.itens[0].tipo).toBe('PROVA_DISPONIVEL');
    const lista = await http().get('/api/v1/aluno/aplicacoes').set('Authorization', aluno.auth).expect(200);
    expect(lista.body[0]).toMatchObject({ aplicacaoId: aplicacao.id, situacao: 'DISPONIVEL', podeIniciar: true });

    // ---- Execução: início idempotente, sem gabarito, autosave e envio idempotente
    const ini1 = await http().post(`/api/v1/aluno/aplicacoes/${aplicacao.id}/iniciar`).set('Authorization', aluno.auth).expect(200);
    const ini2 = await http().post(`/api/v1/aluno/aplicacoes/${aplicacao.id}/iniciar`).set('Authorization', aluno.auth).expect(200);
    expect(ini2.body.tentativaId).toBe(ini1.body.tentativaId);
    const tId = ini1.body.tentativaId;

    const exec = await http().get(`/api/v1/aluno/tentativas/${tId}`).set('Authorization', aluno.auth).expect(200);
    expect(JSON.stringify(exec.body)).not.toContain('gabarito');
    expect(new Date(exec.body.tentativa.prazoEm).getTime() - new Date(exec.body.tentativa.inicioEm).getTime()).toBe(30 * 60_000);

    // Outro aluno não acessa a tentativa
    const intruso = await autenticar(app, prisma, 'ALUNO', { email: 'intruso@teste.local' });
    await http().get(`/api/v1/aluno/tentativas/${tId}`).set('Authorization', intruso.auth).expect(404);
    await http().post(`/api/v1/aluno/aplicacoes/${aplicacao.id}/iniciar`).set('Authorization', intruso.auth).expect(404);

    // Sem abrir a sessão de execução, nada é gravado (sessão única — RF06)
    await http()
      .put(`/api/v1/aluno/tentativas/${tId}/respostas/${q1.versaoId}`)
      .set('Authorization', aluno.auth)
      .send({ alternativaId: 'A' })
      .expect(409);
    const { body: s1 } = await http().post(`/api/v1/aluno/tentativas/${tId}/sessao`).set('Authorization', aluno.auth).expect(200);
    const sessao = s1.sessaoExecucao as string;
    const salvar = (vq: string, valor: object) =>
      http()
        .put(`/api/v1/aluno/tentativas/${tId}/respostas/${vq}`)
        .set('Authorization', aluno.auth)
        .set('X-Sessao-Execucao', sessao)
        .send(valor);
    await salvar(q1.versaoId, { alternativaId: 'Z' }).expect(400);
    await salvar(q1.versaoId, { alternativaId: 'A' }).expect(200);
    await salvar(q1.versaoId, { alternativaId: 'B' }).expect(200); // muda de ideia (autosave = upsert)
    await salvar(q2.versaoId, { texto: 'O ATP armazena energia.' }).expect(200);

    const [env1, env2] = await Promise.all([
      http().post(`/api/v1/aluno/tentativas/${tId}/enviar`).set('Authorization', aluno.auth).set('X-Sessao-Execucao', sessao),
      http().post(`/api/v1/aluno/tentativas/${tId}/enviar`).set('Authorization', aluno.auth).set('X-Sessao-Execucao', sessao),
    ]);
    expect(env1.status).toBe(200);
    expect(env2.status).toBe(200);
    expect(env1.body.codigo).toBe(env2.body.codigo); // duplo clique não gera dois registros
    expect(env1.body).toMatchObject({ status: 'ENVIADA', respostasRegistradas: 2, totalQuestoes: 2, resultado: { pendente: true } });
    expect(await prisma.nota.count()).toBe(1);
    await salvar(q1.versaoId, { alternativaId: 'A' }).expect(409);

    // ---- Correção (RF07): fechada automática, aberta na fila, nota provisória
    const fila = await http().get('/api/v1/correcao/pendentes').set('Authorization', prof.auth).expect(200);
    expect(fila.body).toHaveLength(1);
    const notaId = fila.body[0].notaId;
    const det = await http().get(`/api/v1/correcao/notas/${notaId}`).set('Authorization', prof.auth).expect(200);
    expect(det.body).toMatchObject({ status: 'PENDENTE_CORRECAO_MANUAL', notaProvisoria: '6', notaFinal: null });
    // Professor que não é dono da prova não vê
    await http().get(`/api/v1/correcao/notas/${notaId}`).set('Authorization', revisor.auth).expect(404);

    await http()
      .post(`/api/v1/correcao/notas/${notaId}/questoes/${q2.versaoId}`)
      .set('Authorization', prof.auth)
      .send({ percentual: 50, feedback: 'Faltou citar a transferência de energia.' })
      .expect(201);
    const corrigida = await http().get(`/api/v1/correcao/notas/${notaId}`).set('Authorization', prof.auth).expect(200);
    expect(corrigida.body).toMatchObject({ status: 'CONSOLIDADA', notaFinal: '8', statusAprovacao: 'APROVADO' });
    await http()
      .post(`/api/v1/correcao/notas/${notaId}/questoes/${q2.versaoId}`)
      .set('Authorization', prof.auth)
      .send({ percentual: 100 })
      .expect(409);

    // Aluno vê o resultado (sem gabarito) e foi notificado
    const res = await http().get(`/api/v1/aluno/resultados/${notaId}`).set('Authorization', aluno.auth).expect(200);
    expect(res.body.notaFinal).toBe('8');
    // Política padrão (NUNCA): campos de gabarito existem, mas vazios (ADR-0035)
    expect(res.body).toMatchObject({ exibirGabarito: 'NUNCA', gabaritoVisivel: false });
    expect(res.body.questoes.every((q: { gabarito: unknown; rubrica: unknown }) => q.gabarito === null && q.rubrica === null)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('criterios');
    const notif2 = await http().get('/api/v1/notificacoes').set('Authorization', aluno.auth).expect(200);
    expect(notif2.body.itens.map((n: { tipo: string }) => n.tipo)).toContain('RESULTADO_PUBLICADO');

    // ---- Recurso (RF08): anulação com "pontuar a todos" reprocessa a nota
    const { body: recurso } = await http()
      .post('/api/v1/aluno/recursos')
      .set('Authorization', aluno.auth)
      .send({ notaId, versaoQuestaoId: q2.versaoId, justificativa: 'O enunciado estava ambíguo.' })
      .expect(201);
    await http()
      .post('/api/v1/aluno/recursos')
      .set('Authorization', aluno.auth)
      .send({ notaId, versaoQuestaoId: q2.versaoId, justificativa: 'De novo' })
      .expect(409);
    await http().post(`/api/v1/recursos/${recurso.id}/analisar`).set('Authorization', prof.auth).expect(200);
    await http()
      .post(`/api/v1/recursos/${recurso.id}/decidir`)
      .set('Authorization', prof.auth)
      .send({ deferido: true, decisao: 'Enunciado ambíguo; questão anulada.', efeito: 'ANULACAO', politica: 'PONTUAR_TODOS' })
      .expect(200);
    const reproc = await http().get(`/api/v1/aluno/resultados/${notaId}`).set('Authorization', aluno.auth).expect(200);
    expect(reproc.body.notaFinal).toBe('10');
    const meus = await http().get('/api/v1/aluno/recursos').set('Authorization', aluno.auth).expect(200);
    expect(meus.body[0]).toMatchObject({ status: 'DEFERIDO', efeito: 'ANULACAO_PONTUAR_TODOS', questaoOrdem: 2 });

    // ---- Relatórios (RF09) e CSV
    const rel = await http().get(`/api/v1/relatorios/provas/${prova.id}`).set('Authorization', prof.auth).expect(200);
    expect(rel.body.resumo).toMatchObject({ participantes: 1, consolidadas: 1, media: 10, taxaAprovacao: 100 });
    expect(rel.body.questoes[1]).toMatchObject({ anulada: true });
    const csv = await http().get(`/api/v1/relatorios/provas/${prova.id}/csv`).set('Authorization', prof.auth).expect(200);
    expect(csv.headers['content-disposition']).toContain('relatorio-avaliacao-de-biologia.csv');
    expect(csv.text).toContain('Usuário ALUNO;aluno@teste.local;1;Consolidada;10;Aprovado');
    const relTurma = await http().get(`/api/v1/relatorios/turmas/${turma.id}`).set('Authorization', prof.auth).expect(200);
    expect(relTurma.body.alunos[0]).toMatchObject({ provasRealizadas: 1, media: 10 });

    // ---- Acompanhamento da aplicação
    const acomp = await http().get(`/api/v1/aplicacoes/${aplicacao.id}`).set('Authorization', prof.auth).expect(200);
    expect(acomp.body.participantes[0].tentativas[0]).toMatchObject({ status: 'ENVIADA', nota: { status: 'CONSOLIDADA' } });

    // ---- Auditoria imutável (RF11)
    const eventos = await prisma.eventoAuditoria.findMany({ where: { recursoId: recurso.id } });
    expect(eventos.map((e) => e.acao).sort()).toEqual(['RECURSO_ABERTO', 'RECURSO_DEFERIDO']);
    await expect(prisma.eventoAuditoria.deleteMany({ where: { id: eventos[0]!.id } })).rejects.toThrow();
  });

  it('expira por tempo no servidor, envia automaticamente e permite reabertura administrativa', async () => {
    const { prof, revisor, aluno } = await cenario();
    const coord = await autenticar(app, prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    const q1 = await criarQuestaoPublicada(prof.auth, revisor.auth, fechada);
    const { body: prova } = await http().post('/api/v1/provas').set('Authorization', prof.auth).send(parametros).expect(201);
    await http()
      .put(`/api/v1/provas/${prova.id}/questoes`)
      .set('Authorization', prof.auth)
      .send({ itens: [{ versaoQuestaoId: q1.versaoId, peso: 100 }] })
      .expect(200);
    await http().post(`/api/v1/provas/${prova.id}/publicar`).set('Authorization', prof.auth).expect(200);
    const { body: turma } = await http()
      .post('/api/v1/turmas')
      .set('Authorization', prof.auth)
      .send({ nome: 'T', periodoInicio: '2026-01-01', periodoFim: '2026-12-31' })
      .expect(201);
    await http().post(`/api/v1/turmas/${turma.id}/alunos`).set('Authorization', prof.auth).send({ nome: 'A', email: 'aluno@teste.local' }).expect(201);
    const { body: aplicacao } = await http()
      .post('/api/v1/aplicacoes')
      .set('Authorization', prof.auth)
      .send({
        provaId: prova.id,
        destinoTipo: 'TURMA',
        turmaId: turma.id,
        janelaInicio: new Date(Date.now() - 60_000).toISOString(),
        janelaFim: new Date(Date.now() + 3_600_000).toISOString(),
      })
      .expect(201);

    const { body: ini } = await http().post(`/api/v1/aluno/aplicacoes/${aplicacao.id}/iniciar`).set('Authorization', aluno.auth).expect(200);
    const abrir = async () =>
      (await http().post(`/api/v1/aluno/tentativas/${ini.tentativaId}/sessao`).set('Authorization', aluno.auth).expect(200)).body
        .sessaoExecucao as string;
    let sessao = await abrir();
    await http()
      .put(`/api/v1/aluno/tentativas/${ini.tentativaId}/respostas/${q1.versaoId}`)
      .set('Authorization', aluno.auth)
      .set('X-Sessao-Execucao', sessao)
      .send({ alternativaId: 'B' })
      .expect(200);

    // Simula o tempo esgotado (o aluno "desconectou" e não voltou)
    await prisma.tentativa.update({ where: { id: ini.tentativaId }, data: { prazoEm: new Date(Date.now() - 60_000) } });
    expect(await app.get(ExecucaoService).finalizarExpiradas()).toBe(1);

    const t = await prisma.tentativa.findUniqueOrThrow({ where: { id: ini.tentativaId } });
    expect(t.status).toBe('EXPIRADA');
    const atrasado = await http()
      .put(`/api/v1/aluno/tentativas/${ini.tentativaId}/respostas/${q1.versaoId}`)
      .set('Authorization', aluno.auth)
      .set('X-Sessao-Execucao', sessao)
      .send({ alternativaId: 'A' })
      .expect(409);
    expect(atrasado.body.codigo).toBe('TENTATIVA_ENCERRADA');
    // Respostas já salvas foram enviadas e corrigidas
    const nota = await prisma.nota.findUniqueOrThrow({ where: { tentativaId: ini.tentativaId } });
    expect(Number(nota.notaFinal)).toBe(10);

    // Sem tentativas restantes
    await http().post(`/api/v1/aluno/aplicacoes/${aplicacao.id}/iniciar`).set('Authorization', aluno.auth).expect(409);

    // Reabertura: professor não pode; coordenação pode, com justificativa
    const corpo = { justificativa: 'Queda de energia no laboratório', minutos: 15 };
    await http().post(`/api/v1/aplicacoes/tentativas/${ini.tentativaId}/reabrir`).set('Authorization', prof.auth).send(corpo).expect(403);
    // Corretor com a permissão delegada não alcança provas fora do escopo do papel (ADR-0021/0033)
    const corretor = await autenticar(app, prisma, 'CORRETOR', { email: 'corretor.reabrir@teste.local' });
    await http().put(`/api/v1/permissoes/usuarios/${corretor.usuario.id}/REABRIR_TENTATIVAS`).set('Authorization', coord.auth)
      .send({ justificativa: 'Apoio na aplicação' }).expect(200);
    await http().post(`/api/v1/aplicacoes/tentativas/${ini.tentativaId}/reabrir`).set('Authorization', corretor.auth).send(corpo).expect(404);
    expect(await prisma.nota.count({ where: { tentativaId: ini.tentativaId } })).toBe(1);
    await http().post(`/api/v1/aplicacoes/tentativas/${ini.tentativaId}/reabrir`).set('Authorization', coord.auth).send(corpo).expect(200);
    expect(await prisma.nota.count({ where: { tentativaId: ini.tentativaId } })).toBe(0);

    const retomada = await http().post(`/api/v1/aluno/aplicacoes/${aplicacao.id}/iniciar`).set('Authorization', aluno.auth).expect(200);
    expect(retomada.body.tentativaId).toBe(ini.tentativaId);
    sessao = await abrir(); // reabertura limpa a sessão anterior
    await http()
      .put(`/api/v1/aluno/tentativas/${ini.tentativaId}/respostas/${q1.versaoId}`)
      .set('Authorization', aluno.auth)
      .set('X-Sessao-Execucao', sessao)
      .send({ alternativaId: 'A' })
      .expect(200);
    const env = await http()
      .post(`/api/v1/aluno/tentativas/${ini.tentativaId}/enviar`)
      .set('Authorization', aluno.auth)
      .set('X-Sessao-Execucao', sessao)
      .expect(200);
    expect(env.body.resultado).toMatchObject({ notaFinal: '0', statusAprovacao: 'REPROVADO' });

    const evento = await prisma.eventoAuditoria.findFirst({ where: { acao: 'TENTATIVA_REABERTA', recursoId: ini.tentativaId } });
    expect(evento?.justificativa).toBe('Queda de energia no laboratório');
  });

  it('sessão única: abrir em outro dispositivo assume a prova e invalida o anterior', async () => {
    const { prof, revisor, aluno } = await cenario();
    const q1 = await criarQuestaoPublicada(prof.auth, revisor.auth, fechada);
    const { body: prova } = await http().post('/api/v1/provas').set('Authorization', prof.auth).send(parametros).expect(201);
    await http()
      .put(`/api/v1/provas/${prova.id}/questoes`)
      .set('Authorization', prof.auth)
      .send({ itens: [{ versaoQuestaoId: q1.versaoId, peso: 100 }] })
      .expect(200);
    await http().post(`/api/v1/provas/${prova.id}/publicar`).set('Authorization', prof.auth).expect(200);
    const { body: turma } = await http()
      .post('/api/v1/turmas')
      .set('Authorization', prof.auth)
      .send({ nome: 'T', periodoInicio: '2026-01-01', periodoFim: '2026-12-31' })
      .expect(201);
    await http().post(`/api/v1/turmas/${turma.id}/alunos`).set('Authorization', prof.auth).send({ nome: 'A', email: 'aluno@teste.local' }).expect(201);
    const { body: aplicacao } = await http()
      .post('/api/v1/aplicacoes')
      .set('Authorization', prof.auth)
      .send({
        provaId: prova.id,
        destinoTipo: 'TURMA',
        turmaId: turma.id,
        janelaInicio: new Date(Date.now() - 60_000).toISOString(),
        janelaFim: new Date(Date.now() + 3_600_000).toISOString(),
      })
      .expect(201);
    const { body: ini } = await http().post(`/api/v1/aluno/aplicacoes/${aplicacao.id}/iniciar`).set('Authorization', aluno.auth).expect(200);
    const url = `/api/v1/aluno/tentativas/${ini.tentativaId}`;
    const abrir = async () => (await http().post(`${url}/sessao`).set('Authorization', aluno.auth).expect(200)).body.sessaoExecucao as string;
    const salvar = (sessao: string) =>
      http().put(`${url}/respostas/${q1.versaoId}`).set('Authorization', aluno.auth).set('X-Sessao-Execucao', sessao).send({ alternativaId: 'A' });

    const notebook = await abrir();
    await salvar(notebook).expect(200);
    const celular = await abrir(); // aluno abre no celular
    const r = await salvar(notebook).expect(409);
    expect(r.body.codigo).toBe('SESSAO_SUBSTITUIDA');
    await http().post(`${url}/enviar`).set('Authorization', aluno.auth).set('X-Sessao-Execucao', notebook).expect(409);
    await salvar(celular).expect(200);

    const acomp = await http().get(`/api/v1/aplicacoes/${aplicacao.id}`).set('Authorization', prof.auth).expect(200);
    expect(acomp.body.participantes[0].tentativas[0].trocasSessao).toBe(1);
    expect(await prisma.eventoAuditoria.count({ where: { acao: 'TENTATIVA_SESSAO_ASSUMIDA', recursoId: ini.tentativaId } })).toBe(1);
  });

  it('prova pública por PIN com identificação mínima (resultado não certificado)', async () => {
    const { prof, revisor } = await cenario();
    const q1 = await criarQuestaoPublicada(prof.auth, revisor.auth, fechada);
    const { body: prova } = await http()
      .post('/api/v1/provas')
      .set('Authorization', prof.auth)
      .send({ ...parametros, visibilidade: 'PUBLICA', modoNavegacao: 'SEQUENCIAL', tempoLimiteMin: null })
      .expect(201);
    await http()
      .put(`/api/v1/provas/${prova.id}/questoes`)
      .set('Authorization', prof.auth)
      .send({ itens: [{ versaoQuestaoId: q1.versaoId, peso: 100 }] })
      .expect(200);
    await http().post(`/api/v1/provas/${prova.id}/publicar`).set('Authorization', prof.auth).expect(200);
    const { body: aplicacao } = await http()
      .post('/api/v1/aplicacoes')
      .set('Authorization', prof.auth)
      .send({
        provaId: prova.id,
        destinoTipo: 'PUBLICO',
        janelaInicio: new Date(Date.now() - 60_000).toISOString(),
        janelaFim: new Date(Date.now() + 3_600_000).toISOString(),
      })
      .expect(201);
    const pin: string = aplicacao.pinAcesso;
    expect(pin).toMatch(/^[A-Z2-9]{8}$/);

    await http().get('/api/v1/publico/aplicacoes/ZZZZZZZZ').expect(404);
    const info = await http().get(`/api/v1/publico/aplicacoes/${pin.toLowerCase()}`).expect(200);
    expect(info.body).toMatchObject({ titulo: 'Avaliação de Biologia', situacao: 'DISPONIVEL', certificado: false });

    const { body: ini } = await http()
      .post(`/api/v1/publico/aplicacoes/${pin}/iniciar`)
      .send({ nome: 'Visitante', email: 'Visitante@Externo.com' })
      .expect(200);
    const auth = `Bearer ${ini.token}`;
    // Mesmo e-mail com tentativa em andamento não "sequestra" a prova de outro navegador
    await http().post(`/api/v1/publico/aplicacoes/${pin}/iniciar`).send({ nome: 'Outro', email: 'visitante@externo.com' }).expect(409);
    // Token do participante não serve para outra tentativa nem para a área do aluno
    await http().get(`/api/v1/publico/tentativas/${ini.tentativaId}`).expect(401);
    await http().get('/api/v1/aluno/aplicacoes').set('Authorization', auth).expect(401);

    const { body: sp } = await http().post(`/api/v1/publico/tentativas/${ini.tentativaId}/sessao`).set('Authorization', auth).expect(200);
    await http()
      .put(`/api/v1/publico/tentativas/${ini.tentativaId}/respostas/${q1.versaoId}`)
      .set('Authorization', auth)
      .set('X-Sessao-Execucao', sp.sessaoExecucao)
      .send({ alternativaId: 'B' })
      .expect(200);
    const comp = await http()
      .post(`/api/v1/publico/tentativas/${ini.tentativaId}/enviar`)
      .set('Authorization', auth)
      .set('X-Sessao-Execucao', sp.sessaoExecucao)
      .expect(200);
    expect(comp.body).toMatchObject({
      participanteNome: 'Visitante',
      participanteEmail: 'visitante@externo.com',
      certificado: false,
      resultado: { notaFinal: '10' },
    });
    const nota = await prisma.nota.findFirstOrThrow({ where: { tentativaId: ini.tentativaId } });
    expect(nota.certificado).toBe(false);
  });
});
