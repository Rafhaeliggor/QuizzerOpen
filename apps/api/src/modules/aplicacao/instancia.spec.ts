import type { ProvaParaAplicacao } from '../provas/provas.service.js';
import { corrigirAutomaticamente } from '../correcao/calculo.js';
import { apresentarAlternativas, calcularPrazo, formatoDe, gerarPin, montarInstancia, opacificar, type Embaralhar } from './instancia.js';

const versao = (id: string, natureza: 'FECHADA' | 'ABERTA') => ({
  id,
  questaoId: `q-${id}`,
  numeroVersao: 1,
  enunciado: `Enunciado ${id}`,
  alternativas:
    natureza === 'FECHADA'
      ? [
          { id: 'A', texto: 'a' },
          { id: 'B', texto: 'b' },
        ]
      : null,
  gabarito: natureza === 'FECHADA' ? { alternativaId: 'B' } : null,
  rubrica: natureza === 'ABERTA' ? { criterios: 'c' } : null,
  natureza,
  formato: natureza === 'FECHADA' ? ('MULTIPLA_ESCOLHA' as const) : ('DISSERTATIVA' as const),
  midias: [],
  pendente: false,
  disciplina: 'X',
  dificuldade: 'MEDIO',
  statusQuestao: 'PUBLICADA',
});

const prova = (ordem: 'FIXA' | 'RANDOMIZADA'): ProvaParaAplicacao => ({
  id: 'p',
  autorId: 'a',
  titulo: 'T',
  descricao: null,
  visibilidade: 'PRIVADA',
  criterioAprovacao: { tipo: 'NENHUM' },
  tempoLimiteMin: 30,
  tentativasPermitidas: 1,
  modoNavegacao: 'LIVRE',
  ordemQuestoes: ordem,
  exigeMfa: false,
  exibirGabarito: 'NUNCA',
  prazoRecursoDias: null,
  correcaoAsCegas: false,
    correcaoDupla: false,
    limiarDivergencia: 20,
    tempoPorQuestaoSeg: null,
  secoes: [],
  itens: [
    { ordem: 2, peso: 40, secaoId: null, versao: versao('v2', 'ABERTA') },
    { ordem: 1, peso: 60, secaoId: null, versao: versao('v1', 'FECHADA') },
  ],
});

const inverter: Embaralhar = (itens) => [...itens].reverse();

describe('montarInstancia', () => {
  it('prova de ordem fixa mantém a ordem da composição', () => {
    const { questoesFixadas } = montarInstancia(prova('FIXA'), inverter);
    expect(questoesFixadas.map((q) => q.versaoQuestaoId)).toEqual(['v1', 'v2']);
    expect(questoesFixadas[0]!.alternativas!.map((a) => a.id)).toEqual(['A', 'B']);
  });

  it('prova randomizada embaralha questões e alternativas, renumerando a ordem', () => {
    const { questoesFixadas } = montarInstancia(prova('RANDOMIZADA'), inverter);
    expect(questoesFixadas.map((q) => [q.versaoQuestaoId, q.ordem])).toEqual([
      ['v1', 1],
      ['v2', 2],
    ]);
    expect(questoesFixadas[0]!.alternativas!.map((a) => a.id)).toEqual(['B', 'A']);
  });

  it('não expõe gabarito nas questões e o congela à parte', () => {
    const { questoesFixadas, gabaritoCongelado } = montarInstancia(prova('FIXA'));
    expect(JSON.stringify(questoesFixadas)).not.toContain('gabarito');
    expect(gabaritoCongelado.v1!.gabarito).toEqual({ alternativaId: 'B' });
  });
});

describe('calcularPrazo', () => {
  const inicio = new Date('2026-10-10T10:00:00Z');
  it('início + tempo limite', () => {
    expect(calcularPrazo(inicio, 30, new Date('2026-10-10T12:00:00Z')).toISOString()).toBe('2026-10-10T10:30:00.000Z');
  });
  it('limitado ao fim da janela', () => {
    expect(calcularPrazo(inicio, 90, new Date('2026-10-10T11:00:00Z')).toISOString()).toBe('2026-10-10T11:00:00.000Z');
  });
  it('sem tempo limite vale o fim da janela', () => {
    expect(calcularPrazo(inicio, null, new Date('2026-10-10T11:00:00Z')).toISOString()).toBe('2026-10-10T11:00:00.000Z');
  });
});

it('gerarPin produz 8 caracteres sem ambíguos', () => {
  for (let i = 0; i < 50; i++) expect(gerarPin()).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
});

describe('montarInstancia — formatos (lote 6)', () => {
  it('não embaralha Verdadeiro/Falso e congela formato, disciplina e mídias', () => {
    const p = prova('RANDOMIZADA');
    const vf = {
      ...p.itens[1]!.versao,
      formato: 'VERDADEIRO_FALSO' as const,
      alternativas: [
        { id: 'V', texto: 'Verdadeiro' },
        { id: 'F', texto: 'Falso' },
      ],
      midias: [{ id: 'm', tipo: 'IMAGEM' as const, url: '/api/v1/midias/abc', nomeOriginal: 'a.png' }],
    };
    const { questoesFixadas } = montarInstancia({ ...p, itens: [{ ordem: 1, peso: 100, secaoId: null, versao: vf }] }, inverter);
    expect(questoesFixadas[0]).toMatchObject({
      formato: 'VERDADEIRO_FALSO',
      disciplina: 'X',
      alternativas: [{ id: 'V' }, { id: 'F' }],
      midias: [{ url: '/api/v1/midias/abc' }],
    });
  });

  it('instâncias antigas sem formato são lidas pela natureza', () => {
    expect(formatoDe({ natureza: 'FECHADA' })).toBe('MULTIPLA_ESCOLHA');
    expect(formatoDe({ natureza: 'ABERTA' })).toBe('DISSERTATIVA');
    expect(formatoDe({ natureza: 'FECHADA', formato: 'RESPOSTA_CURTA' })).toBe('RESPOSTA_CURTA');
  });
});

describe('seções e sorteio (lote 8)', () => {
  const base = prova('FIXA');
  const v = (id: string) => ({ ...base.itens[1]!.versao, id, questaoId: `q-${id}` });
  const comSecoes = {
    ...base,
    secoes: [
      { id: 's1', titulo: 'Básico', ordem: 1, modo: 'FIXA' as const, sortear: null, peso: null, notaMinima: null },
      { id: 's2', titulo: 'Sorteio', ordem: 2, modo: 'SORTEIO' as const, sortear: 2, peso: 60, notaMinima: 5 },
    ],
    itens: [
      { ordem: 1, peso: 40, secaoId: 's1', versao: v('f1') },
      { ordem: 2, peso: 0, secaoId: 's2', versao: v('p1') },
      { ordem: 3, peso: 0, secaoId: 's2', versao: v('p2') },
      { ordem: 4, peso: 0, secaoId: 's2', versao: v('p3') },
    ],
  };

  it('segue a ordem das seções e sorteia N do conjunto com peso dividido', () => {
    const { questoesFixadas, gabaritoCongelado } = montarInstancia(comSecoes, inverter);
    expect(questoesFixadas.map((q) => [q.versaoQuestaoId, q.peso, q.secaoTitulo, q.ordem])).toEqual([
      ['f1', 40, 'Básico', 1],
      ['p3', 30, 'Sorteio', 2],
      ['p2', 30, 'Sorteio', 3],
    ]);
    expect(Object.keys(gabaritoCongelado).sort()).toEqual(['f1', 'p2', 'p3']); // só as sorteadas
  });

  it('com o gerador real, cada participante recebe 2 distintas do conjunto', () => {
    for (let i = 0; i < 20; i++) {
      const ids = montarInstancia(comSecoes).questoesFixadas.filter((q) => q.secaoId === 's2').map((q) => q.versaoQuestaoId);
      expect(new Set(ids).size).toBe(2);
      expect(ids.every((id) => ['p1', 'p2', 'p3'].includes(id))).toBe(true);
    }
  });
});

describe('apresentação de associação e ordenação (lote 8)', () => {
  it('associação embaralha só as opções (coluna B); ordenação nunca sai na ordem certa', () => {
    const alt = [
      { id: 'I1', texto: 'a', grupo: 'ITEM' as const },
      { id: 'I2', texto: 'b', grupo: 'ITEM' as const },
      { id: 'O1', texto: 'x', grupo: 'OPCAO' as const },
      { id: 'O2', texto: 'y', grupo: 'OPCAO' as const },
    ];
    expect(apresentarAlternativas('ASSOCIACAO', alt, false, inverter)!.map((a) => a.id)).toEqual(['I1', 'I2', 'O2', 'O1']);
    const ordem = [
      { id: 'A', texto: '1' },
      { id: 'B', texto: '2' },
      { id: 'C', texto: '3' },
    ];
    const identidade = <T>(x: T[]) => [...x];
    expect(apresentarAlternativas('ORDENACAO', ordem, false, identidade)!.map((a) => a.id)).toEqual(['C', 'B', 'A']);
  });
});

describe('IDs opacos em associação e ordenação (gabarito não dedutível)', () => {
  const assoc = [
    { id: 'I1', texto: 'Brasil', grupo: 'ITEM' as const },
    { id: 'I2', texto: 'Chile', grupo: 'ITEM' as const },
    { id: 'O1', texto: 'Brasília', grupo: 'OPCAO' as const },
    { id: 'O2', texto: 'Santiago', grupo: 'OPCAO' as const },
  ];
  const ordem = [
    { id: 'C', texto: 'terceiro' },
    { id: 'A', texto: 'primeiro' },
    { id: 'B', texto: 'segundo' },
  ];

  it('associação: IDs novos, sem I/O numerados, e o gabarito traduzido continua correto', () => {
    const r = opacificar('ASSOCIACAO', assoc, { pares: { I1: 'O1', I2: 'O2' } });
    const ids = r.alternativas!.map((a) => a.id);
    expect(ids.some((id) => /^[IO]\d$/.test(id))).toBe(false);
    expect(new Set(ids).size).toBe(4);
    const id = (texto: string) => r.alternativas!.find((a) => a.texto === texto)!.id;
    expect(r.gabarito).toEqual({ pares: { [id('Brasil')]: id('Brasília'), [id('Chile')]: id('Santiago') } });
    // A resposta certa, nos IDs que o participante recebeu, vale nota cheia; trocada, zero.
    expect(corrigirAutomaticamente('ASSOCIACAO', r.gabarito, r.gabarito)).toBe(1);
    expect(corrigirAutomaticamente('ASSOCIACAO', { pares: { [id('Brasil')]: id('Santiago'), [id('Chile')]: id('Brasília') } }, r.gabarito)).toBe(0);
  });

  it('ordenação: ordenar pelos IDs não revela a ordem certa (ex.: IDs crescentes ao contrário)', () => {
    let n = 9;
    const r = opacificar('ORDENACAO', ordem, { ordem: ['A', 'B', 'C'] }, () => `k${n--}`);
    const id = (texto: string) => r.alternativas!.find((a) => a.texto === texto)!.id;
    expect(r.gabarito).toEqual({ ordem: [id('primeiro'), id('segundo'), id('terceiro')] });
    expect(r.alternativas!.map((a) => a.id).sort()).not.toEqual((r.gabarito as { ordem: string[] }).ordem);
    expect(corrigirAutomaticamente('ORDENACAO', r.gabarito, r.gabarito)).toBe(1);
  });

  it('cada instância recebe IDs diferentes; demais formatos não mudam', () => {
    const a = opacificar('ORDENACAO', ordem, { ordem: ['A', 'B', 'C'] });
    const b = opacificar('ORDENACAO', ordem, { ordem: ['A', 'B', 'C'] });
    expect(a.alternativas!.map((x) => x.id)).not.toEqual(b.alternativas!.map((x) => x.id));
    const me = opacificar('MULTIPLA_ESCOLHA', ordem, { alternativaId: 'B' });
    expect(me.alternativas!.map((x) => x.id)).toEqual(['C', 'A', 'B']);
    expect(me.gabarito).toEqual({ alternativaId: 'B' });
  });
});

