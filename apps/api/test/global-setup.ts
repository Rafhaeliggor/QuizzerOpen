import { execSync } from 'node:child_process';

/** Aplica as migrations no banco de teste antes da suíte e2e. */
export default function setup() {
  const url =
    process.env.DATABASE_URL_TEST ??
    'postgresql://quizzer:quizzer_dev@127.0.0.1:5432/quizzer_test';
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
