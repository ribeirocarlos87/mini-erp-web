# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `BlankPage` placeholder at `/configuracoes` with a full settings page composed of four section cards: Minha Conta, Dados da Empresa, Aparência, and Notificações.

**Architecture:** Frontend-first. `settingsStore` (Zustand + persist) stores UI preferences and notification toggles in localStorage. Account/password changes hit two new `auth` endpoints. Company data hits a new `settings` router backed by the existing `Company` Prisma model, extended with `address` and `logo` fields via migration.

**Tech Stack:** TypeScript, Prisma 5, Express, bcrypt, express-validator, React 18, Zustand, CSS Modules, Vitest, Supertest, React Testing Library.

---

## File Map

**Backend — new/modified:**
- `backend/src/services/authService.ts` — add `updateProfile()` and `updatePassword()`
- `backend/src/services/settingsService.ts` — new: `getCompany()`, `upsertCompany()`
- `backend/src/routes/auth.ts` — add `PATCH /profile` and `PATCH /password`
- `backend/src/routes/settings.ts` — new: `GET /company`, `PATCH /company`
- `backend/src/routes/settings.test.ts` — new: route tests
- `backend/src/server.ts` — register settings router
- `backend/prisma/schema.prisma` — add `address` and `logo` to `Company`

**Frontend — new/modified:**
- `frontend/src/store/settingsStore.ts` — new: Zustand + persist
- `frontend/src/services/settingsService.ts` — new: API calls
- `frontend/src/pages/ConfiguracoesPage/ConfiguracoesPage.tsx` — new: page shell
- `frontend/src/pages/ConfiguracoesPage/ConfiguracoesPage.module.css` — new
- `frontend/src/pages/ConfiguracoesPage/components/ContaCard.tsx` — new
- `frontend/src/pages/ConfiguracoesPage/components/EmpresaCard.tsx` — new
- `frontend/src/pages/ConfiguracoesPage/components/AparenciaCard.tsx` — new
- `frontend/src/pages/ConfiguracoesPage/components/NotificacoesCard.tsx` — new
- `frontend/src/App.tsx` — swap `BlankPage` for `ConfiguracoesPage` at `/configuracoes`, apply theme/color on init

---

## Task 1: Prisma migration — add address and logo to Company

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add fields to schema**

In `backend/prisma/schema.prisma`, update the `Company` model to:

```prisma
model Company {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique @map("user_id")
  name      String   @db.VarChar(100)
  cnpj      String?  @unique @db.VarChar(14)
  email     String?  @db.VarChar(100)
  phone     String?  @db.VarChar(20)
  address   String?  @db.VarChar(255)
  logo      String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("companies")
}
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd backend
npx prisma migrate dev --name add_address_logo_to_company
```

Expected output: `The following migration(s) have been applied: ...add_address_logo_to_company`

- [ ] **Step 3: Verify generated migration file exists**

```bash
ls backend/prisma/migrations/ | grep add_address_logo
```

Expected: one directory listed.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add address and logo fields to Company"
```

---

## Task 2: AuthService — updateProfile and updatePassword

**Files:**
- Modify: `backend/src/services/authService.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/src/services/authService.settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { AuthService, AppError } from './authService';
import { cleanDatabase, disconnectDatabase } from '../test/db';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('AuthService.updateProfile', () => {
  it('updates name and email', async () => {
    const { user } = await AuthService.registerUser('Original', 'orig@test.local', 'senha123');
    const updated = await AuthService.updateProfile(user.id, { name: 'Novo Nome', email: 'novo@test.local' });
    expect(updated.name).toBe('Novo Nome');
    expect(updated.email).toBe('novo@test.local');
  });

  it('throws 409 when email already taken by another user', async () => {
    await AuthService.registerUser('A', 'a@test.local', 'senha123');
    const { user: b } = await AuthService.registerUser('B', 'b@test.local', 'senha123');
    await expect(
      AuthService.updateProfile(b.id, { name: 'B', email: 'a@test.local' })
    ).rejects.toThrow(AppError);
  });
});

describe('AuthService.updatePassword', () => {
  it('updates password when current password is correct', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senhaAntiga');
    await expect(
      AuthService.updatePassword(user.id, { currentPassword: 'senhaAntiga', newPassword: 'senhaNova' })
    ).resolves.not.toThrow();
    // confirm new password works on login
    await expect(AuthService.loginUser('u@test.local', 'senhaNova')).resolves.toBeTruthy();
  });

  it('throws 401 when current password is wrong', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senhaAntiga');
    await expect(
      AuthService.updatePassword(user.id, { currentPassword: 'errada', newPassword: 'senhaNova' })
    ).rejects.toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
npx vitest run src/services/authService.settings.test.ts
```

Expected: FAIL — `AuthService.updateProfile is not a function`

- [ ] **Step 3: Implement updateProfile and updatePassword in authService.ts**

Add to the `AuthService` class in `backend/src/services/authService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend
npx vitest run src/services/authService.settings.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/authService.ts backend/src/services/authService.settings.test.ts
git commit -m "feat(auth): add updateProfile and updatePassword to AuthService"
```

---

## Task 3: SettingsService — getCompany and upsertCompany

**Files:**
- Create: `backend/src/services/settingsService.ts`
- Create: `backend/src/services/settingsService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/src/services/settingsService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SettingsService } from './settingsService';
import { AuthService } from './authService';
import { cleanDatabase, disconnectDatabase } from '../test/db';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('SettingsService.getCompany', () => {
  it('returns company data for the user', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senha123');
    const company = await SettingsService.getCompany(user.id);
    expect(company).not.toBeNull();
    expect(company!.userId).toBe(user.id);
  });
});

describe('SettingsService.upsertCompany', () => {
  it('updates company fields', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senha123');
    const result = await SettingsService.upsertCompany(user.id, {
      name: 'Minha Empresa',
      cnpj: '12345678000199',
      email: 'empresa@test.local',
      phone: '11999999999',
      address: 'Rua A, 100, SP',
      logo: null,
    });
    expect(result.name).toBe('Minha Empresa');
    expect(result.cnpj).toBe('12345678000199');
    expect(result.address).toBe('Rua A, 100, SP');
  });

  it('can be called twice — second call updates', async () => {
    const { user } = await AuthService.registerUser('User', 'u@test.local', 'senha123');
    await SettingsService.upsertCompany(user.id, { name: 'Primeira', cnpj: null, email: null, phone: null, address: null, logo: null });
    const result = await SettingsService.upsertCompany(user.id, { name: 'Segunda', cnpj: null, email: null, phone: null, address: null, logo: null });
    expect(result.name).toBe('Segunda');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
npx vitest run src/services/settingsService.test.ts
```

Expected: FAIL — `Cannot find module './settingsService'`

- [ ] **Step 3: Implement SettingsService**

Create `backend/src/services/settingsService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend
npx vitest run src/services/settingsService.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/settingsService.ts backend/src/services/settingsService.test.ts
git commit -m "feat(settings): add SettingsService with getCompany and upsertCompany"
```

---

## Task 4: Auth routes — PATCH /profile and PATCH /password

**Files:**
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/routes/auth.test.ts`

- [ ] **Step 1: Add tests for the two new endpoints**

Append to `backend/src/routes/auth.test.ts`:

```typescript
import { authMiddleware } from '../middleware/auth';

describe('PATCH /api/auth/profile', () => {
  it('200 updates name and email', async () => {
    const reg = await AuthService.registerUser('Original', 'orig@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ name: 'Novo Nome', email: 'novo@test.local' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Novo Nome');
    expect(res.body.email).toBe('novo@test.local');
  });

  it('401 without token', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .send({ name: 'X', email: 'x@test.local' });
    expect(res.status).toBe(401);
  });

  it('400 when name is empty', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ name: '', email: 'u@test.local' });
    expect(res.status).toBe(400);
  });

  it('409 when email already taken', async () => {
    await AuthService.registerUser('A', 'a@test.local', 'senha123');
    const regB = await AuthService.registerUser('B', 'b@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${regB.token}`)
      .send({ name: 'B', email: 'a@test.local' });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/auth/password', () => {
  it('200 changes password', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senhaAntiga');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ currentPassword: 'senhaAntiga', newPassword: 'senhaNova123' });
    expect(res.status).toBe(200);
  });

  it('401 when current password is wrong', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senhaAntiga');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ currentPassword: 'errada', newPassword: 'senhaNova123' });
    expect(res.status).toBe(401);
  });

  it('400 when newPassword is missing', async () => {
    const reg = await AuthService.registerUser('U', 'u@test.local', 'senhaAntiga');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${reg.token}`)
      .send({ currentPassword: 'senhaAntiga' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
npx vitest run src/routes/auth.test.ts
```

Expected: new tests FAIL — `404` or route not found.

- [ ] **Step 3: Add routes to auth.ts**

Add to `backend/src/routes/auth.ts` after the existing imports:

```typescript
import { authMiddleware } from '../middleware/auth';
import { AuthService, AppError } from '../services/authService';
```

Then append before `export default router;`:

```typescript
router.patch(
  '/profile',
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const updated = await AuthService.updateProfile(req.user!.id, {
        name: req.body.name,
        email: req.body.email,
      });
      res.status(200).json(updated);
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.status).json({ error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

router.patch(
  '/password',
  authMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('currentPassword is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('newPassword must be at least 6 characters'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      await AuthService.updatePassword(req.user!.id, {
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword,
      });
      res.status(200).json({ message: 'Senha alterada com sucesso' });
    } catch (error: any) {
      if (error instanceof AppError) return res.status(error.status).json({ error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);
```

- [ ] **Step 4: Run all auth tests**

```bash
cd backend
npx vitest run src/routes/auth.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/auth.ts backend/src/routes/auth.test.ts
git commit -m "feat(auth): add PATCH /profile and PATCH /password endpoints"
```

---

## Task 5: Settings router — GET/PATCH /api/settings/company

**Files:**
- Create: `backend/src/routes/settings.ts`
- Create: `backend/src/routes/settings.test.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/src/routes/settings.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp } from '../test/app';
import { cleanDatabase, disconnectDatabase } from '../test/db';
import { AuthService } from '../services/authService';

const app = buildTestApp();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('GET /api/settings/company', () => {
  it('200 returns company for logged-in user', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .get('/api/settings/company')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId');
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/settings/company');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/settings/company', () => {
  it('200 upserts company data', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Empresa Teste', cnpj: null, email: null, phone: null, address: 'Rua X', logo: null });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Empresa Teste');
    expect(res.body.address).toBe('Rua X');
  });

  it('401 without token', async () => {
    const res = await request(app)
      .patch('/api/settings/company')
      .send({ name: 'X', cnpj: null, email: null, phone: null, address: null, logo: null });
    expect(res.status).toBe(401);
  });

  it('400 when name is missing', async () => {
    const { token } = await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .patch('/api/settings/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ cnpj: null });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
npx vitest run src/routes/settings.test.ts
```

Expected: FAIL — route not found.

- [ ] **Step 3: Create settings router**

Create `backend/src/routes/settings.ts`:

```typescript
import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { SettingsService } from '../services/settingsService';

const router = Router();

router.get('/company', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const company = await SettingsService.getCompany(req.user!.id);
    res.status(200).json(company);
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch(
  '/company',
  authMiddleware,
  [body('name').trim().notEmpty().withMessage('name is required')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, cnpj, email, phone, address, logo } = req.body;
      const company = await SettingsService.upsertCompany(req.user!.id, {
        name,
        cnpj: cnpj ?? null,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        logo: logo ?? null,
      });
      res.status(200).json(company);
    } catch {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

export default router;
```

- [ ] **Step 4: Register router in server.ts**

In `backend/src/server.ts`, add after the existing imports:

```typescript
import settingsRoutes from './routes/settings';
```

Add after the existing route registrations (before the health check):

```typescript
app.use('/api/settings', settingsRoutes);
```

- [ ] **Step 5: Run tests**

```bash
cd backend
npx vitest run src/routes/settings.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Run all backend tests to verify no regressions**

```bash
cd backend
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/settings.ts backend/src/routes/settings.test.ts backend/src/server.ts
git commit -m "feat(settings): add GET/PATCH /api/settings/company endpoint"
```

---

## Task 6: Frontend settingsStore

**Files:**
- Create: `frontend/src/store/settingsStore.ts`
- Create: `frontend/src/store/settingsStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/store/settingsStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore } from './settingsStore';

beforeEach(() => {
  useSettingsStore.setState({
    theme: 'light',
    language: 'pt-BR',
    primaryColor: '#3b82f6',
    notifications: { lowStock: true, returns: true },
  });
});

describe('settingsStore', () => {
  it('setTheme updates theme', () => {
    act(() => useSettingsStore.getState().setTheme('dark'));
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('setPrimaryColor updates primaryColor', () => {
    act(() => useSettingsStore.getState().setPrimaryColor('#10b981'));
    expect(useSettingsStore.getState().primaryColor).toBe('#10b981');
  });

  it('setNotification toggles a key', () => {
    act(() => useSettingsStore.getState().setNotification('lowStock', false));
    expect(useSettingsStore.getState().notifications.lowStock).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend
npx vitest run src/store/settingsStore.test.ts
```

Expected: FAIL — `Cannot find module './settingsStore'`

- [ ] **Step 3: Create settingsStore**

Create `frontend/src/store/settingsStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationPrefs {
  lowStock: boolean;
  returns: boolean;
}

interface SettingsState {
  theme: 'light' | 'dark';
  language: 'pt-BR';
  primaryColor: string;
  notifications: NotificationPrefs;
  setTheme: (theme: 'light' | 'dark') => void;
  setPrimaryColor: (color: string) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'pt-BR',
      primaryColor: '#3b82f6',
      notifications: { lowStock: true, returns: true },

      setTheme: (theme) => set({ theme }),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setNotification: (key, value) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: value },
        })),
    }),
    { name: 'settings-store' }
  )
);
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/store/settingsStore.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/settingsStore.ts frontend/src/store/settingsStore.test.ts
git commit -m "feat(settings): add settingsStore with theme, color and notification prefs"
```

---

## Task 7: Frontend settingsService

**Files:**
- Create: `frontend/src/services/settingsService.ts`
- Create: `frontend/src/services/settingsService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/services/settingsService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from './settingsService';
import apiClient from './api';

vi.mock('./api');
const mockedApi = vi.mocked(apiClient);

beforeEach(() => vi.clearAllMocks());

describe('settingsService.updateProfile', () => {
  it('calls PATCH /auth/profile', async () => {
    mockedApi.patch = vi.fn().mockResolvedValue({ data: { id: 1, name: 'N', email: 'e@e.com' } });
    const result = await settingsService.updateProfile({ name: 'N', email: 'e@e.com' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/auth/profile', { name: 'N', email: 'e@e.com' });
    expect(result.name).toBe('N');
  });
});

describe('settingsService.updatePassword', () => {
  it('calls PATCH /auth/password', async () => {
    mockedApi.patch = vi.fn().mockResolvedValue({ data: { message: 'ok' } });
    await settingsService.updatePassword({ currentPassword: 'old', newPassword: 'new123' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/auth/password', { currentPassword: 'old', newPassword: 'new123' });
  });
});

describe('settingsService.getCompany', () => {
  it('calls GET /settings/company', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: { id: 1, name: 'Emp' } });
    const result = await settingsService.getCompany();
    expect(mockedApi.get).toHaveBeenCalledWith('/settings/company');
    expect(result.name).toBe('Emp');
  });
});

describe('settingsService.upsertCompany', () => {
  it('calls PATCH /settings/company', async () => {
    const payload = { name: 'Emp', cnpj: null, email: null, phone: null, address: null, logo: null };
    mockedApi.patch = vi.fn().mockResolvedValue({ data: payload });
    const result = await settingsService.upsertCompany(payload);
    expect(mockedApi.patch).toHaveBeenCalledWith('/settings/company', payload);
    expect(result.name).toBe('Emp');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend
npx vitest run src/services/settingsService.test.ts
```

Expected: FAIL — `Cannot find module './settingsService'`

- [ ] **Step 3: Create settingsService**

Create `frontend/src/services/settingsService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/services/settingsService.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/settingsService.ts frontend/src/services/settingsService.test.ts
git commit -m "feat(settings): add settingsService for profile, password and company API calls"
```

---

## Task 8: ConfiguracoesPage shell and CSS

**Files:**
- Create: `frontend/src/pages/ConfiguracoesPage/ConfiguracoesPage.tsx`
- Create: `frontend/src/pages/ConfiguracoesPage/ConfiguracoesPage.module.css`

- [ ] **Step 1: Create CSS**

Create `frontend/src/pages/ConfiguracoesPage/ConfiguracoesPage.module.css`:

```css
.page {
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.header h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.header p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  padding: 20px;
}

.cardTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.divider {
  border: none;
  border-top: 1px solid var(--border, #e2e8f0);
  margin: 12px 0;
}

.sectionLabel {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px;
}

.field {
  margin-bottom: 10px;
}

.fieldLabel {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-input, #f8fafc);
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btnPrimary {
  padding: 7px 14px;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btnPrimary:hover {
  opacity: 0.9;
}

.btnSecondary {
  padding: 7px 14px;
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary);
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.errorMsg {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

.successMsg {
  font-size: 12px;
  color: #10b981;
  margin-top: 4px;
}

.gridTwo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.fullWidth {
  grid-column: 1 / -1;
}

.uploadArea {
  border: 1px dashed var(--border, #cbd5e1);
  border-radius: 4px;
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  background: var(--bg-input, #f8fafc);
}

.logoPreview {
  max-height: 60px;
  max-width: 120px;
  object-fit: contain;
  margin-top: 8px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--bg-secondary, #f8fafc);
  border-radius: 6px;
  margin-bottom: 8px;
}

.rowInfo h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px;
}

.rowInfo p {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
}

.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggleOn {
  background: var(--color-primary, #3b82f6);
}

.toggleOff {
  background: var(--border, #cbd5e1);
}

.toggleKnob {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  transition: left 0.2s;
}

.toggleKnobOn {
  left: 19px;
}

.toggleKnobOff {
  left: 3px;
}

.themeButtons {
  display: flex;
  gap: 6px;
}

.themeBtn {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border, #e2e8f0);
  cursor: pointer;
}

.themeBtnActive {
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border-color: var(--color-primary, #3b82f6);
}

.themeBtnInactive {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-secondary);
}

.colorPalette {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.colorSwatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.colorSwatchActive {
  border-color: var(--text-primary, #0f172a);
}

.hint {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  margin-top: 8px;
}
```

- [ ] **Step 2: Create page shell**

Create `frontend/src/pages/ConfiguracoesPage/ConfiguracoesPage.tsx`:

```tsx
import React from 'react';
import styles from './ConfiguracoesPage.module.css';
import ContaCard from './components/ContaCard';
import EmpresaCard from './components/EmpresaCard';
import AparenciaCard from './components/AparenciaCard';
import NotificacoesCard from './components/NotificacoesCard';

const ConfiguracoesPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Configurações</h1>
        <p>Gerencie suas preferências e dados do sistema</p>
      </div>
      <div className={styles.grid}>
        <ContaCard />
        <EmpresaCard />
        <AparenciaCard />
        <NotificacoesCard />
      </div>
    </div>
  );
};

export default ConfiguracoesPage;
```

- [ ] **Step 3: Write and run page smoke test**

Create `frontend/src/pages/ConfiguracoesPage/ConfiguracoesPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConfiguracoesPage from './ConfiguracoesPage';

vi.mock('./components/ContaCard', () => ({ default: () => <div>ContaCard</div> }));
vi.mock('./components/EmpresaCard', () => ({ default: () => <div>EmpresaCard</div> }));
vi.mock('./components/AparenciaCard', () => ({ default: () => <div>AparenciaCard</div> }));
vi.mock('./components/NotificacoesCard', () => ({ default: () => <div>NotificacoesCard</div> }));

describe('ConfiguracoesPage', () => {
  it('renders all four cards', () => {
    render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
    expect(screen.getByText('ContaCard')).toBeTruthy();
    expect(screen.getByText('EmpresaCard')).toBeTruthy();
    expect(screen.getByText('AparenciaCard')).toBeTruthy();
    expect(screen.getByText('NotificacoesCard')).toBeTruthy();
  });

  it('renders page title', () => {
    render(<MemoryRouter><ConfiguracoesPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeTruthy();
  });
});
```

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/ConfiguracoesPage.test.tsx
```

Expected: PASS (cards are mocked, page renders).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ConfiguracoesPage/
git commit -m "feat(settings): add ConfiguracoesPage shell with CSS"
```

---

## Task 9: ContaCard component

**Files:**
- Create: `frontend/src/pages/ConfiguracoesPage/components/ContaCard.tsx`

- [ ] **Step 1: Write smoke test**

Create `frontend/src/pages/ConfiguracoesPage/components/ContaCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContaCard from './ContaCard';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    user: { id: 1, name: 'Carlos', email: 'carlos@test.com' },
    login: vi.fn(),
  })),
}));

vi.mock('../../../services/settingsService', () => ({
  settingsService: {
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

describe('ContaCard', () => {
  it('renders name and email fields pre-filled', () => {
    render(<ContaCard />);
    expect(screen.getByDisplayValue('Carlos')).toBeTruthy();
    expect(screen.getByDisplayValue('carlos@test.com')).toBeTruthy();
  });

  it('renders save and change password buttons', () => {
    render(<ContaCard />);
    expect(screen.getByText('Salvar dados')).toBeTruthy();
    expect(screen.getByText('Alterar senha')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/ContaCard.test.tsx
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement ContaCard**

Create `frontend/src/pages/ConfiguracoesPage/components/ContaCard.tsx`:

```tsx
import React, { useState } from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { useAuthStore } from '../../../store/authStore';
import { settingsService } from '../../../services/settingsService';

const ContaCard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSaveProfile = async () => {
    try {
      const updated = await settingsService.updateProfile({ name, email });
      login(updated, token!);
      setProfileMsg({ text: 'Dados salvos com sucesso', ok: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao salvar dados';
      setProfileMsg({ text: msg, ok: false });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'As senhas não coincidem', ok: false });
      return;
    }
    try {
      await settingsService.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ text: 'Senha alterada com sucesso', ok: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Erro ao alterar senha';
      setPasswordMsg({ text: msg, ok: false });
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>👤 Minha Conta</h2>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Nome</div>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>E-mail</div>
        <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {profileMsg && (
        <p className={profileMsg.ok ? styles.successMsg : styles.errorMsg}>{profileMsg.text}</p>
      )}
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleSaveProfile}>Salvar dados</button>
      </div>

      <hr className={styles.divider} />
      <p className={styles.sectionLabel}>Segurança</p>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Senha atual</div>
        <input className={styles.input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Nova senha</div>
        <input className={styles.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Confirmar nova senha</div>
        <input className={styles.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      {passwordMsg && (
        <p className={passwordMsg.ok ? styles.successMsg : styles.errorMsg}>{passwordMsg.text}</p>
      )}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={handleChangePassword}>Alterar senha</button>
      </div>
    </div>
  );
};

export default ContaCard;
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/ContaCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ConfiguracoesPage/components/ContaCard.tsx frontend/src/pages/ConfiguracoesPage/components/ContaCard.test.tsx
git commit -m "feat(settings): add ContaCard with profile and password sections"
```

---

## Task 10: EmpresaCard component

**Files:**
- Create: `frontend/src/pages/ConfiguracoesPage/components/EmpresaCard.tsx`

- [ ] **Step 1: Write smoke test**

Create `frontend/src/pages/ConfiguracoesPage/components/EmpresaCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmpresaCard from './EmpresaCard';

vi.mock('../../../services/settingsService', () => ({
  settingsService: {
    getCompany: vi.fn().mockResolvedValue({ name: 'Empresa Teste', cnpj: null, email: null, phone: null, address: null, logo: null }),
    upsertCompany: vi.fn(),
  },
}));

describe('EmpresaCard', () => {
  it('renders without crashing', () => {
    render(<EmpresaCard />);
    expect(screen.getByText('🏢 Dados da Empresa')).toBeTruthy();
  });

  it('renders save button', () => {
    render(<EmpresaCard />);
    expect(screen.getByText('Salvar empresa')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/EmpresaCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement EmpresaCard**

Create `frontend/src/pages/ConfiguracoesPage/components/EmpresaCard.tsx`:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { settingsService } from '../../../services/settingsService';

const EmpresaCard: React.FC = () => {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsService.getCompany().then((data) => {
      if (!data) return;
      setName(data.name ?? '');
      setCnpj(data.cnpj ?? '');
      setEmail(data.email ?? '');
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
      setLogo(data.logo ?? null);
    });
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await settingsService.upsertCompany({
        name: name || 'Minha Empresa',
        cnpj: cnpj || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        logo: logo || null,
      });
      setMsg({ text: 'Empresa salva com sucesso', ok: true });
    } catch {
      setMsg({ text: 'Erro ao salvar empresa', ok: false });
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🏢 Dados da Empresa</h2>
      <div className={styles.gridTwo}>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Nome / Razão Social</div>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>CNPJ</div>
          <input className={styles.input} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Telefone</div>
          <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>E-mail</div>
          <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Endereço</div>
          <input className={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade - UF, CEP" />
        </div>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <div className={styles.fieldLabel}>Logo</div>
          <div className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
            {logo ? (
              <img src={logo} alt="Logo" className={styles.logoPreview} />
            ) : (
              '📎 Clique para fazer upload'
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
        </div>
      </div>
      {msg && <p className={msg.ok ? styles.successMsg : styles.errorMsg}>{msg.text}</p>}
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleSave}>Salvar empresa</button>
      </div>
    </div>
  );
};

export default EmpresaCard;
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/EmpresaCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ConfiguracoesPage/components/EmpresaCard.tsx frontend/src/pages/ConfiguracoesPage/components/EmpresaCard.test.tsx
git commit -m "feat(settings): add EmpresaCard with company fields and logo upload"
```

---

## Task 11: AparenciaCard component

**Files:**
- Create: `frontend/src/pages/ConfiguracoesPage/components/AparenciaCard.tsx`

- [ ] **Step 1: Write smoke test**

Create `frontend/src/pages/ConfiguracoesPage/components/AparenciaCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AparenciaCard from './AparenciaCard';

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({
    theme: 'light',
    primaryColor: '#3b82f6',
    language: 'pt-BR',
    setTheme: vi.fn(),
    setPrimaryColor: vi.fn(),
  })),
}));

describe('AparenciaCard', () => {
  it('renders without crashing', () => {
    render(<AparenciaCard />);
    expect(screen.getByText('🎨 Aparência')).toBeTruthy();
  });

  it('shows theme toggle buttons', () => {
    render(<AparenciaCard />);
    expect(screen.getByText('☀ Claro')).toBeTruthy();
    expect(screen.getByText('🌙 Escuro')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/AparenciaCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement AparenciaCard**

Create `frontend/src/pages/ConfiguracoesPage/components/AparenciaCard.tsx`:

```tsx
import React from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { useSettingsStore } from '../../../store/settingsStore';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
];

const AparenciaCard: React.FC = () => {
  const theme = useSettingsStore((s) => s.theme);
  const primaryColor = useSettingsStore((s) => s.primaryColor);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setPrimaryColor = useSettingsStore((s) => s.setPrimaryColor);

  const handleTheme = (t: 'light' | 'dark') => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const handleColor = (color: string) => {
    setPrimaryColor(color);
    document.documentElement.style.setProperty('--color-primary', color);
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🎨 Aparência</h2>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>Tema</h4>
          <p>Claro ou escuro</p>
        </div>
        <div className={styles.themeButtons}>
          <button
            className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : styles.themeBtnInactive}`}
            onClick={() => handleTheme('light')}
          >
            ☀ Claro
          </button>
          <button
            className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : styles.themeBtnInactive}`}
            onClick={() => handleTheme('dark')}
          >
            🌙 Escuro
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>Idioma</h4>
          <p>Idioma da interface</p>
        </div>
        <span style={{ fontSize: 13 }}>🇧🇷 Português (BR)</span>
      </div>

      <div style={{ marginTop: 8 }}>
        <div className={styles.fieldLabel}>Cor principal</div>
        <div className={styles.colorPalette}>
          {COLORS.map((c) => (
            <button
              key={c}
              className={`${styles.colorSwatch} ${primaryColor === c ? styles.colorSwatchActive : ''}`}
              style={{ background: c }}
              onClick={() => handleColor(c)}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <p className={styles.hint}>As preferências de aparência são salvas automaticamente.</p>
    </div>
  );
};

export default AparenciaCard;
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/AparenciaCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ConfiguracoesPage/components/AparenciaCard.tsx frontend/src/pages/ConfiguracoesPage/components/AparenciaCard.test.tsx
git commit -m "feat(settings): add AparenciaCard with theme, language and color picker"
```

---

## Task 12: NotificacoesCard component

**Files:**
- Create: `frontend/src/pages/ConfiguracoesPage/components/NotificacoesCard.tsx`

- [ ] **Step 1: Write smoke test**

Create `frontend/src/pages/ConfiguracoesPage/components/NotificacoesCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotificacoesCard from './NotificacoesCard';

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({
    notifications: { lowStock: true, returns: true },
    setNotification: vi.fn(),
  })),
}));

describe('NotificacoesCard', () => {
  it('renders without crashing', () => {
    render(<NotificacoesCard />);
    expect(screen.getByText('🔔 Notificações')).toBeTruthy();
  });

  it('shows both notification toggles', () => {
    render(<NotificacoesCard />);
    expect(screen.getByText('Estoque Baixo')).toBeTruthy();
    expect(screen.getByText('Devoluções')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/NotificacoesCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement NotificacoesCard**

Create `frontend/src/pages/ConfiguracoesPage/components/NotificacoesCard.tsx`:

```tsx
import React from 'react';
import styles from '../ConfiguracoesPage.module.css';
import { useSettingsStore } from '../../../store/settingsStore';

const NotificacoesCard: React.FC = () => {
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotification = useSettingsStore((s) => s.setNotification);

  const Toggle: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
    <button
      className={`${styles.toggle} ${on ? styles.toggleOn : styles.toggleOff}`}
      onClick={onToggle}
      aria-pressed={on}
    >
      <span className={`${styles.toggleKnob} ${on ? styles.toggleKnobOn : styles.toggleKnobOff}`} />
    </button>
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>🔔 Notificações</h2>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>📦 Estoque Baixo</h4>
          <p>Alertar quando produto atingir estoque mínimo</p>
        </div>
        <Toggle
          on={notifications.lowStock}
          onToggle={() => setNotification('lowStock', !notifications.lowStock)}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <h4>↩️ Devoluções</h4>
          <p>Alerta quando uma devolução for registrada</p>
        </div>
        <Toggle
          on={notifications.returns}
          onToggle={() => setNotification('returns', !notifications.returns)}
        />
      </div>

      <p className={styles.hint}>As preferências de notificação são salvas automaticamente.</p>
    </div>
  );
};

export default NotificacoesCard;
```

- [ ] **Step 4: Run tests**

```bash
cd frontend
npx vitest run src/pages/ConfiguracoesPage/components/NotificacoesCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ConfiguracoesPage/components/NotificacoesCard.tsx frontend/src/pages/ConfiguracoesPage/components/NotificacoesCard.test.tsx
git commit -m "feat(settings): add NotificacoesCard with low stock and returns toggles"
```

---

## Task 13: Wire up App.tsx and init theme/color on load

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update App.tsx**

In `frontend/src/App.tsx`:

1. Add import at the top (with other store imports):
```tsx
import ConfiguracoesPage from './pages/ConfiguracoesPage/ConfiguracoesPage';
import { useSettingsStore } from './store/settingsStore';
```

2. Inside the `App` function, add a `useEffect` to apply persisted theme and color on init, after the existing `useEffect`:
```tsx
const { theme, primaryColor } = useSettingsStore.getState();

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('--color-primary', primaryColor);
}, []);
```

3. Replace the `/configuracoes` route (currently `<BlankPage title="Configurações" />`):
```tsx
<Route path="/configuracoes" element={<ProtectedLayout isInitializing={isInitializing}><ConfiguracoesPage /></ProtectedLayout>} />
```

- [ ] **Step 2: Run the full frontend test suite**

```bash
cd frontend
npx vitest run
```

Expected: All tests PASS (no regressions).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(settings): wire ConfiguracoesPage into router and init theme/color on load"
```

---

## Task 14: Final integration check

- [ ] **Step 1: Run all backend tests**

```bash
cd backend
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Start the app and verify the page manually**

```bash
docker-compose up -d
```

Open http://localhost:3000, log in, navigate to `/configuracoes`.

Verify:
- Four cards visible in 2×2 grid
- Minha Conta fields pre-filled with logged-in user data
- Dados da Empresa loads existing company name
- Aparência theme toggle changes the page appearance
- Notificações toggles respond to click
- "Salvar dados" updates profile and shows success message
- "Alterar senha" with wrong current password shows error message
- "Salvar empresa" persists company data

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(settings): complete settings page implementation"
```
