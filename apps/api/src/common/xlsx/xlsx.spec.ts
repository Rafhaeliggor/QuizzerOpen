import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { gerarXlsx } from './xlsx.js';

/** Lê as entradas do ZIP pelo diretório central (o suficiente para conferir o conteúdo). */
function entradas(buf: Buffer): Map<string, string> {
  const fim = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const mapa = new Map<string, string>();
  for (let i = 0; i < total; i++) {
    const tamNome = buf.readUInt16LE(p + 28);
    const comprimido = buf.readUInt32LE(p + 20);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.subarray(p + 46, p + 46 + tamNome).toString('utf8');
    const ini = local + 30 + buf.readUInt16LE(local + 26);
    mapa.set(nome, inflateRawSync(buf.subarray(ini, ini + comprimido)).toString('utf8'));
    p += 46 + tamNome;
  }
  return mapa;
}

describe('gerarXlsx (ADR-0044)', () => {
  const buf = gerarXlsx('Relatório: prova/1', ['Nome', 'Nota'], [
    ['Ana & <Bia>', 8.5],
    ['=HYPERLINK("x")', null],
  ]);

  it('gera um ZIP com as partes do Office Open XML', () => {
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect([...entradas(buf).keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]);
  });

  it('escapa XML, mantém números numéricos e nunca grava fórmula', () => {
    const folha = entradas(buf).get('xl/worksheets/sheet1.xml')!;
    expect(folha).toContain('Ana &amp; &lt;Bia&gt;');
    expect(folha).toContain('<c r="B2"><v>8.5</v></c>');
    expect(folha).not.toContain('<f>');
    expect(folha).toContain('t="inlineStr"><is><t xml:space="preserve">=HYPERLINK');
    expect(entradas(buf).get('xl/workbook.xml')).toContain('name="Relatório  prova 1"');
  });

  it('é um ZIP íntegro para ferramentas externas (unzip -t, quando disponível)', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'xlsx-'));
    const arq = join(pasta, 't.xlsx');
    writeFileSync(arq, buf);
    try {
      expect(execFileSync('unzip', ['-tq', arq]).toString()).toContain('No errors');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  });
});
