import { fracaoDaAvaliacao, mascarar } from './correcao.service.js';
import {
  arredondar,
  calcularNota,
  corrigirAssociacao,
  corrigirAutomaticamente,
  corrigirOrdenacao,
  corrigirFechada,
  corrigirMultiplaResposta,
  corrigirNumerica,
  lerNumero,
  corrigirRespostaCurta,
  gabaritoVisivel,
  normalizarResposta,
  prazoRecursoFim,
  respostaAbertaVazia,
} from './calculo.js';

const criterio6 = { tipo: 'NOTA_MINIMA' as const, valor: 6 };
const q = (id: string, peso: number, fracao: number | null) => ({ versaoQuestaoId: id, peso, fracao });

describe('calcularNota', () => {
  it('pondera pelos pesos e aplica o critério de aprovação', () => {
    const r = calcularNota([q('a', 60, 1), q('b', 40, 0)], new Map(), criterio6);
    expect(r).toEqual({ pendente: false, notaProvisoria: 6, notaFinal: 6, statusAprovacao: 'APROVADO', notasSecao: [] });
  });

  it('com questão aberta sem correção, fica pendente e sem nota final (RF07)', () => {
    const r = calcularNota([q('a', 50, 1), q('b', 50, null)], new Map(), criterio6);
    expect(r.pendente).toBe(true);
    expect(r.notaProvisoria).toBe(5);
    expect(r.notaFinal).toBeNull();
    expect(r.statusAprovacao).toBeNull();
  });

  it('correção parcial de aberta (fração) entra proporcionalmente', () => {
    const r = calcularNota([q('a', 50, 1), q('b', 50, 0.5)], new Map(), { tipo: 'NENHUM' });
    expect(r.notaFinal).toBe(7.5);
    expect(r.statusAprovacao).toBe('SEM_CRITERIO');
  });

  it('anulação PONTUAR_TODOS dá a pontuação integral (mesmo se pendente)', () => {
    const r = calcularNota([q('a', 50, 0), q('b', 50, null)], new Map([['b', 'PONTUAR_TODOS']]), criterio6);
    expect(r.pendente).toBe(false);
    expect(r.notaFinal).toBe(5);
    expect(r.statusAprovacao).toBe('REPROVADO');
  });

  it('anulação REMOVER_DO_TOTAL recalcula sobre as demais', () => {
    const r = calcularNota([q('a', 50, 1), q('b', 50, 0)], new Map([['b', 'REMOVER_DO_TOTAL']]), criterio6);
    expect(r.notaFinal).toBe(10);
  });

  it('arredonda para 2 casas', () => {
    const r = calcularNota([q('a', 1, 1), q('b', 1, 0), q('c', 1, 0)], new Map(), { tipo: 'NENHUM' });
    expect(r.notaFinal).toBe(3.33);
  });
});

describe('corrigirFechada / respostaAbertaVazia', () => {
  it('compara alternativa marcada com o gabarito', () => {
    expect(corrigirFechada({ alternativaId: 'B' }, { alternativaId: 'B' })).toBe(1);
    expect(corrigirFechada({ alternativaId: 'A' }, { alternativaId: 'B' })).toBe(0);
    expect(corrigirFechada(null, { alternativaId: 'B' })).toBe(0);
  });

  it('detecta resposta aberta em branco', () => {
    expect(respostaAbertaVazia({ texto: '   ' })).toBe(true);
    expect(respostaAbertaVazia(null)).toBe(true);
    expect(respostaAbertaVazia({ texto: 'algo' })).toBe(false);
  });
});

describe('formatos de questão (lote 6)', () => {
  it('normaliza resposta curta: acentos, caixa, espaços e pontuação nas pontas', () => {
    expect(normalizarResposta('  São   PAULO. ')).toBe('sao paulo');
    expect(normalizarResposta('"Brasília"')).toBe('brasilia');
  });

  it('corrige resposta curta contra qualquer resposta aceita', () => {
    const gabarito = { respostasAceitas: ['Mitocôndria', 'mitocondrias'] };
    expect(corrigirRespostaCurta({ texto: 'mitocondria' }, gabarito)).toBe(1);
    expect(corrigirRespostaCurta({ texto: 'MITOCÔNDRIAS' }, gabarito)).toBe(1);
    expect(corrigirRespostaCurta({ texto: 'ribossomo' }, gabarito)).toBe(0);
    expect(corrigirRespostaCurta({ texto: '   ' }, gabarito)).toBe(0);
    expect(corrigirRespostaCurta(null, gabarito)).toBe(0);
  });

  it('corrige automaticamente por formato; dissertativa respondida fica para o professor', () => {
    expect(corrigirAutomaticamente('VERDADEIRO_FALSO', { alternativaId: 'F' }, { alternativaId: 'F' })).toBe(1);
    expect(corrigirAutomaticamente('MULTIPLA_ESCOLHA', { alternativaId: 'A' }, { alternativaId: 'B' })).toBe(0);
    expect(corrigirAutomaticamente('RESPOSTA_CURTA', { texto: 'x' }, { respostasAceitas: ['X'] })).toBe(1);
    expect(corrigirAutomaticamente('DISSERTATIVA', { texto: 'texto' }, null)).toBeNull();
    expect(corrigirAutomaticamente('DISSERTATIVA', { texto: '' }, null)).toBe(0);
  });
});

describe('política de gabarito e prazo de recurso (lote 6)', () => {
  const agora = new Date('2026-10-11T12:00:00Z');
  const antes = new Date('2026-10-10T12:00:00Z');
  const depois = new Date('2026-10-12T12:00:00Z');

  it('nunca mostra gabarito com resultado pendente', () => {
    expect(gabaritoVisivel({ status: 'PENDENTE_CORRECAO_MANUAL', exibirGabarito: 'APOS_CORRECAO', janelaFim: antes }, agora)).toBe(false);
  });

  it('respeita NUNCA, APOS_CORRECAO e APOS_ENCERRAMENTO', () => {
    const n = (exibirGabarito: string, janelaFim: Date | null) => ({ status: 'CONSOLIDADA', exibirGabarito, janelaFim });
    expect(gabaritoVisivel(n('NUNCA', antes), agora)).toBe(false);
    expect(gabaritoVisivel(n('APOS_CORRECAO', depois), agora)).toBe(true);
    expect(gabaritoVisivel(n('APOS_ENCERRAMENTO', depois), agora)).toBe(false);
    expect(gabaritoVisivel(n('APOS_ENCERRAMENTO', antes), agora)).toBe(true);
  });

  it('prazo de recurso conta a partir da consolidação', () => {
    expect(prazoRecursoFim({ prazoRecursoDias: null, consolidadaEm: antes })).toBeNull();
    expect(prazoRecursoFim({ prazoRecursoDias: 3, consolidadaEm: null })).toBeNull();
    expect(prazoRecursoFim({ prazoRecursoDias: 2, consolidadaEm: antes })).toEqual(depois);
  });
});

describe('formatos do lote 7', () => {
  it('várias corretas: parcial, erradas descontam, nunca negativo', () => {
    const g = { alternativaIds: ['A', 'C'] };
    expect(corrigirMultiplaResposta({ alternativaIds: ['A', 'C'] }, g)).toBe(1);
    expect(corrigirMultiplaResposta({ alternativaIds: ['A'] }, g)).toBe(0.5);
    expect(corrigirMultiplaResposta({ alternativaIds: ['A', 'B'] }, g)).toBe(0);
    expect(corrigirMultiplaResposta({ alternativaIds: ['A', 'B', 'C', 'D'] }, g)).toBe(0); // marcar tudo não compensa
    expect(corrigirMultiplaResposta({ alternativaIds: ['B', 'D'] }, g)).toBe(0);
    expect(corrigirMultiplaResposta({ alternativaIds: [] }, g)).toBe(0);
    expect(corrigirAutomaticamente('MULTIPLA_RESPOSTA', { alternativaIds: ['C'] }, g)).toBe(0.5);
  });

  it('lê números em formato brasileiro e internacional', () => {
    expect(lerNumero('3,14')).toBe(3.14);
    expect(lerNumero(' 3.14 ')).toBe(3.14);
    expect(lerNumero('1.234,5')).toBe(1234.5);
    expect(lerNumero('1.234.567')).toBe(1234567);
    expect(lerNumero('-2')).toBe(-2);
    expect(lerNumero('3,1,4')).toBeNull();
    expect(lerNumero('abc')).toBeNull();
    expect(lerNumero('')).toBeNull();
  });

  it('resposta numérica respeita a tolerância', () => {
    const g = { valor: 3.14, tolerancia: 0.01 };
    expect(corrigirNumerica({ texto: '3,15' }, g)).toBe(1);
    expect(corrigirNumerica({ texto: '3.13' }, g)).toBe(1);
    expect(corrigirNumerica({ texto: '3,16' }, g)).toBe(0);
    expect(corrigirNumerica({ texto: 'pi' }, g)).toBe(0);
    expect(corrigirNumerica({ texto: '10' }, { valor: 10 })).toBe(1);
    expect(corrigirAutomaticamente('RESPOSTA_NUMERICA', { texto: '3,14' }, g)).toBe(1);
  });
});

describe('lote 8: associação, ordenação e notas por seção', () => {
  it('associação: fração de itens certos', () => {
    const g = { pares: { I1: 'O1', I2: 'O2', I3: 'O3', I4: 'O4' } };
    expect(corrigirAssociacao({ pares: { I1: 'O1', I2: 'O2', I3: 'O3', I4: 'O4' } }, g)).toBe(1);
    expect(corrigirAssociacao({ pares: { I1: 'O1', I2: 'O3', I3: 'O2' } }, g)).toBe(0.25);
    expect(corrigirAssociacao(null, g)).toBe(0);
  });

  it('ordenação: pares na ordem relativa certa (Kendall)', () => {
    const g = { ordem: ['A', 'B', 'C', 'D'] };
    expect(corrigirOrdenacao({ ordem: ['A', 'B', 'C', 'D'] }, g)).toBe(1);
    expect(corrigirOrdenacao({ ordem: ['B', 'A', 'C', 'D'] }, g)).toBe(0.8333); // 5 de 6 pares
    expect(corrigirOrdenacao({ ordem: ['D', 'C', 'B', 'A'] }, g)).toBe(0);
    expect(corrigirOrdenacao({ ordem: ['A', 'B'] }, g)).toBe(0);
  });

  it('nota mínima por seção reprova mesmo com nota geral suficiente', () => {
    const qs = [
      { versaoQuestaoId: 'a', secaoId: 's1', peso: 80, fracao: 1 },
      { versaoQuestaoId: 'b', secaoId: 's2', peso: 20, fracao: 0 },
    ];
    const secoes = [
      { id: 's1', titulo: 'Teoria', notaMinima: null },
      { id: 's2', titulo: 'Prática', notaMinima: 5 },
    ];
    const r = calcularNota(qs, new Map(), criterio6, secoes);
    expect(r.notaFinal).toBe(8);
    expect(r.statusAprovacao).toBe('REPROVADO');
    expect(r.notasSecao).toEqual([
      { id: 's1', titulo: 'Teoria', nota: 10, notaMinima: null, atingiu: null },
      { id: 's2', titulo: 'Prática', nota: 0, notaMinima: 5, atingiu: false },
    ]);
    // Sem critério geral, a nota mínima de seção decide sozinha
    expect(calcularNota(qs, new Map([['b', 'PONTUAR_TODOS']]), { tipo: 'NENHUM' }, secoes).statusAprovacao).toBe('APROVADO');
  });
});

describe('rubrica estruturada e correção às cegas (lote 8)', () => {
  const rubrica = { criterios: 'x', itens: [{ descricao: 'Define', pontos: 2 }, { descricao: 'Exemplo', pontos: 3 }] };
  it('fração pelos pontos dos critérios; valida quantidade e máximo', () => {
    expect(fracaoDaAvaliacao(rubrica, { pontosItens: [2, 1.5] })).toEqual({
      fracao: 0.7,
      avaliacaoItens: [
        { descricao: 'Define', pontos: 2, maximo: 2 },
        { descricao: 'Exemplo', pontos: 1.5, maximo: 3 },
      ],
    });
    expect(() => fracaoDaAvaliacao(rubrica, { pontosItens: [2] })).toThrow(/todos os critérios/);
    expect(() => fracaoDaAvaliacao(rubrica, { pontosItens: [3, 0] })).toThrow(/acima do máximo/);
    expect(() => fracaoDaAvaliacao({ criterios: 'x' }, { pontosItens: [1] })).toThrow(/percentual/);
    expect(fracaoDaAvaliacao({ criterios: 'x' }, { percentual: 50 }).fracao).toBe(0.5);
  });

  it('às cegas: código estável até consolidar', () => {
    const n = { id: '0190-abc-123456', participanteNome: 'Ana', participanteEmail: 'a@x', correcaoAsCegas: true, status: 'PENDENTE_CORRECAO_MANUAL' };
    expect(mascarar(n)).toEqual({ participanteNome: 'Participante 123456', participanteEmail: '', asCegas: true });
    expect(mascarar({ ...n, status: 'CONSOLIDADA' }).participanteNome).toBe('Ana');
    expect(mascarar({ ...n, correcaoAsCegas: false }).participanteNome).toBe('Ana');
  });
});

describe('arredondamento da nota (meio para cima, sem erro binário)', () => {
  it('50,25 de 100 pontos vale 5,03 (o Math.round direto dava 5,02)', () => {
    expect(arredondar(0.5025 * 10, 2)).toBe(5.03);
    const r = calcularNota([q('a', 50.25, 1), q('b', 49.75, 0)], new Map(), criterio6);
    expect(r.notaFinal).toBe(5.03);
  });

  it('casos exatos e já arredondados não mudam', () => {
    expect(arredondar(6, 2)).toBe(6);
    expect(arredondar(5.994, 2)).toBe(5.99);
    expect(arredondar(1.005, 2)).toBe(1.01);
    expect(arredondar(0, 2)).toBe(0);
  });
});

