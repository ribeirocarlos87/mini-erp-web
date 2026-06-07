# Quick Start

## Stack completa via Docker (recomendado)

```bash
docker compose up --build
```

Acessos após subir:

| Serviço | URL | Credenciais |
|---|---|---|
| Frontend | http://localhost:3000 | — |
| Backend API | http://localhost:3001 | — |
| pgAdmin | http://localhost:5050 | admin@admin.com / admin |
| PostgreSQL | localhost:5432 | postgres / postgres |

O backend roda `prisma migrate deploy` automaticamente na inicialização — nenhuma configuração manual de banco necessária.

---

## Desenvolvimento local (sem Docker)

### Pré-requisitos

- Node.js ≥ 18
- PostgreSQL 15 rodando localmente na porta 5432

### Backend

```bash
cd backend
npm install
cp .env.example .env   # edite DATABASE_URL se necessário
npx prisma migrate deploy
npm run dev            # porta 3001
```

### Frontend (outro terminal)

```bash
cd frontend
npm install
npm run dev            # porta 5173 (Vite dev server)
```

### Variáveis de ambiente (`backend/.env`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_erp"
JWT_SECRET="troque_em_producao"
JWT_EXPIRY="7d"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

---

## Testes

```bash
npm run test:db:up       # sobe Postgres de teste isolado (porta 5434)
npm test                 # backend + frontend (497 testes)
npm run test:backend     # só backend
npm run test:frontend    # só frontend
npm run test:coverage    # com cobertura v8
npm run test:db:down     # derruba container de teste
```

---

## Troubleshooting

| Problema | Solução |
|---|---|
| Porta 3000 em uso | `docker compose down` ou encerre o processo ocupando a porta |
| Erro de conexão PostgreSQL | Verifique `DATABASE_URL` no `.env` ou `docker compose logs postgres` |
| 401 no login após rebuild | `localStorage.clear()` no console do browser + reload |
| Migrations divergentes | `npx prisma migrate status` dentro de `backend/` |
| Testes falhando localmente | Rode `npm run test:db:up` antes; se persistir, `npm run test:db:down && npm run test:db:up` |
| Porta 5434 em uso | Outro container Postgres ocupando — `docker ps` para identificar |
