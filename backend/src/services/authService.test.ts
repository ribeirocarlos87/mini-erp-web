import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AuthService, AppError } from './authService';
import { prisma, cleanDatabase, disconnectDatabase } from '../test/db';
import { createTestUser } from '../test/factories';

vi.mock('./emailService', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendPasswordResetEmail } from './emailService';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('AuthService.registerUser', () => {
  it('cria usuário com senha hasheada (bcrypt) e empresa associada', async () => {
    const result = await AuthService.registerUser('João Silva', 'joao@test.local', 'senha123');

    expect(result.user.email).toBe('joao@test.local');
    expect(result.user.name).toBe('João Silva');
    expect(result.token).toBeTruthy();

    const userDb = await prisma.user.findUnique({ where: { email: 'joao@test.local' } });
    expect(userDb).toBeTruthy();
    expect(userDb!.passwordHash).not.toBe('senha123');
    expect(userDb!.passwordHash.startsWith('$2')).toBe(true);
    expect(await bcrypt.compare('senha123', userDb!.passwordHash)).toBe(true);

    const company = await prisma.company.findUnique({ where: { userId: userDb!.id } });
    expect(company).toBeTruthy();
    expect(company!.name).toBe("João Silva's Company");
  });

  it('retorna token JWT válido contendo { id, email }', async () => {
    const result = await AuthService.registerUser('Maria', 'maria@test.local', 'pwd12345');

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
    expect(decoded.id).toBe(result.user.id);
    expect(decoded.email).toBe('maria@test.local');
  });

  it('rejeita registro com email já existente (AppError 409)', async () => {
    await AuthService.registerUser('Primeiro', 'duplicado@test.local', 'pwd');

    await expect(
      AuthService.registerUser('Segundo', 'duplicado@test.local', 'outropwd')
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      AuthService.registerUser('Segundo', 'duplicado@test.local', 'outropwd')
    ).rejects.toMatchObject({ status: 409, message: 'Email já registrado!' });
  });

  it('quando falha por email duplicado, NÃO cria company órfã', async () => {
    await AuthService.registerUser('Primeiro', 'dup@test.local', 'pwd');
    const companiesBefore = await prisma.company.count();

    await expect(AuthService.registerUser('Segundo', 'dup@test.local', 'pwd')).rejects.toThrow();

    const companiesAfter = await prisma.company.count();
    expect(companiesAfter).toBe(companiesBefore);
  });
});

describe('AuthService.loginUser', () => {
  it('autentica com email + senha corretos e retorna token', async () => {
    await AuthService.registerUser('Pedro', 'pedro@test.local', 'senhaPedro1');
    const result = await AuthService.loginUser('pedro@test.local', 'senhaPedro1');

    expect(result.user.email).toBe('pedro@test.local');
    expect(result.user.name).toBe('Pedro');
    expect(result.token).toBeTruthy();

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
    expect(decoded.email).toBe('pedro@test.local');
  });

  it('rejeita email inexistente com mensagem genérica', async () => {
    await expect(AuthService.loginUser('inexistente@test.local', 'qualquer')).rejects.toThrow(
      'E-mail ou senha inválidos'
    );
  });

  it('rejeita senha incorreta com mensagem genérica (não vaza se o email existe)', async () => {
    await AuthService.registerUser('Ana', 'ana@test.local', 'senhaCerta');

    await expect(AuthService.loginUser('ana@test.local', 'senhaErrada')).rejects.toThrow(
      'E-mail ou senha inválidos'
    );
  });

  it('login funciona após criar user via factory (com hash bcrypt)', async () => {
    await createTestUser({ email: 'factory@test.local', password: 'PWfactory' });
    const result = await AuthService.loginUser('factory@test.local', 'PWfactory');
    expect(result.user.email).toBe('factory@test.local');
  });
});

describe('AuthService.requestPasswordReset', () => {
  it('não lança erro e não envia email para email desconhecido', async () => {
    await expect(
      AuthService.requestPasswordReset('nao@existe.local')
    ).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('envia email com token JWT válido para usuário existente', async () => {
    await AuthService.registerUser('Reset User', 'reset@test.local', 'senha123');

    await AuthService.requestPasswordReset('reset@test.local');

    expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
    const [toArg, tokenArg] = (sendPasswordResetEmail as any).mock.calls[0];
    expect(toArg).toBe('reset@test.local');

    const decoded = jwt.verify(tokenArg, process.env.RESET_JWT_SECRET!) as any;
    expect(decoded.purpose).toBe('password_reset');
    expect(decoded.userId).toBeGreaterThan(0);
  });
});

describe('AuthService.resetPassword', () => {
  it('atualiza passwordHash com token válido', async () => {
    const { user } = await AuthService.registerUser('R', 'r@test.local', 'senhaAntiga');
    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      process.env.RESET_JWT_SECRET!,
      { expiresIn: '1h' }
    );

    await AuthService.resetPassword(token, 'senhaNova123');

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await bcrypt.compare('senhaNova123', updated!.passwordHash)).toBe(true);
  });

  it('lança AppError 401 com token expirado', async () => {
    const { user } = await AuthService.registerUser('R2', 'r2@test.local', 'senha');
    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      process.env.RESET_JWT_SECRET!,
      { expiresIn: '-1s' }
    );

    await expect(AuthService.resetPassword(token, 'novaSenha123')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('lança AppError 401 com purpose errado', async () => {
    const { user } = await AuthService.registerUser('R3', 'r3@test.local', 'senha');
    const token = jwt.sign(
      { userId: user.id, purpose: 'auth' },
      process.env.RESET_JWT_SECRET!,
      { expiresIn: '1h' }
    );

    await expect(AuthService.resetPassword(token, 'novaSenha123')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('lança AppError 401 com token adulterado', async () => {
    await expect(AuthService.resetPassword('token.invalido.aqui', 'novaSenha123')).rejects.toMatchObject({
      status: 401,
    });
  });
});
