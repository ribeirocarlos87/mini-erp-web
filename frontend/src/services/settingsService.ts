import apiClient from './api';

interface ProfileData {
  name: string;
  email: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
}

interface CompanyData {
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo: string | null;
}

export const settingsService = {
  async updateProfile(data: ProfileData) {
    const res = await apiClient.patch('/auth/profile', data);
    return res.data as { id: number; name: string; email: string };
  },

  async updatePassword(data: PasswordData) {
    const res = await apiClient.patch('/auth/password', data);
    return res.data as { message: string };
  },

  async getCompany() {
    const res = await apiClient.get('/settings/company');
    return res.data as CompanyData & { id: number; userId: number };
  },

  async upsertCompany(data: CompanyData) {
    const res = await apiClient.patch('/settings/company', data);
    return res.data as CompanyData & { id: number; userId: number };
  },
};
