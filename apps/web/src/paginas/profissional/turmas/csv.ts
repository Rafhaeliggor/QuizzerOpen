/** Leitura simples só para pré-visualização (o servidor faz a validação real). */
export function lerCsvSimples(conteudo: string): string[][] {
  const linhas = conteudo.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  const sep = (linhas[0]?.split(';').length ?? 0) > (linhas[0]?.split(',').length ?? 0) ? ';' : ','
  return linhas.map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, '').trim()))
}
