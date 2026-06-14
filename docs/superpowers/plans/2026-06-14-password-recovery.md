# Password Recovery via Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email-based password recovery using JWT reset tokens, Nodemailer/SMTP, and an inline three-state LoginForm.

**Architecture:** A stateless reset JWT (`{ userId, purpose: 'password_reset' }`, 1h, signed with `RESET_JWT_SECRET`) is generated on the backend and emailed via Nodemailer. The frontend `LoginForm` gains `'forgot'` and `'reset'` view states; `AuthPage` reads `?token=` from the URL to activate the reset view automatically.

**Tech Stack:** Node.js/Express, Prisma/PostgreSQL, jsonwebtoken, bcrypt, nodemailer, React, Vitest (backend + frontend), @testing-library/react

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/src/services/emailService.ts` | **Create** | Nodemailer singleton + `sendPasswordResetEmail` |
| `backend/src/services/authService.ts` | **Modify** | Add `requestPasswordReset` and `resetPassword` methods |
| `backend/src/routes/auth.ts` | **Modify** | Add `POST /forgot-password` and `POST /reset-password` routes |
| `backend/src/services/authService.test.ts` | **Modify** | Add tests for both new service methods |
| `backend/src/routes/auth.test.ts` | **Modify** | Add route tests for both new endpoints |
| `backend/.env.test` | **Modify** | Add `RESET_JWT_SECRET` and `APP_URL` for tests |
| `frontend/src/services/productService.ts` | **Modify** | Add `forgotPassword` and `resetPassword` to `authService` |
| `frontend/src/components/LoginForm/LoginForm.tsx` | **Modify** | Add `'forgot'` and `'reset'` view states |
| `frontend/src/components/LoginForm/LoginForm.test.tsx` | **Modify** | Add tests for new view states |
| `frontend/src/components/AuthPage.tsx` | **Modify** | Read `?token=` from URL and pass to LoginForm |
| `frontend/src/components/AuthPage.test.tsx` | **Modify** | Add test for token-in-URL activation |

---

## Task 1: Install nodemailer

**Files:**
- Modify: `backend/package.json` (via npm)

- [ ] **Step 1: Install nodemailer and its types**

```bash
cd backend
npm install nodemailer
npm install --save-dev @types/nodemailer
```

Expected output: nodemailer added to `dependencies`, @types/nodemailer to `devDependencies`.

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: install nodemailer"
```

---

## Task 2: Create emailService with a failing test

**Files:**
- Create: `backend/src/services/emailService.ts`
- Create: `backend/src/services/emailService.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/emailService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

import nodemailer from 'nodemailer';
import { sendPasswordResetEmail } from './emailService';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = vi.mocked(nodemailer.createTransport);

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateTransport.mockReturnValue({ sendMail: mockSendMail } as any);
  process.env.SMTP_HOST = 'smtp.test.local';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@test.local';
  process.env.SMTP_PASS = 'testpass';
  process.env.SMTP_FROM = 'Mini ERP <noreply@test.local>';
  process.env.APP_URL = 'http://localhost:5173';
});

describe('sendPasswordResetEmail', () => {
  it('chama sendMail com destinatário e link corretos', async () => {
    await sendPasswordResetEmail('user@example.com', 'tok123');

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('user@example.com');
    expect(call.html).toContain('http://localhost:5173/auth?token=tok123');
  });

  it('propaga erro se sendMail falhar', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(sendPasswordResetEmail('x@x.com', 'tok')).rejects.toThrow('SMTP down');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
npx vitest run src/services/emailService.test.ts
```

Expected: FAIL — `sendPasswordResetEmail` not found.

- [ ] **Step 3: Create emailService.ts**

Create `backend/src/services/emailService.ts`:

```typescript
import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${process.env.APP_URL}/auth?token=${token}`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Recuperação de senha — Mini ERP Web',
    html: `
      <p>Você solicitou a recuperação de senha.</p>
      <p><a href="${link}">Clique aqui para redefinir sua senha</a></p>
      <p>O link expira em 1 hora.</p>
      <p>Se você não solicitou isso, ignore este email.</p>
    `,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
npx vitest run src/services/emailService.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/emailService.ts backend/src/services/emailService.test.ts
git commit -m "feat(backend): add emailService with sendPasswordResetEmail"
```

---

## Task 3: Add requestPasswordReset and resetPassword to authService

**Files:**
- Modify: `backend/src/services/authService.ts`
- Modify: `backend/src/services/authService.test.ts`
- Modify: `backend/.env.test`

- [ ] **Step 1: Add RESET_JWT_SECRET and APP_URL to .env.test**

Open `backend/.env.test` and add these two lines at the end:

```
RESET_JWT_SECRET="test_reset_jwt_secret_local_only"
APP_URL="http://localhost:5173"
```

- [ ] **Step 2: Write failing tests**

Add the following `describe` blocks at the end of `backend/src/services/authService.test.ts`:

```typescript
import { vi } from 'vitest';

vi.mock('../services/emailService', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendPasswordResetEmail } from '../services/emailService';
// NOTE: add this import at the top of the file alongside the existing imports
```

Then add at the end of the file:

```typescript
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
```

Also add `vi` to the existing `import { describe, it, expect, beforeEach, afterAll }` at the top of the file.

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend
npx vitest run src/services/authService.test.ts
```

Expected: FAIL — `requestPasswordReset` and `resetPassword` are not defined.

- [ ] **Step 4: Add the two methods to authService.ts**

At the top of `backend/src/services/authService.ts`, add the import:

```typescript
import { sendPasswordResetEmail } from './emailService';
```

Then add these two static methods at the end of the `AuthService` class, before the closing `}`:

```typescript
  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      (process.env.RESET_JWT_SECRET || 'reset_secret') as string,
      { expiresIn: '1h' } as any
    );

    await sendPasswordResetEmail(email, token);
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: any;
    try {
      payload = jwt.verify(token, (process.env.RESET_JWT_SECRET || 'reset_secret') as string);
    } catch {
      throw new AppError('Token inválido ou expirado', 401);
    }

    if (payload.purpose !== 'password_reset') {
      throw new AppError('Token inválido ou expirado', 401);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: newHash },
    });
  }
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
npx vitest run src/services/authService.test.ts
```

Expected: PASS (all tests including the new ones).

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/authService.ts backend/src/services/authService.test.ts backend/.env.test
git commit -m "feat(backend): add requestPasswordReset and resetPassword to AuthService"
```

---

## Task 4: Add routes POST /forgot-password and POST /reset-password

**Files:**
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/routes/auth.test.ts`

- [ ] **Step 1: Write failing route tests**

Add the following `describe` blocks at the end of `backend/src/routes/auth.test.ts`:

```typescript
import jwt from 'jsonwebtoken';
// (jwt is already imported at the top — just confirm it is)
```

Add at the end of the file:

```typescript
describe('POST /api/auth/forgot-password', () => {
  it('200 com email existente (e não vaza se existe)', async () => {
    await AuthService.registerUser('U', 'u@test.local', 'senha123');
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'u@test.local' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Se o email existir');
  });

  it('200 com email desconhecido (anti-enumeração)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nao@existe.local' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Se o email existir');
  });

  it('400 quando email é inválido', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nao-um-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('200 com token válido e nova senha', async () => {
    const { user } = await AuthService.registerUser('U', 'reset@test.local', 'senhaAntiga');
    const token = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      process.env.RESET_JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'senhaNova123' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('sucesso');
  });

  it('401 com token inválido', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalido.token.aqui', newPassword: 'senhaNova123' });
    expect(res.status).toBe(401);
  });

  it('400 com newPassword menor que 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'qualquer', newPassword: '123' });
    expect(res.status).toBe(400);
  });

  it('400 quando newPassword está ausente', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'qualquer' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
npx vitest run src/routes/auth.test.ts
```

Expected: FAIL — routes not found (404).

- [ ] **Step 3: Mock emailService in route tests**

At the top of `backend/src/routes/auth.test.ts`, add the following mock before the other imports:

```typescript
import { vi } from 'vitest';

vi.mock('../services/emailService', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));
```

- [ ] **Step 4: Add the two routes to auth.ts**

At the end of `backend/src/routes/auth.ts`, before `export default router;`, add:

```typescript
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      await AuthService.requestPasswordReset(req.body.email);
    } catch (error: any) {
      console.error('Forgot password error:', error.message);
    }

    res.status(200).json({ message: 'Se o email existir, você receberá um link em breve' });
  }
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('token is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('newPassword must be at least 6 characters'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      await AuthService.resetPassword(req.body.token, req.body.newPassword);
      res.status(200).json({ message: 'Senha redefinida com sucesso' });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Reset password error:', error.message);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);
```

- [ ] **Step 5: Run all backend tests**

```bash
cd backend
npx vitest run
```

Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/auth.ts backend/src/routes/auth.test.ts
git commit -m "feat(backend): add forgot-password and reset-password routes"
```

---

## Task 5: Add forgotPassword and resetPassword to frontend authService

**Files:**
- Modify: `frontend/src/services/productService.ts`

- [ ] **Step 1: Add the two methods to authService in productService.ts**

In `frontend/src/services/productService.ts`, find the `authService` object (starts at line 36) and add the two new methods after the existing `login` method:

```typescript
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },
```

The `authService` object should now have four methods: `register`, `login`, `forgotPassword`, `resetPassword`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/productService.ts
git commit -m "feat(frontend): add forgotPassword and resetPassword to authService"
```

---

## Task 6: Update LoginForm with forgot and reset view states

**Files:**
- Modify: `frontend/src/components/LoginForm/LoginForm.tsx`
- Modify: `frontend/src/components/LoginForm/LoginForm.test.tsx`

- [ ] **Step 1: Write failing tests**

Add the following `describe` blocks at the end of `frontend/src/components/LoginForm/LoginForm.test.tsx`.

First, update the mock at the top to include the new methods:

```typescript
vi.mock('../../services/productService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
```

Also add `forgotPassword` and `resetPassword` to the destructured mocks after the existing `mockedLogin` line:

```typescript
const mockedForgotPassword = vi.mocked(authService.forgotPassword);
const mockedResetPassword = vi.mocked(authService.resetPassword);
```

Then add at the end of the file:

```typescript
describe('LoginForm — view: forgot', () => {
  it('clicar em "Esqueceu?" troca para a view forgot', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Esqueceu?' }));
    expect(screen.getByRole('heading', { name: 'Recuperar senha' })).toBeInTheDocument();
    expect(screen.getByLabelText('Seu e-mail')).toBeInTheDocument();
  });

  it('submeter email chama forgotPassword e mostra confirmação', async () => {
    mockedForgotPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Esqueceu?' }));
    await user.type(screen.getByLabelText('Seu e-mail'), 'foo@bar.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    await waitFor(() =>
      expect(screen.getByText(/link enviado/i)).toBeInTheDocument()
    );
    expect(mockedForgotPassword).toHaveBeenCalledWith('foo@bar.com');
  });

  it('botão "Voltar" retorna para a view login', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Esqueceu?' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeInTheDocument();
  });
});

describe('LoginForm — view: reset', () => {
  const renderReset = (token = 'valid.reset.token') =>
    render(
      <MemoryRouter>
        <LoginForm
          onSwitchToSignup={vi.fn()}
          resetToken={token}
          onResetSuccess={vi.fn()}
        />
      </MemoryRouter>
    );

  it('renderiza view reset quando resetToken prop é fornecido', () => {
    renderReset();
    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });

  it('mostra erro quando as senhas não coincidem', async () => {
    const user = userEvent.setup();
    renderReset();
    await user.type(screen.getByLabelText('Nova senha'), 'senha123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'diferente');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));
    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it('chama resetPassword e onResetSuccess em sucesso', async () => {
    mockedResetPassword.mockResolvedValue(undefined);
    const onResetSuccess = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginForm
          onSwitchToSignup={vi.fn()}
          resetToken="my.reset.token"
          onResetSuccess={onResetSuccess}
        />
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText('Nova senha'), 'senhaNova123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'senhaNova123');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));
    await waitFor(() => expect(onResetSuccess).toHaveBeenCalled());
    expect(mockedResetPassword).toHaveBeenCalledWith('my.reset.token', 'senhaNova123');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend
npx vitest run src/components/LoginForm/LoginForm.test.tsx
```

Expected: FAIL — `resetToken` prop not defined, `forgotPassword` not defined.

- [ ] **Step 3: Replace LoginForm.tsx with the updated implementation**

Replace the entire content of `frontend/src/components/LoginForm/LoginForm.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';
import styles from './LoginForm.module.css';

type View = 'login' | 'forgot' | 'reset';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  resetToken?: string;
  onResetSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, resetToken, onResetSuccess }) => {
  const [view, setView] = useState<View>(resetToken ? 'reset' : 'login');

  // Login state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);

  // Reset state
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Shared
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const login    = useAuthStore((state) => state.login);

  useEffect(() => {
    if (resetToken) setView('reset');
  }, [resetToken]);

  // ── Login submit ──────────────────────────────────────────────────────────

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha e-mail e senha');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await authService.login(email, password);
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err: any) {
      let msg = 'Falha ao fazer login';
      if (err.response?.status === 401)         msg = 'E-mail ou senha incorretos';
      else if (err.response?.data?.error)       msg = err.response.data.error;
      else if (err.message === 'Network Error') msg = 'Erro de conexão. Verifique sua internet';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot submit ─────────────────────────────────────────────────────────

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await authService.forgotPassword(forgotEmail);
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
        setForgotEmail('');
        setView('login');
      }, 3000);
    } catch {
      setError('Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset submit ──────────────────────────────────────────────────────────

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await authService.resetPassword(resetToken!, newPassword);
      onResetSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Token inválido ou expirado';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render: forgot ────────────────────────────────────────────────────────

  if (view === 'forgot') {
    return (
      <form onSubmit={handleForgotSubmit} className={styles.form}>
        <h2>Recuperar senha</h2>

        {forgotSent ? (
          <div className={styles.successMessage}>
            Link enviado! Verifique seu e-mail.
          </div>
        ) : (
          <>
            {error && (
              <div className={styles.errorMessage}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="forgot-email">Seu e-mail</label>
              <input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Enviando…' : 'Enviar link'}
            </button>
          </>
        )}

        <p className={styles.formSwitch}>
          <button
            type="button"
            onClick={() => { setError(''); setView('login'); }}
            className={styles.linkButton}
            disabled={isLoading}
          >
            Voltar
          </button>
        </p>
      </form>
    );
  }

  // ── Render: reset ─────────────────────────────────────────────────────────

  if (view === 'reset') {
    return (
      <form onSubmit={handleResetSubmit} className={styles.form}>
        <h2>Redefinir senha</h2>

        {error && (
          <div className={styles.errorMessage}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        <div className={styles.formGroup}>
          <div className={styles.labelRow}>
            <label htmlFor="new-password">Nova senha</label>
          </div>
          <div className={styles.passwordWrapper}>
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowNewPassword((v) => !v)}
              aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {showNewPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirm-password">Confirmar nova senha</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Redefinindo…' : 'Redefinir senha'}
        </button>
      </form>
    );
  }

  // ── Render: login (default) ───────────────────────────────────────────────

  return (
    <form onSubmit={handleLoginSubmit} className={styles.form}>
      <h2>Bem-vindo de volta</h2>

      {error && (
        <div className={styles.errorMessage}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      <div className={styles.formGroup}>
        <div className={styles.labelRow}>
          <label htmlFor="login-password">Senha</label>
          <button
            type="button"
            className={styles.forgotLink}
            onClick={() => { setError(''); setView('forgot'); }}
          >
            Esqueceu?
          </button>
        </div>
        <div className={styles.passwordWrapper}>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            className={styles.togglePassword}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Entrando…' : 'Entrar'}
      </button>

      <p className={styles.formSwitch}>
        Não tem conta?{' '}
        <button type="button" onClick={onSwitchToSignup} className={styles.linkButton} disabled={isLoading}>
          Cadastre-se
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
```

- [ ] **Step 4: Run LoginForm tests**

```bash
cd frontend
npx vitest run src/components/LoginForm/LoginForm.test.tsx
```

Expected: PASS (all tests including the new ones).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LoginForm/LoginForm.tsx frontend/src/components/LoginForm/LoginForm.test.tsx
git commit -m "feat(frontend): add forgot and reset view states to LoginForm"
```

---

## Task 7: Update AuthPage to read ?token= from URL

**Files:**
- Modify: `frontend/src/components/AuthPage.tsx`
- Modify: `frontend/src/components/AuthPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add the following `describe` block at the end of `frontend/src/components/AuthPage.test.tsx`:

```typescript
describe('AuthPage — reset token in URL', () => {
  it('passa resetToken para LoginForm quando ?token= está na URL', () => {
    // jsdom doesn't support MemoryRouter query params — we set window.location.search directly
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?token=meu.token.jwt' },
      writable: true,
    });

    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();

    // cleanup
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend
npx vitest run src/components/AuthPage.test.tsx
```

Expected: FAIL — AuthPage doesn't read `?token=`.

- [ ] **Step 3: Update AuthPage.tsx**

Replace the entire content of `frontend/src/components/AuthPage.tsx`:

```typescript
import React, { useState } from 'react';
import LoginForm from '../components/LoginForm/LoginForm';
import SignupForm from './SignupForm/SignupForm';

import styles from './Authpage.module.css';

const AuthPage: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const initialToken = params.get('token') ?? undefined;

  const [activeTab, setActiveTab]   = useState<'login' | 'signup'>('login');
  const [resetToken, setResetToken] = useState<string | undefined>(initialToken);

  const handleResetSuccess = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setResetToken(undefined);
  };

  return (
    <div className={styles.page}>
      {/* ── LEFT PANEL ── */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="Logo" className={styles.logoImg} />
            <span className={styles.logoText}>MINI ERP WEB</span>
          </div>

          <div className={styles.heroText}>
            <h1>Gerencie seus produtos com precisão.</h1>
            <p>
              Visibilidade total do estoque, pedidos e relatórios —
              tudo em um só lugar.
            </p>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statNum}>Funcionalidades</span>
              <span className={styles.statLabel}>Simplificadas</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>Preço</span>
              <span className={styles.statLabel}>Justo</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>4.9★</span>
              <span className={styles.statLabel}>Avaliação</span>
            </div>
          </div>
        </div>

        {/* decorative blobs */}
        <div className={`${styles.blob} ${styles.blobA}`} />
        <div className={`${styles.blob} ${styles.blobB}`} />
        <div className={`${styles.blob} ${styles.blobC}`} />
        <div className={styles.gridOverlay} />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={styles.formSide}>
        {/* Mobile brand header */}
        <div className={styles.mobileBrand}>
          <img src="/logo.png" alt="Logo" className={styles.logoImg} />
          <span className={styles.logoText}>Mini ERP WEB</span>
        </div>

        <div className={styles.formWrapper}>
          {/* Tab switcher */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'login' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'signup' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('signup')}
              type="button"
            >
              Criar conta
            </button>
            <div
              className={styles.tabIndicator}
              style={{ transform: activeTab === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}
            />
          </div>

          {/* Form area */}
          <div className={styles.formArea}>
            {activeTab === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setActiveTab('signup')}
                resetToken={resetToken}
                onResetSuccess={handleResetSuccess}
              />
            ) : (
              <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
            )}
          </div>
        </div>

        <p className={styles.footerNote}>
          © {new Date().getFullYear()} Mini ERP Web · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
```

- [ ] **Step 4: Run all frontend tests**

```bash
cd frontend
npx vitest run
```

Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AuthPage.tsx frontend/src/components/AuthPage.test.tsx
git commit -m "feat(frontend): AuthPage reads ?token= from URL and activates reset view"
```

---

## Task 8: Add successMessage CSS class to LoginForm styles

**Files:**
- Modify: `frontend/src/components/LoginForm/LoginForm.module.css`

- [ ] **Step 1: Check if successMessage class exists**

```bash
grep -n "successMessage" frontend/src/components/LoginForm/LoginForm.module.css
```

If it already exists, skip to Task 9. If not, continue.

- [ ] **Step 2: Add successMessage class**

Open `frontend/src/components/LoginForm/LoginForm.module.css` and add at the end:

```css
.successMessage {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}
```

- [ ] **Step 3: Run all frontend tests**

```bash
cd frontend
npx vitest run
```

Expected: PASS (all tests).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/LoginForm/LoginForm.module.css
git commit -m "style(frontend): add successMessage CSS class to LoginForm"
```

---

## Task 9: Final verification — run all tests

- [ ] **Step 1: Run all backend tests**

```bash
cd backend
npx vitest run
```

Expected: PASS (all existing + new tests).

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend
npx vitest run
```

Expected: PASS (all existing + new tests).

- [ ] **Step 3: Final commit if needed**

If everything passes with no uncommitted changes, you're done. Otherwise:

```bash
git add -A
git commit -m "chore: password recovery feature complete"
```
