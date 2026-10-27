import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

/** Atalhos de cenário para os testes e2e do lote 6 (questão → prova → aplicação → execução). */
export function cenarios(app: () => INestApplication) {
  const http = () => request(app().getHttpServer());

  async function questaoPublicada(autor: string, revisor: string, corpo: Record<string, unknown>) {
    const { body } = await http().post('/api/v1/questoes').set('Authorization', autor).send(corpo).expect(201);
    await http()
      .post(`/api/v1/questoes/${body.id}/enviar-revisao`)
      .set('Authorization', autor)
      .send({ confirmarDuplicidade: true })
      .expect(200);
    await http().post(`/api/v1/questoes/${body.id}/aprovar`).set('Authorization', revisor).expect(200);
    const q = await http().get(`/api/v1/questoes/${body.id}`).set('Authorization', autor).expect(200);
    return { id: body.id as string, versaoId: q.body.versoes[0].id as string };
  }

  async function provaPublicada(autor: string, itens: { versaoQuestaoId: string; peso: number }[], extras: Record<string, unknown> = {}) {
    const { body: prova } = await http()
      .post('/api/v1/provas')
      .set('Authorization', autor)
      .send({
        titulo: 'Prova do lote 6',
        visibilidade: 'PRIVADA',
        criterioAprovacao: { tipo: 'NOTA_MINIMA', valor: 6 },
        tempoLimiteMin: 30,
        tentativasPermitidas: 1,
        modoNavegacao: 'LIVRE',
        ordemQuestoes: 'FIXA',
        ...extras,
      })
      .expect(201);
    await http().put(`/api/v1/provas/${prova.id}/questoes`).set('Authorization', autor).send({ itens }).expect(200);
    await http().post(`/api/v1/provas/${prova.id}/publicar`).set('Authorization', autor).expect(200);
    return prova.id as string;
  }

  async function turmaCom(autor: string, alunosEmails: string[], nome = 'Turma') {
    const { body: turma } = await http()
      .post('/api/v1/turmas')
      .set('Authorization', autor)
      .send({ nome, periodoInicio: '2026-01-01', periodoFim: '2026-12-31' })
      .expect(201);
    for (const email of alunosEmails) {
      await http().post(`/api/v1/turmas/${turma.id}/alunos`).set('Authorization', autor).send({ nome: email, email }).expect(201);
    }
    return turma.id as string;
  }

  async function aplicar(autor: string, provaId: string, turmaId: string, janela: { inicio?: number; fim?: number } = {}) {
    const agora = Date.now();
    const { body } = await http()
      .post('/api/v1/aplicacoes')
      .set('Authorization', autor)
      .send({
        provaId,
        destinoTipo: 'TURMA',
        turmaId,
        janelaInicio: new Date(janela.inicio ?? agora - 60_000).toISOString(),
        janelaFim: new Date(janela.fim ?? agora + 3_600_000).toISOString(),
      })
      .expect(201);
    return body.id as string;
  }

  /** Inicia, abre a sessão de execução e devolve funções para responder e enviar. */
  async function executar(aluno: string, aplicacaoId: string) {
    const ini = await http().post(`/api/v1/aluno/aplicacoes/${aplicacaoId}/iniciar`).set('Authorization', aluno).expect(200);
    const tentativaId = ini.body.tentativaId as string;
    const { body: s } = await http().post(`/api/v1/aluno/tentativas/${tentativaId}/sessao`).set('Authorization', aluno).expect(200);
    const sessao = s.sessaoExecucao as string;
    return {
      tentativaId,
      responder: (versaoId: string, valor: object) =>
        http()
          .put(`/api/v1/aluno/tentativas/${tentativaId}/respostas/${versaoId}`)
          .set('Authorization', aluno)
          .set('X-Sessao-Execucao', sessao)
          .send(valor),
      enviar: () =>
        http().post(`/api/v1/aluno/tentativas/${tentativaId}/enviar`).set('Authorization', aluno).set('X-Sessao-Execucao', sessao).expect(200),
    };
  }

  return { http, questaoPublicada, provaPublicada, turmaCom, aplicar, executar };
}
