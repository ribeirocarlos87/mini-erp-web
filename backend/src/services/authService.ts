import prisma from '../db/prismaClient';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail } from './emailService';

export class AppError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class AuthService {
  static async registerUser(name: string, email: string, password: string) {
    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      throw new AppError('Email já registrado!', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword,
        },
        select: { id: true, email: true, name: true, onboardingCompletedAt: true },
      });

      await tx.company.create({
        data: {
          userId: user.id,
          name: `${name}'s Company`,
        },
      });

      return user;
    });

    const token = jwt.sign(
      { id: result.id, email: result.email },
      (process.env.JWT_SECRET || 'secret') as string,
      {
        expiresIn: process.env.JWT_EXPIRY || '7d',
      } as any
    );

    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        onboardingCompletedAt: result.onboardingCompletedAt,
      },
      token,
    };
  }

  static async updateProfile(userId: number, data: { name: string; email: string }) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
    });
    if (existing) {
      throw new AppError('Email já está em uso por outro usuário', 409);
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: data.name, email: data.email },
      select: { id: true, email: true, name: true },
    });
    return updated;
  }

  static async updatePassword(
    userId: number,
    data: { currentPassword: string; newPassword: string }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuário não encontrado', 404);

    const match = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!match) throw new AppError('Senha atual incorreta', 401);

    const newHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }

  static async loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('E-mail ou senha inválidos');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      throw new Error('E-mail ou senha inválidos');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      (process.env.JWT_SECRET || 'secret') as string,
      {
        expiresIn: process.env.JWT_EXPIRY || '7d',
      } as any
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboardingCompletedAt: user.onboardingCompletedAt,
      },
      token,
    };
  }

  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const secret = process.env.RESET_JWT_SECRET;
    if (!secret) throw new AppError('RESET_JWT_SECRET não configurado', 500);

    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      secret,
      { expiresIn: '1h' } as any
    );

    await sendPasswordResetEmail(email, token);
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const secret = process.env.RESET_JWT_SECRET;
    if (!secret) throw new AppError('RESET_JWT_SECRET não configurado', 500);

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      throw new AppError('Token inválido ou expirado', 401);
    }

    if (payload.purpose !== 'password_reset') {
      throw new AppError('Token inválido ou expirado', 401);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const userExists = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!userExists) throw new AppError('Token inválido ou expirado', 401);

    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: newHash },
    });
  }
}
