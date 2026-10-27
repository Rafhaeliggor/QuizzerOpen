import { indicios, porDisciplina, porQuestao, resumo, ultimasTentativas, type NotaRelatorio } from './agregacao.js';

const nota = (p: Partial<NotaRelatorio>): NotaRelatorio => ({
  id: 'n',
  provaId: 'p',
  provaTitulo: 'P',
  usuarioId: null,
  participanteNome: 'X',
  participanteEmail: 'x@x',
  tentativaNumero: 1,
  certificado: true,
  inicioEm: new Date('2026-10-10T10:00:00Z'),
  fimEm: new Date('2026-10-10T10:30:00Z'),
  status: 'CONSOLIDADA',
  notaFinal: 8,
  notaProvisoria: 8,
  statusAprovacao: 'APROVADO',
  questoes: [],
  ...p,
});

describe('relatórios — agregação', () => {
  it('resumo: média, mediana, aprovação, tempo e distribuição', () => {
    const r = resumo([
      nota({ notaFinal: 8 }),
      nota({ notaFinal: 4, statusAprovacao: 'REPROVADO' }),
      nota({ notaFinal: 10 }),
      nota({ status: 'PENDENTE_CORRECAO_MANUAL', notaFinal: null, statusAprovacao: null }),
    ]);
    expect(r).toMatchObject({
      participantes: 4,
      consolidadas: 3,
      pendentes: 1,
      media: 7.33,
      mediana: 8,
      minima: 4,
      maxima: 10,
      aprovados: 2,
      taxaAprovacao: 66.67,
      tempoMedioMin: 30,
    });
    expect(r.distribuicao.map((d) => d.quantidade)).toEqual([0, 0, 1, 0, 2]);
  });

  it('taxa de acerto por questão ignora as ainda não corrigidas', () => {
    const q = (fracao: number | null) => ({ versaoQuestaoId: 'v', ordem: 1, natureza: 'ABERTA', peso: 50, enunciado: 'E', fracao });
    const r = porQuestao([nota({ questoes: [q(1)] }), nota({ questoes: [q(0.5)] }), nota({ questoes: [q(null)] })], new Set());
    expect(r[0]).toMatchObject({ corrigidas: 2, taxaAcerto: 75, anulada: false });
  });

  it('usa apenas a última tentativa de cada participante', () => {
    const r = ultimasTentativas([
      nota({ id: 'a', tentativaNumero: 1 }),
      nota({ id: 'b', tentativaNumero: 2 }),
      nota({ id: 'c', participanteEmail: 'y@y' }),
    ]);
    expect(r.map((n) => n.id).sort()).toEqual(['b', 'c']);
  });

  it('agrupa pelo aluno, não pelo e-mail; anonimizadas não se fundem', () => {
    const r = ultimasTentativas([
      // mesmo aluno com e-mail trocado entre as tentativas: conta uma vez só
      nota({ id: 'a1', usuarioId: 'u1', participanteEmail: 'velho@x', tentativaNumero: 1 }),
      nota({ id: 'a2', usuarioId: 'u1', participanteEmail: 'novo@x', tentativaNumero: 2 }),
      // dois titulares anonimizados (sem usuário e sem e-mail): continuam duas linhas
      nota({ id: 'z1', usuarioId: null, participanteEmail: '' }),
      nota({ id: 'z2', usuarioId: null, participanteEmail: '' }),
      // externo: por aplicação + e-mail
      nota({ id: 'e1', aplicacaoId: 'ap', participanteEmail: 'Ext@x', tentativaNumero: 1 }),
      nota({ id: 'e2', aplicacaoId: 'ap', participanteEmail: 'ext@x', tentativaNumero: 2 }),
    ]);
    expect(r.map((n) => n.id).sort()).toEqual(['a2', 'e2', 'z1', 'z2']);
  });
});

describe('relatórios — por disciplina (lote 6)', () => {
  const q = (versaoQuestaoId: string, disciplina: string | undefined, fracao: number | null) => ({
    versaoQuestaoId,
    ordem: 1,
    natureza: 'FECHADA',
    disciplina,
    peso: 50,
    enunciado: 'e',
    fracao,
  });

  it('média da fração por disciplina, ignora pendentes e anuladas', () => {
    const r = porDisciplina(
      [
        nota({ participanteEmail: 'a@x', questoes: [q('v1', 'Biologia', 1), q('v2', 'Química', 0), q('v3', 'Química', null)] }),
        nota({ participanteEmail: 'b@x', questoes: [q('v1', 'Biologia', 0.5), q('v2', 'Química', 1), q('v4', 'Física', 1)] }),
      ],
      new Set(['p|v4', 'outra-prova|v1']), // anulação de outra prova não afeta esta
    );
    expect(r).toEqual([
      { disciplina: 'Biologia', questoesCorrigidas: 2, participantes: 2, taxaAcerto: 75 },
      { disciplina: 'Química', questoesCorrigidas: 2, participantes: 2, taxaAcerto: 50 },
    ]);
  });

  it('notas antigas sem disciplina entram em "Sem disciplina"', () => {
    expect(porDisciplina([nota({ questoes: [q('v1', undefined, 1)] })])[0]!.disciplina).toBe('Sem disciplina');
  });
});

describe('relatórios — indícios para revisão (lote 7)', () => {
  const q = (id: string, resposta: unknown, fracao: number) => ({
    versaoQuestaoId: id, ordem: 1, natureza: 'FECHADA', peso: 10, enunciado: 'e', fracao, resposta,
  });
  const comDuracao = (p: Partial<NotaRelatorio>, minutos: number) =>
    nota({ ...p, inicioEm: new Date('2026-10-10T10:00:00Z'), fimEm: new Date(Date.parse('2026-10-10T10:00:00Z') + minutos * 60_000) });

  it('sinaliza envio muito rápido, saídas, trocas e erros idênticos', () => {
    const erradas = [q('1', { alternativaId: 'B' }, 0), q('2', { alternativaId: 'C' }, 0), q('3', { alternativaId: 'D' }, 0)];
    const notas = [
      comDuracao({ id: 'a', participanteNome: 'Ana', participanteEmail: 'a@x', tentativaId: 'ta', questoes: erradas }, 3),
      comDuracao({ id: 'b', participanteNome: 'Bia', participanteEmail: 'b@x', tentativaId: 'tb', questoes: erradas }, 30),
      comDuracao({ id: 'c', participanteNome: 'Caio', participanteEmail: 'c@x', tentativaId: 'tc' }, 30),
      comDuracao({ id: 'd', participanteNome: 'Davi', participanteEmail: 'd@x', tentativaId: 'td' }, 31),
      comDuracao({ id: 'e', participanteNome: 'Eva', participanteEmail: 'e@x', tentativaId: 'te' }, 29),
    ];
    const r = indicios(notas, new Map([['tc', { saidasDeFoco: 4, trocasSessao: 0 }], ['td', { saidasDeFoco: 0, trocasSessao: 2 }]]));
    const por = Object.fromEntries(r.map((i) => [i.nome, i.motivos.map((m) => m.codigo)]));
    expect(por).toEqual({
      Ana: ['MUITO_RAPIDO', 'RESPOSTAS_COINCIDENTES'],
      Bia: ['RESPOSTAS_COINCIDENTES'],
      Caio: ['SAIDAS_DA_PROVA'],
      Davi: ['TROCAS_DE_DISPOSITIVO'],
    });
  });

  it('acertos iguais e turmas pequenas não geram indício', () => {
    const certas = [q('1', { alternativaId: 'A' }, 1), q('2', { alternativaId: 'A' }, 1), q('3', { alternativaId: 'A' }, 1)];
    const notas = [
      comDuracao({ id: 'a', participanteEmail: 'a@x', questoes: certas }, 1),
      comDuracao({ id: 'b', participanteEmail: 'b@x', questoes: certas }, 30),
    ];
    expect(indicios(notas)).toEqual([]);
  });
});
