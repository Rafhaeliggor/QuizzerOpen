import { emParalelo } from './em-paralelo.js';

describe('emParalelo', () => {
  it('respeita o limite de simultâneos e preserva a ordem dos resultados', async () => {
    let ativos = 0;
    let pico = 0;
    const r = await emParalelo([30, 5, 20, 1, 10, 2], 3, async (ms, i) => {
      ativos++;
      pico = Math.max(pico, ativos);
      await new Promise((ok) => setTimeout(ok, ms));
      ativos--;
      return i * 10;
    });
    expect(r).toEqual([0, 10, 20, 30, 40, 50]);
    expect(pico).toBe(3);
  });

  it('lista vazia não chama nada', async () => {
    expect(await emParalelo([], 5, async () => 1)).toEqual([]);
  });
});
