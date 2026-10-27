import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifra simétrica AES-256-GCM para segredos em repouso (ex.: segredo TOTP).
 * Formato: `v1.<iv>.<tag>.<cifrado>` (base64url). O prefixo de versão permite
 * rotação de chave/algoritmo no futuro.
 */
const VERSAO = 'v1';

export function cifrar(textoClaro: string, chaveBase64: string): string {
  const chave = Buffer.from(chaveBase64, 'base64');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', chave, iv);
  const cifrado = Buffer.concat([
    cipher.update(textoClaro, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSAO, iv, tag, cifrado]
    .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
    .join('.');
}

export function decifrar(valor: string, chaveBase64: string): string {
  const [versao, iv, tag, cifrado] = valor.split('.');
  if (versao !== VERSAO || !iv || !tag || !cifrado) {
    throw new Error('Formato de valor cifrado inválido');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(chaveBase64, 'base64'),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(cifrado, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
