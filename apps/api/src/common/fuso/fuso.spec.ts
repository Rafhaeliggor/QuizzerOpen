import { formatarData, fusoValido, inicioDoDia, periodoNoFuso } from './fuso.js';

describe('fuso horário da instituição', () => {
  it('início do dia em Maceió é 03:00 UTC (UTC−3, sem horário de verão)', () => {
    expect(inicioDoDia('2026-10-10', 'America/Maceio').toISOString()).toBe('2026-10-10T03:00:00.000Z');
  });

  it('período: "até" vale o dia inteiro (exclusivo no início do dia seguinte)', () => {
    const p = periodoNoFuso('2026-10-10', '2026-10-31', 'America/Maceio');
    expect(p.de!.toISOString()).toBe('2026-10-10T03:00:00.000Z');
    expect(p.ate!.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(periodoNoFuso(undefined, undefined)).toEqual({ de: undefined, ate: undefined });
  });

  it('envio às 22h de 09/10 em Maceió não entra no período que começa em 10/10', () => {
    const envio = new Date('2026-10-10T01:00:00Z'); // 22h do dia 9 no horário local
    expect(envio < periodoNoFuso('2026-10-10').de!).toBe(true);
  });

  it('acerta dias com horário de verão em outros fusos', () => {
    expect(inicioDoDia('2026-03-29', 'Europe/Lisbon').toISOString()).toBe('2026-03-29T00:00:00.000Z');
    expect(inicioDoDia('2026-07-01', 'Europe/Lisbon').toISOString()).toBe('2026-06-30T23:00:00.000Z');
  });

  it('formata no fuso e valida nomes', () => {
    expect(formatarData(new Date('2026-10-10T01:00:00Z'), 'America/Maceio')).toBe('09/10/2026');
    expect(fusoValido('America/Maceio')).toBe(true);
    expect(fusoValido('Lua/Base')).toBe(false);
  });
});
