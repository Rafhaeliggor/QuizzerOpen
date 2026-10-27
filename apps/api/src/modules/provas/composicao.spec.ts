import { problemasDasSecoes, questoesPorParticipante, somaPesos } from './composicao.js';

describe('composição por seções (ADR-0048)', () => {
  const fixa = { modo: 'FIXA' as const, itens: [{ peso: 20 }, { peso: 30 }] };
  const sorteio = { modo: 'SORTEIO' as const, sortear: 2, peso: 50, itens: [{}, {}, {}, {}, {}] };

  it('soma: itens fixos + peso total de cada seção de sorteio', () => {
    expect(somaPesos([], [fixa, sorteio])).toBe(100);
    expect(somaPesos([{ peso: 10 }], [fixa])).toBe(60);
  });

  it('questões por participante contam só as sorteadas', () => {
    expect(questoesPorParticipante(0, [fixa, sorteio])).toBe(4);
    expect(questoesPorParticipante(3, [])).toBe(3);
  });

  it('aponta seção vazia, sorteio maior que o conjunto e peso ausente', () => {
    expect(problemasDasSecoes([fixa, sorteio])).toEqual([]);
    expect(problemasDasSecoes([{ modo: 'FIXA', itens: [] }])).toEqual(['Seção 1: adicione questões']);
    expect(problemasDasSecoes([{ ...sorteio, sortear: 9 }])[0]).toContain('sortear 9 de 5');
    expect(problemasDasSecoes([{ ...sorteio, peso: 0 }])[0]).toContain('peso da seção');
    expect(problemasDasSecoes([{ modo: 'FIXA', itens: [{ peso: 0 }] }])[0]).toContain('peso maior que zero');
  });
});
