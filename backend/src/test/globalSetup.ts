import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

/**
 * globalSetup do Vitest — roda UMA vez antes de qualquer suite de teste.
 *
 * Responsabilidades:
 *  1. Carrega `.env.test` (banco isolado de testes).
 *  2. Valida que estamos apontando para um banco de TESTE (URL terminando em `_test`).
 *     Isso evita qualquer chance de rodar migrations contra prod por engano.
 *  3. Aplica todas as migrations em `prisma/migrations/` no banco de teste.
 *     `prisma migrate deploy` é idempotente — repetir não causa dano.
 */
export async function setup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[test setup] DATABASE_URL ausente. Copie backend/.env.test.example para backend/.env.test.'
    );
  }
  if (!/_test(\?|$)/.test(url)) {
    throw new Error(
      `[test setup] DATABASE_URL deve apontar para um banco de teste (URL terminando em "_test"). Recebido: ${url}`
    );
  }
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`[test setup] NODE_ENV deve ser "test". Recebido: ${process.env.NODE_ENV}`);
  }

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit',
    env: { ...process.env },
  });
}
