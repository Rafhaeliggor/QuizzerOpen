/**
 * Fuso horário da instituição (ADR-0058): datas digitadas sem hora ("AAAA-MM-DD") e datas
 * exibidas em mensagens são interpretadas nele. Padrão `America/Maceio`; trocável por
 * FUSO_HORARIO (validada no boot em `config/env.ts`).
 */
export const FUSO_PADRAO = 'America/Maceio';

export function fusoHorario(): string {
  return process.env.FUSO_HORARIO || FUSO_PADRAO;
}

/** O fuso é reconhecido pelo Intl (nome IANA válido)? */
export function fusoValido(fuso: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

/** Diferença (ms) entre o relógio local do fuso e o UTC no instante dado (ex.: −3 h). */
function deslocamentoMs(instante: Date, fuso: string): number {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instante)
      .map((p) => [p.type, p.value]),
  );
  const comoUtc = Date.UTC(+partes.year!, +partes.month! - 1, +partes.day!, +partes.hour!, +partes.minute!, +partes.second!);
  return comoUtc - instante.getTime();
}

/** Instante em que começa o dia `AAAA-MM-DD` no fuso (somando `diasDepois`, para limites exclusivos). */
export function inicioDoDia(data: string, fuso = fusoHorario(), diasDepois = 0): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  const meiaNoiteUtc = Date.UTC(ano!, mes! - 1, dia! + diasDepois);
  // Duas passadas acertam também os dias de mudança de horário de verão (onde houver).
  let instante = meiaNoiteUtc - deslocamentoMs(new Date(meiaNoiteUtc), fuso);
  instante = meiaNoiteUtc - deslocamentoMs(new Date(instante), fuso);
  return new Date(instante);
}

/** Período de filtro: `de` inclusivo e `ate` valendo o dia inteiro (limite exclusivo no dia seguinte). */
export function periodoNoFuso(de?: string, ate?: string, fuso = fusoHorario()) {
  return {
    de: de ? inicioDoDia(de, fuso) : undefined,
    ate: ate ? inicioDoDia(ate, fuso, 1) : undefined,
  };
}

export function formatarDataHora(d: Date, fuso = fusoHorario()): string {
  return d.toLocaleString('pt-BR', { timeZone: fuso, dateStyle: 'short', timeStyle: 'short' });
}

export function formatarData(d: Date, fuso = fusoHorario()): string {
  return d.toLocaleDateString('pt-BR', { timeZone: fuso });
}
