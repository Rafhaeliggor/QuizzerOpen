import { similaridade } from './similaridade.js';

describe('similaridade', () => {
  it('ignora acentos, caixa e pontuação', () => {
    expect(similaridade('Qual é a função da mitocôndria?', 'qual e a FUNCAO da mitocondria')).toBe(1);
  });

  it('textos diferentes têm similaridade baixa', () => {
    expect(similaridade('Capital da França', 'Fórmula da área do círculo')).toBeLessThan(0.2);
  });

  it('pequena variação continua acima do limite', () => {
    expect(
      similaridade(
        'Explique o papel da mitocôndria na respiração celular aeróbica',
        'Explique o papel da mitocôndria na respiração celular',
      ),
    ).toBeGreaterThanOrEqual(0.8);
  });
});
