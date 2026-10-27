import { escreverCsv, lerCsv } from './csv.js';

describe('csv', () => {
  it('lê vírgula, aspas, aspas escapadas e CRLF', () => {
    expect(lerCsv('nome,email\r\n"Silva, Ana","a@x.com"\r\n"Diz ""oi""",b@x.com')).toEqual([
      ['nome', 'email'],
      ['Silva, Ana', 'a@x.com'],
      ['Diz "oi"', 'b@x.com'],
    ]);
  });

  it('detecta ponto e vírgula e remove BOM', () => {
    expect(lerCsv('﻿nome;email\nAna;a@x.com\n')).toEqual([
      ['nome', 'email'],
      ['Ana', 'a@x.com'],
    ]);
  });

  it('escreve com ; e neutraliza fórmulas', () => {
    const csv = escreverCsv(['a', 'b'], [['=SOMA(1)', 7.5], ['x;y', null]]);
    expect(csv).toBe("﻿a;b\r\n'=SOMA(1);7,5\r\n\"x;y\";\r\n");
  });
});
