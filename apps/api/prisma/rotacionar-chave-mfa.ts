/**
 * Rotação da MFA_ENCRYPTION_KEY (ADR-0042): recifra os segredos TOTP de todos os usuários com
 * uma chave nova, numa única transação. Ninguém precisa recadastrar o app autenticador.
 *
 *   # 1. gere a chave nova (guarde-a no cofre):  openssl rand -base64 32
 *   # 2. teste sem gravar:
 *   docker compose run --rm -e MFA_ENCRYPTION_KEY_NOVA=<nova> migrate npx tsx prisma/rotacionar-chave-mfa.ts --simular
 *   # 3. pare a API, rode de verdade, troque MFA_ENCRYPTION_KEY no .env e suba a API:
 *   docker compose stop api
 *   docker compose run --rm -e MFA_ENCRYPTION_KEY_NOVA=<nova> migrate npx tsx prisma/rotacionar-chave-mfa.ts
 *   # edite .env: MFA_ENCRYPTION_KEY=<nova>; depois: docker compose up -d
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { cifrar, decifrar } from '../src/common/crypto/cifra.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const { values } = parseArgs({ options: { simular: { type: 'boolean', default: false } } });
if (existsSync('.env')) process.loadEnvFile('.env');

const atual = process.env.MFA_ENCRYPTION_KEY ?? '';
const nova = process.env.MFA_ENCRYPTION_KEY_NOVA ?? '';
const valida = (k: string) => Buffer.from(k, 'base64').length === 32;
if (!process.env.DATABASE_URL || !valida(atual) || !valida(nova) || atual === nova) {
  console.error('Defina DATABASE_URL, MFA_ENCRYPTION_KEY (atual) e MFA_ENCRYPTION_KEY_NOVA (32 bytes em base64, diferente da atual).');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const usuarios = await prisma.usuario.findMany({
    where: { mfaSegredoCifrado: { not: null } },
    select: { id: true, mfaSegredoCifrado: true },
  });
  // Decifra tudo ANTES de gravar: se algum segredo não abrir com a chave atual, nada muda.
  const recifrados = usuarios.map((u) => ({ id: u.id, valor: cifrar(decifrar(u.mfaSegredoCifrado!, atual), nova) }));
  for (const r of recifrados) {
    if (decifrar(r.valor, nova).length === 0) throw new Error(`verificação falhou para ${r.id}`);
  }
  if (values.simular) {
    console.log(`Simulação: ${recifrados.length} segredo(s) seriam recifrados. Nada foi gravado.`);
  } else {
    await prisma.$transaction(
      recifrados.map((r) => prisma.usuario.update({ where: { id: r.id }, data: { mfaSegredoCifrado: r.valor } })),
    );
    await prisma.eventoAuditoria.create({
      data: { acao: 'MFA_CHAVE_ROTACIONADA', recurso: 'sistema', dados: { segredos: recifrados.length } },
    });
    console.log(`${recifrados.length} segredo(s) recifrados. Agora troque MFA_ENCRYPTION_KEY no .env pela chave nova e reinicie a API.`);
  }
} catch (erro) {
  console.error('Rotação abortada, nada foi alterado:', erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
