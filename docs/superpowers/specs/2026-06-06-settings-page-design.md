# Settings Page Design

**Date:** 2026-06-06  
**Status:** Approved

## Overview

Replace the `BlankPage` placeholder at `/configuracoes` with a full settings page composed of four section cards displayed in a 2×2 responsive grid.

## Architecture

**Approach: frontend-first, no new Prisma tables for preferences.**

- `settingsStore` (Zustand + persist) stores UI preferences (theme, language, primary color) and notification toggles in `localStorage`. Same pattern as `pdvStore`.
- Account profile (name, email) and password changes hit two new endpoints on the existing `auth` router.
- Company data hits a new `settings` router backed by the existing `Company` table — with a migration to add the missing `address` and `logo` fields.
- PDV settings remain at their existing route (`/pdv/configuracoes`) — not merged here.

## Schema Changes

`Company` model needs two new optional fields:

```prisma
address  String? @db.VarChar(255)
logo     String? @db.Text  // stored as URL/base64
```

One Prisma migration required.

## Backend

### New endpoints on `auth` router

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `PATCH` | `/api/auth/profile` | `{ name, email }` | Update user name/email. Requires auth. |
| `PATCH` | `/api/auth/password` | `{ currentPassword, newPassword }` | Change password. Requires auth. Validates current password before hashing new one. |

### New `settings` router (`/api/settings`)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/api/settings/company` | — | Return company data for logged-in user. Creates empty record if none exists (upsert). |
| `PATCH` | `/api/settings/company` | `{ name, cnpj, email, phone, address, logo }` | Upsert company data. All fields optional. |

All endpoints protected by `authMiddleware`. `userId` always taken from `req.user.id`.

### AuthService additions

- `updateProfile(userId, { name, email })` — updates `User`. Validates email uniqueness.
- `updatePassword(userId, { currentPassword, newPassword })` — verifies bcrypt hash, rejects if wrong, saves new hash.

### SettingsService (new)

- `getCompany(userId)` — `findUnique` by `userId`, returns `null` if not found.
- `upsertCompany(userId, data)` — Prisma `upsert` on `userId`.

## Frontend

### New files

```
frontend/src/stores/settingsStore.ts          # Zustand + persist
frontend/src/services/settingsService.ts      # API calls for profile, password, company
frontend/src/pages/ConfiguracoesPage/
  ConfiguracoesPage.tsx
  ConfiguracoesPage.module.css
  components/
    ContaCard.tsx          # name, email + security section
    EmpresaCard.tsx        # company fields + logo upload
    AparenciaCard.tsx      # theme toggle, language select, color picker
    NotificacoesCard.tsx   # toggles for low stock + returns
```

### settingsStore shape

```ts
interface SettingsState {
  theme: 'light' | 'dark'
  language: 'pt-BR'           // only one value now, field reserved for future
  primaryColor: string        // hex value, one of 5 preset options
  notifications: {
    lowStock: boolean
    returns: boolean
  }
  setTheme: (theme: 'light' | 'dark') => void
  setPrimaryColor: (color: string) => void
  setNotification: (key: keyof SettingsState['notifications'], value: boolean) => void
}
```

Persisted via `zustand/middleware/persist` to `localStorage` key `settings-store`.

### Theme application

`AparenciaCard` calls `document.documentElement.setAttribute('data-theme', theme)` on change and on app init (`App.tsx` reads store on mount). CSS variables in `variables.css` are scoped to `[data-theme="dark"]`.

### Primary color application

Five preset hex values. On change, sets `document.documentElement.style.setProperty('--color-primary', hex)`. Same init pattern as theme.

### ContaCard behavior

- Two independent form sections within one card, separated by a `<hr>`.
- "Salvar dados" submits name + email via `settingsService.updateProfile()`, then updates `authStore` with new user data.
- "Alterar senha" submits current + new + confirm password. Validates `newPassword === confirmPassword` on the client before submitting. Shows inline error on wrong current password (401 from API).

### EmpresaCard behavior

- On mount, fetches `GET /api/settings/company` and populates fields.
- Logo: `<input type="file" accept="image/*">`. Preview shown after selection. Converts to base64 before sending.
- "Salvar empresa" submits all fields via `PATCH /api/settings/company`.

### NotificacoesCard and AparenciaCard

No submit button — changes auto-save to store on toggle/select. Toast feedback ("Preferências salvas") optional.

## Layout

- Page grid: `display: grid; grid-template-columns: 1fr 1fr; gap: 16px`
- Responsive: single column below `768px` breakpoint (uses existing `--breakpoint-md` token)
- Each card: `background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px`

## Testing

- **Backend unit tests:** `AuthService.updateProfile`, `AuthService.updatePassword` (wrong password rejection), `SettingsService.getCompany` (creates on first call), `SettingsService.upsertCompany`.
- **Backend route tests:** All 4 new endpoints — 200/400/401 cases.
- **Frontend store test:** `settingsStore` — set theme, set color, toggle notification.
- **Frontend service test:** mock `apiClient` for `updateProfile`, `updatePassword`, `getCompany`, `upsertCompany`.
- **Frontend component smoke tests:** render each of the 4 cards without crashing.
- **Frontend page test:** `ConfiguracoesPage` renders all 4 cards.

## Out of scope

- PDV settings (remain at `/pdv/configuracoes`)
- Multi-device preference sync (preferences stay in localStorage)
- Language switching (field added but only PT-BR available)
- Notification delivery mechanism (toggles only affect frontend alert display, no email/push)
