import { acaoPendente, decidirDupla } from './dupla.js';

describe('dupla correção (ADR-0053)', () => {
  const p = { papel: 'PRIMEIRA' as const, corretorId: 'ana', fracao: 0.8 };

  it('1ª correção fica pendente; quem fez pode refazer antes da 2ª', () => {
    expect(decidirDupla([], 'ana', false, 20, 0.8)).toEqual({ papel: 'PRIMEIRA', fracaoFinal: null, aguardaArbitragem: false });
    expect(decidirDupla([p], 'ana', false, 20, 0.7)).toMatchObject({ papel: 'PRIMEIRA' });
  });

  it('2ª correção dentro do limiar fecha pela média; acima, vai para arbitragem', () => {
    expect(decidirDupla([p], 'bia', false, 20, 0.6)).toEqual({ papel: 'SEGUNDA', fracaoFinal: 0.7, aguardaArbitragem: false });
    expect(decidirDupla([p], 'bia', false, 20, 0.5)).toEqual({ papel: 'SEGUNDA', fracaoFinal: null, aguardaArbitragem: true });
  });

  it('arbitragem: só por quem não corrigiu e tem papel para isso', () => {
    const s = { papel: 'SEGUNDA' as const, corretorId: 'bia', fracao: 0.4 };
    expect(decidirDupla([p, s], 'ana', true, 20, 1)).toEqual({ erro: expect.stringContaining('não corrigiu') });
    expect(decidirDupla([p, s], 'caio', false, 20, 1)).toEqual({ erro: expect.stringContaining('autor da prova') });
    expect(decidirDupla([p, s], 'coord', true, 20, 0.65)).toEqual({ papel: 'ARBITRAGEM', fracaoFinal: 0.65, aguardaArbitragem: false });
    expect(decidirDupla([p, { ...s, fracao: 0.7 }], 'coord', true, 20, 1)).toEqual({ erro: expect.stringContaining('concluída') });
  });

  it('fila: o que cada pessoa pode fazer', () => {
    const s = { papel: 'SEGUNDA' as const, corretorId: 'bia', fracao: 0.4 };
    expect(acaoPendente([], 'x', false, false)).toBe('PRIMEIRA');
    expect(acaoPendente([p], 'ana', false, false)).toBeNull();
    expect(acaoPendente([p], 'bia', false, false)).toBe('SEGUNDA');
    expect(acaoPendente([p, s], 'coord', true, true)).toBe('ARBITRAGEM');
    expect(acaoPendente([p, s], 'bia', true, true)).toBeNull();
  });
});
