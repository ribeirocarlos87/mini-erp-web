import prisma from '../db/prismaClient';

/**
 * Trunca TODAS as tabelas do schema `public` (menos `_prisma_migrations`) e reinicia
 * as sequências de identidade. Usado em `beforeEach` para isolar cada teste.
 *
 * Nota sobre interpolação SQL: o CLAUDE.md proíbe SQL com interpolação de string em
 * código de produção. Aqui é teste-only e os nomes de tabela vêm do catálogo do Postgres
 * (`pg_tables`), não de input externo — não há vetor de injeção.
 */
export async function cleanDatabase(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
  `;

  if (rows.length === 0) return;

  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

/**
 * Desconecta o Prisma Client. Chamar em `afterAll` para que o processo do Vitest encerre.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
