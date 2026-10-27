import { randomBytes } from 'node:crypto';
import { cifrar, decifrar } from './cifra.js';

describe('cifra AES-256-GCM', () => {
  const chave = randomBytes(32).toString('base64');

  it('cifra e decifra o mesmo texto', () => {
    const cifrado = cifrar('JBSWY3DPEHPK3PXP', chave);
    expect(cifrado).not.toContain('JBSWY3DPEHPK3PXP');
    expect(cifrado.startsWith('v1.')).toBe(true);
    expect(decifrar(cifrado, chave)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('gera IV diferente a cada cifragem', () => {
    expect(cifrar('mesmo', chave)).not.toBe(cifrar('mesmo', chave));
  });

  it('rejeita chave errada', () => {
    const cifrado = cifrar('segredo', chave);
    expect(() =>
      decifrar(cifrado, randomBytes(32).toString('base64')),
    ).toThrow();
  });

  it('rejeita conteúdo adulterado', () => {
    const [v, iv, tag, dados] = cifrar('segredo', chave).split('.');
    const adulterado = Buffer.from(dados!, 'base64url');
    adulterado[0]! ^= 0xff;
    expect(() =>
      decifrar([v, iv, tag, adulterado.toString('base64url')].join('.'), chave),
    ).toThrow();
  });

  it('rejeita formato desconhecido', () => {
    expect(() => decifrar('v0.a.b.c', chave)).toThrow('Formato');
  });
});
