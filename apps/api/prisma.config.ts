import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Carrega o .env local quando existir (dev). Em CI/produção as variáveis vêm do ambiente.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
