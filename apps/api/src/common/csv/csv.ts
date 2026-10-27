/**
 * CSV mínimo (RFC 4180): aspas, aspas escapadas ("") e quebras de linha dentro de campos.
 * Separador detectado automaticamente entre ',' e ';' (Excel em pt-BR exporta com ';').
 */
export function lerCsv(conteudo: string): string[][] {
  const texto = conteudo.replace(/^﻿/, '');
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeiraLinha.match(/;/g)?.length ?? 0) > (primeiraLinha.match(/,/g)?.length ?? 0) ? ';' : ',';

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let entreAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (entreAspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

/**
 * Gera CSV com ';' (abre direto no Excel pt-BR) e BOM UTF-8.
 * Campos iniciados por = + - @ recebem apóstrofo para evitar injeção de fórmula.
 */
export function escreverCsv(cabecalho: string[], linhas: (string | number | null | undefined)[][]): string {
  const formatar = (v: string | number | null | undefined) => {
    if (v == null) return '';
    let s = typeof v === 'number' ? String(v).replace('.', ',') : v;
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(formatar).join(';')).join('\r\n') + '\r\n';
}
