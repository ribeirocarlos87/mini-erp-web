import path from 'path';
import dotenv from 'dotenv';

// Carrega .env.test ANTES de qualquer import que dependa de process.env (Prisma, JWT, etc).
// Os módulos do app são importados pelos arquivos de teste — esses imports só acontecem
// depois deste setupFile, portanto vão ver as variáveis corretas.
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

if (!process.env.DATABASE_URL || !/_test(\?|$)/.test(process.env.DATABASE_URL)) {
  throw new Error('[test setup] DATABASE_URL inválida. Esperado banco de teste (sufixo "_test").');
}
if (process.env.NODE_ENV !== 'test') {
  throw new Error('[test setup] NODE_ENV deve ser "test".');
}
