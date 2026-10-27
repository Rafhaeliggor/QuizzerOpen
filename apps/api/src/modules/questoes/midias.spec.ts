import { identificarMidia } from './midias.service.js';

const comPreenchimento = (cabeca: number[] | string) =>
  Buffer.concat([typeof cabeca === 'string' ? Buffer.from(cabeca, 'latin1') : Buffer.from(cabeca), Buffer.alloc(32)]);

describe('identificarMidia (RF04 — ADR-0032)', () => {
  it('reconhece imagens e áudios pela assinatura', () => {
    expect(identificarMidia(comPreenchimento([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({ mime: 'image/png', tipo: 'IMAGEM' });
    expect(identificarMidia(comPreenchimento([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe('image/jpeg');
    expect(identificarMidia(comPreenchimento('GIF89a'))?.mime).toBe('image/gif');
    expect(identificarMidia(comPreenchimento('RIFF\0\0\0\0WEBP'))?.mime).toBe('image/webp');
    expect(identificarMidia(comPreenchimento('ID3'))).toEqual({ mime: 'audio/mpeg', tipo: 'AUDIO' });
    expect(identificarMidia(comPreenchimento('OggS'))?.mime).toBe('audio/ogg');
    expect(identificarMidia(comPreenchimento('RIFF\0\0\0\0WAVE'))?.mime).toBe('audio/wav');
  });

  it('recusa SVG, HTML, PDF e arquivos curtos — o nome/mime enviados não importam', () => {
    expect(identificarMidia(comPreenchimento('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(identificarMidia(comPreenchimento('<!doctype html><script>'))).toBeNull();
    expect(identificarMidia(comPreenchimento('%PDF-1.7'))).toBeNull();
    expect(identificarMidia(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});
