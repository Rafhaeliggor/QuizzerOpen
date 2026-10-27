/**
 * Cria um Administrador em produção — sem seed e sem senha no código.
 *
 *   docker compose run --rm migrate npx tsx prisma/criar-admin.ts --nome "Maria Silva" --email maria@instituicao.edu.br
 *
 * A senha temporária é exibida UMA vez; no 1º login o sistema exige trocá-la e cadastrar
 * o app autenticador (MFA obrigatório para Administrador).
 */
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { PrismaClient } from '../src/generated/prisma/client.js';

const { values } = parseArgs({ options: { nome: { type: 'string' }, email: { type: 'string' } } });
const nome = values.nome?.trim();
const email = values.email?.trim().toLowerCase();
if (!nome || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Uso: criar-admin.ts --nome "Nome completo" --email email@instituicao');
  process.exit(1);
}

// Em desenvolvimento lê o .env local; no container as variáveis já vêm do Compose.
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%&*';
const senha = Array.from({ length: 16 }, () => alfabeto[randomInt(alfabeto.length)]).join('');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  if (await prisma.usuario.findUnique({ where: { email } })) {
    console.error(`Já existe um usuário com o e-mail ${email}.`);
    process.exitCode = 1;
  } else {
    const u = await prisma.usuario.create({
      data: {
        nome,
        email,
        papel: 'ADMINISTRADOR',
        trocarSenha: true,
        // Mesmos parâmetros do SenhaService (ADR-0023).
        senhaHash: await argon2.hash(senha, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 }),
      },
    });
    await prisma.eventoAuditoria.create({
      data: { acao: 'USUARIO_CRIADO', recurso: 'usuario', recursoId: u.id, dados: { papel: 'ADMINISTRADOR', origem: 'criar-admin' } },
    });
    console.log(`Administrador criado: ${email}`);
    console.log(`Senha temporária (anote agora, não será exibida de novo): ${senha}`);
    console.log('No 1º acesso: trocar a senha e cadastrar o app autenticador (MFA).');
  }
} finally {
  await prisma.$disconnect();
}
