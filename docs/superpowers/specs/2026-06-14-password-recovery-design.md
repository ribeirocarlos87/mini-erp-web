# Password Recovery via Email — Design Spec

**Date:** 2026-06-14  
**Status:** Approved

---

## Overview

Add a password recovery flow triggered by the "Esqueceu?" button in the login form. The user provides their email, receives a time-limited link, and redefines their password inline — all without leaving the auth page or navigating to separate routes.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Token strategy | JWT (no DB persistence) | No migration needed; simpler for this scale |
| Token expiry | 1 hour | Industry standard balance of security and convenience |
| Email provider | Nodemailer + SMTP | Generic, no external service dependency |
| Frontend flow | Inline state in LoginForm | Consistent with existing tab-based AuthPage pattern |
| Post-reset action | Redirect to login | User logs in manually after reset |
| Email enumeration | Silent 200 on unknown email | Prevents user enumeration attacks |

---

## Environment Variables (new)

```
RESET_JWT_SECRET=<separate secret from JWT_SECRET>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM="Mini ERP Web <noreply@minierpweb.com>"
APP_URL=http://localhost:5173
```

`RESET_JWT_SECRET` must be different from `JWT_SECRET` to prevent a regular auth token from being used as a reset token.

---

## Backend

### New file: `backend/src/services/emailService.ts`

- Creates a Nodemailer transporter singleton using SMTP env vars.
- Exposes `sendPasswordResetEmail(to: string, token: string): Promise<void>`.
- The reset link sent in the email: `${APP_URL}/auth?token=<jwt>`.
- Throws if SMTP config is missing or send fails (caller handles error).

### Changes to `backend/src/services/authService.ts`

**New method: `requestPasswordReset(email: string): Promise<void>`**
- Looks up user by email.
- If user does not exist: returns silently (no error, no email sent).
- If user exists: signs a JWT with `{ userId, purpose: 'password_reset' }`, expiry `1h`, secret `RESET_JWT_SECRET`. Calls `sendPasswordResetEmail`.

**New method: `resetPassword(token: string, newPassword: string): Promise<void>`**
- Verifies the JWT using `RESET_JWT_SECRET`. Throws `AppError(401)` if invalid or expired.
- Rejects if `payload.purpose !== 'password_reset'`. Throws `AppError(401)`.
- Hashes `newPassword` with bcrypt (cost 10) and updates `user.passwordHash`.

### Changes to `backend/src/routes/auth.ts`

**`POST /auth/forgot-password`**
- No auth middleware.
- Body: `{ email }` — validated as a valid email format.
- Always responds `200 { message: 'Se o email existir, você receberá um link em breve' }`.
- Errors from `emailService` are logged server-side but do not change the 200 response to the client.

**`POST /auth/reset-password`**
- No auth middleware.
- Body: `{ token, newPassword }` — `newPassword` minimum 6 characters.
- On success: `200 { message: 'Senha redefinida com sucesso' }`.
- On invalid/expired token: `401 { error: 'Token inválido ou expirado' }`.
- On validation error: `400 { errors: [...] }`.

---

## Frontend

### Changes to `frontend/src/services/productService.ts` (authService section)

Two new methods on `authService`:

```ts
forgotPassword(email: string): Promise<void>
resetPassword(token: string, newPassword: string): Promise<void>
```

### Changes to `frontend/src/components/LoginForm/LoginForm.tsx`

Introduces a third view state: `view: 'login' | 'forgot' | 'reset'`.

**`'login'` view** — current behavior. "Esqueceu?" button sets `view` to `'forgot'`.

**`'forgot'` view:**
- Single email input field.
- "Enviar link" button calls `authService.forgotPassword(email)`.
- On success: shows confirmation message and returns to `'login'` after 3 seconds.
- "Voltar" button returns immediately to `'login'`.
- Always shows the same success message regardless of whether the email exists.

**`'reset'` view:**
- Activated when `LoginForm` receives a non-empty `resetToken` prop.
- Two fields: "Nova senha" and "Confirmar nova senha".
- Client-side validation: both fields must match and meet minimum 6 characters.
- "Redefinir senha" button calls `authService.resetPassword(token, newPassword)`.
- On success: calls `onResetSuccess()` prop (clears the token from URL and sets `view` to `'login'`).
- On error: displays the error message inline.

**New props on `LoginForm`:**
```ts
resetToken?: string       // present when URL has ?token=
onResetSuccess?: () => void
```

### Changes to `frontend/src/components/AuthPage.tsx`

- On mount, reads `window.location.search` for `?token=`.
- If token is present, passes it to `LoginForm` via `resetToken` prop.
- `onResetSuccess` handler removes the query param from the URL (`history.replaceState`) and clears the token state, causing `LoginForm` to fall back to `'login'` view.

---

## Testing

### Backend unit/integration tests (`authService.test.ts`)

- `requestPasswordReset` with existing email: calls `sendPasswordResetEmail` once with a valid JWT.
- `requestPasswordReset` with unknown email: resolves silently, does not call `sendPasswordResetEmail`.
- `resetPassword` with valid token: updates `passwordHash` in DB.
- `resetPassword` with expired token: throws `AppError(401)`.
- `resetPassword` with wrong purpose JWT: throws `AppError(401)`.
- `resetPassword` with tampered token: throws `AppError(401)`.

### Backend route tests (`auth.test.ts`)

- `POST /auth/forgot-password` always returns 200, even for unknown emails.
- `POST /auth/reset-password` with valid token returns 200.
- `POST /auth/reset-password` with invalid token returns 401.
- `POST /auth/reset-password` with short password returns 400.

### Frontend component tests (`LoginForm.test.tsx`)

- Clicking "Esqueceu?" switches to the `forgot` view.
- Submitting the forgot form calls `authService.forgotPassword`.
- Success shows confirmation message.
- "Voltar" button returns to `login` view.
- When `resetToken` prop is provided, renders the `reset` view directly.
- Mismatched passwords shows a client-side error.
- Successful reset calls `onResetSuccess`.

### `emailService` is mocked in all tests — no real SMTP calls.

---

## Known Limitations

- The reset JWT remains technically valid for 1 hour even after the user successfully resets their password (stateless token — cannot be revoked). This is an accepted trade-off of the JWT-without-persistence approach.
- If the user requests multiple reset emails, all links are valid until they expire individually.
