import prisma from '../db/prismaClient';

interface CompanyData {
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo: string | null;
}

export class SettingsService {
  static async getCompany(userId: number) {
    return prisma.company.findUnique({ where: { userId } });
  }

  static async upsertCompany(userId: number, data: CompanyData) {
    return prisma.company.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
