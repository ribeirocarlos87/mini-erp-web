# Mini ERP — Solução Web para Pequenos Lojistas

ERP web **multi-tenant** para varejistas. Cobre o ciclo completo: cadastros, estoque, PDV, devoluções com geração de crédito, financeiro e 12 relatórios. Cada usuário é um tenant isolado por `userId` — toda query Prisma filtra por ele, sem exceção.

---

## ✨ O que faz

- **Cadastros**: produtos com ficha completa (fiscal NCM/CFOP/ICMS, dimensões, e-commerce SEO), clientes (com saldo de crédito), fornecedores, funcionários, categorias, marcas, coleções.
- **Estoque**: controle de quantidade, mínimo/máximo, alertas de baixo estoque, entradas avulsas.
- **PDV (Ponto de Venda)**: wizard de 4 etapas (Produtos → Cliente → Pagamento → Finalizar) com múltiplas formas de pagamento, descontos por item ou na venda, e consumo de **saldo de crédito** do cliente.
- **Devoluções**: 3 modos — Troca, Devolver Pagamento, Gerar Crédito. Devolução cumulativa rastreada (não pode devolver mais do que foi vendido).
- **Financeiro**: despesas, receitas, despesas recorrentes (MENSAL/SEMANAL/QUINZENAL/ANUAL), renegociação de dívida.
- **Relatórios** (12): Vendas, Comissões, Canais de Vendas, Caixas, Formas de Pagamento, DFC, Desempenho de Produto, Vendas por Categoria, Inventário, Clientes, Ciclo de Vida (RFV), Crédito de Clientes.

---

## 🏗️ Arquitetura

```mermaid
graph LR
    User[👤 Usuário] -->|HTTPS| Frontend
    Frontend[Frontend<br/>React 18 + Vite] -->|Bearer JWT| Backend
    Backend[Backend<br/>Express + Prisma] -->|SQL| DB[(PostgreSQL 15)]
    Frontend -.localStorage.-> LS[(token<br/>pdv-store)]

    style Frontend fill:#dbeafe,stroke:#2563eb
    style Backend fill:#dcfce7,stroke:#16a34a
    style DB fill:#fef3c7,stroke:#d97706
```

### Stack

| Camada | Tech |
|---|---|
| Backend | Node.js + **TypeScript strict**, Express 4, Prisma 5, PostgreSQL 15 |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` (rounds ≥ 10) |
| Validação | `express-validator` em todas as rotas de escrita |
| Frontend | React 18 + Vite 5, **TypeScript strict**, `react-router-dom` v6 |
| Estado | `zustand` (com `persist` no PDV) |
| HTTP | `axios` com interceptor JWT em [frontend/src/services/api.ts](frontend/src/services/api.ts) |
| Estilo | **CSS Modules** + variáveis CSS (sem Tailwind, sem CSS-in-JS) |
| Animação | `framer-motion` |
| Ícones | `lucide-react` (única biblioteca) |
| **Testes** | **Vitest** + Testing Library + happy-dom + supertest |

---

## 🔄 Fluxo de uma requisição protegida

```mermaid
sequenceDiagram
    autonumber
    participant F as Frontend
    participant M as authMiddleware
    participant V as express-validator
    participant H as Route Handler
    participant S as Service
    participant P as Prisma
    participant D as PostgreSQL

    F->>M: GET /api/products + Bearer JWT
    M->>M: verify JWT → req.user = { id, email }
    alt token inválido
        M-->>F: 401 Invalid token
    end
    M->>V: next()
    V->>V: rules.run(req)
    alt validação falha
        V-->>F: 400 { errors: [...] }
    end
    V->>H: next()
    H->>S: Service.method(req.user.id, body)
    S->>P: findMany({ where: { userId } })
    P->>D: SELECT ... WHERE user_id = $1
    D-->>P: rows
    P-->>S: data
    S-->>H: dto
    H-->>F: 200 JSON
```

**Invariante crítico:** o `userId` da query vem SEMPRE de `req.user.id` (preenchido pelo middleware a partir do JWT), nunca do body/query/headers. Esse é o pilar do isolamento multi-tenant.

---

## 🗄️ Modelo de dados (principais entidades)

```mermaid
erDiagram
    User ||--o| Company : possui
    User ||--o{ Product : tem
    User ||--o{ Client : tem
    User ||--o{ Supplier : tem
    User ||--o{ Employee : tem
    User ||--o{ Sale : registra
    User ||--o{ Return : registra
    User ||--o{ FinancialTransaction : registra

    Product }o--|| ProductCategory : pertence
    Product }o--|| ProductBrand : pertence
    Product }o--|| ProductCollection : pertence
    Product }o--|| Supplier : fornecido_por
    Product ||--o{ ProductImage : tem

    Sale ||--|{ SaleItem : contém
    Sale ||--|{ SalePayment : pago_via
    Sale }o--|| Client : feita_para
    Sale }o--|| Employee : vendida_por
    SaleItem }o--|| Product : referencia

    Return }o--|| Sale : devolve_de
    Return }o--|| Product : produto_devolvido
    Return }o--|| Client : credito_para

    Client {
        int id
        string name
        decimal creditBalance "Saldo a usar em compras"
    }

    Sale {
        int id
        decimal totalValue
        decimal discount
        decimal surcharge
        date saleDate
    }

    Return {
        int id
        string resolutionMethod "TROCA | DEVOLVER_PAGAMENTO | GERAR_CREDITO"
        decimal refundValue "unitPrice histórico × quantity"
    }
```

**Decisões de schema importantes:**
- Decimais monetários: `Decimal(10,2)`; `creditBalance` é `Decimal(12,2)` (headroom).
- `Sale` → `SaleItem`/`SalePayment` com `onDelete: Cascade`. `SaleItem` → `Product` com `Restrict` (não pode deletar produto com venda).
- Unicidade por tenant: `@@unique([userId, code])` em produto, `@@unique([userId, name])` em categoria/marca/coleção.
- Soft-delete não usado — preferimos `Restrict` em FKs com histórico.

Schema canônico em [backend/prisma/schema.prisma](backend/prisma/schema.prisma).

---

## 💸 Fluxo crítico: venda com saldo de crédito do cliente

Esse é o invariante mais sensível do sistema — débito de saldo precisa ser **atômico** contra corrida (dois caixas vendendo ao mesmo cliente).

```mermaid
sequenceDiagram
    autonumber
    participant F as Frontend (PDV)
    participant S as SaleService
    participant P as Prisma $transaction
    participant T as Tabelas

    F->>S: createSale({ client_id, items, payments: [..., credit_balance] })
    S->>S: ✓ Cliente pertence ao tenant
    S->>S: ✓ Produtos pertencem ao tenant
    S->>S: ✓ Vendedor pertence ao tenant (NOVO — fix segurança)
    S->>S: ✓ Estoque suficiente
    S->>S: ✓ Soma pagamentos = total
    S->>S: ✓ Saldo do cliente ≥ valor solicitado (pré-voo)

    S->>P: BEGIN
    P->>T: INSERT Sale
    P->>T: INSERT SaleItem[]
    P->>T: INSERT SalePayment[] (cardBrand=null para credit_balance)
    P->>T: UPDATE Product SET quantityStock -= qty (por item)

    Note over P,T: Débito ATÔMICO do saldo:<br/>UPDATE Client SET creditBalance -= X<br/>WHERE id=? AND userId=? AND creditBalance >= X

    alt updateMany.count !== 1 (perdeu corrida)
        P->>P: throw 409 → REVERT tudo
    end

    P->>T: INSERT FinancialTransaction (RECEITA, "Crédito utilizado")
    P->>P: COMMIT
    P-->>S: ok
    S-->>F: 201 Sale completa
```

Cobertura: o teste `'corrida: duas vendas simultâneas drenando todo o saldo — apenas uma sucede'` em [backend/src/services/saleService.test.ts](backend/src/services/saleService.test.ts) usa `Promise.allSettled` para validar esse gate.

---

## 📂 Estrutura

```
projeto/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Fonte de verdade do modelo
│   │   └── migrations/            # 8 migrations versionadas
│   └── src/
│       ├── server.ts              # Bootstrap Express
│       ├── middleware/auth.ts     # JWT
│       ├── routes/                # 12 rotas (1 por entidade)
│       ├── services/              # Lógica de negócio + Prisma
│       ├── db/prismaClient.ts
│       └── test/                  # Setup, factories, helpers de teste
├── frontend/
│   └── src/
│       ├── App.tsx                # Roteamento + ProtectedLayout
│       ├── pages/                 # 38 páginas (hub, CRUD, PDV, relatórios)
│       ├── components/            # 13 reutilizáveis (Sidebar, PDVCart, etc.)
│       ├── services/              # Wrappers axios (1 por entidade)
│       ├── store/                 # zustand: authStore + pdvStore
│       └── styles/globals/        # Design tokens + reset
├── .github/workflows/tests.yml    # CI: Postgres + suite completa
├── docker-compose.yml             # Stack de dev
├── docker-compose.test.yml        # Postgres isolado para testes (porta 5434)
└── package.json                   # Scripts agregadores (test, test:db:up/down)
```

**Convenção:** uma página = uma pasta com `.tsx` + `.module.css` coirmãos.

---

## 🧪 Testes

Suíte cobrindo **backend completo + stores/services/components/pages do frontend**.

```mermaid
graph TB
    subgraph "Backend (249 testes, 27 arquivos)"
        BS[12 services<br/>156 testes]
        BR[12 rotas<br/>78 testes]
        BM[middleware/auth<br/>6 testes]
        BI[infra db/factories<br/>9 testes]
    end

    subgraph "Frontend (248 testes, 71 arquivos)"
        FS[13 services axios<br/>71 testes]
        FT[2 stores zustand<br/>25 testes]
        FC[13 componentes<br/>74 testes]
        FP[38 páginas<br/>78 testes]
    end

    BS -.usa.-> Postgres[(Postgres real<br/>port 5434<br/>tmpfs)]
    BR -.usa.-> Postgres
    FS -.mock.-> AxiosMock[apiClient mockado]
    FC -.usa.-> happydom[happy-dom]
    FP -.usa.-> happydom

    style Postgres fill:#fef3c7,stroke:#d97706
    style happydom fill:#dbeafe,stroke:#2563eb
```

**Total: 497 testes passando, 0 skips, ~55 segundos.**

### Estratégia

| Camada | Estratégia | Justificativa |
|---|---|---|
| Backend services | **Postgres real isolado** (Docker, port 5434, tmpfs) | Testa transações Prisma, P2002, race conditions, integridade FK de verdade |
| Backend rotas | **supertest** contra app Express in-memory | Valida validators + status codes + ownership end-to-end |
| Frontend services | Mock de `apiClient` | Verifica URL/payload/normalização sem rede |
| Frontend stores | `setState` reset + assertions diretas | Testa lógica de cart, descontos, persistência |
| Frontend componentes/páginas | Testing Library + happy-dom | Render + interações + mocks de services/router |

### Como rodar

```bash
npm run test:db:up       # sobe Postgres de teste (Docker, porta 5434)
npm test                 # backend + frontend
npm run test:backend     # só backend (~28s)
npm run test:frontend    # só frontend (~25s)
npm run test:coverage    # com cobertura v8
npm run test:db:down     # derruba o container de teste
```

### Cobertura por área crítica

- **Transação atômica de venda** — débito de saldo com `updateMany({ where: { creditBalance: { gte: X } } })` testado com `Promise.allSettled` (2 vendas simultâneas drenando todo o saldo → apenas uma vence, saldo nunca negativo).
- **Geração de SKU** — retry de 5 tentativas em `P2002`, prefixo normalizado (acentos/uppercase/3 letras), isolamento por tenant.
- **3 modos de devolução** — TROCA não mexe em financeiro; DEVOLVER_PAGAMENTO cria FT DESPESA; GERAR_CREDITO incrementa `Client.creditBalance` + FT DESPESA.
- **Ownership cross-tenant** — todas as FKs vindas do cliente (categoryId, brandId, collectionId, supplierId, sellerId, clientId, productId) validadas antes de persistir.
- **JWT** — token ausente, prefixo errado, expirado, outra secret, válido.

---

## 🔐 Segurança multi-tenant

### Pilares

1. **`req.user.id` é a ÚNICA fonte de `userId`** — nunca aceitar do body/query/headers.
2. **Toda query Prisma filtra por `userId`** — inclusive em `findFirst`/`findUnique` antes de update/delete.
3. **FKs vindas do cliente são validadas** contra o tenant antes de persistir. Sem isso, atacante linka seu produto a recursos de outro tenant e vaza dados via `include`.
4. **Identificadores de negócio** (SKU, código de barras, nº de pedido) são SEMPRE gerados server-side. Valor enviado pelo cliente é ignorado em `create`.
5. **Unicidade por tenant** via `@@unique([userId, <campo>])` no schema. Em race conditions, retry em `P2002`.
6. **Validação rigorosa** com `express-validator` em todas as rotas de escrita.

### Auditoria recente

A suíte de testes capturou uma vulnerabilidade real durante o desenvolvimento: o ProductService e o SaleService aceitavam FKs (`categoryId`, `brandId`, `collectionId`, `supplierId`, `seller_id`) sem validar ownership. Fix aplicado nos commits `ccd937b` e `31298d6` — agora todos esses campos passam por `findFirst({ id, userId })` antes de gravar. Cobertura adicional: 11 novos testes ativos.

Detalhes completos em [.claude/CLAUDE.md](.claude/CLAUDE.md) (knowledge base) e [CLAUDE.md](CLAUDE.md) (regras).

---

## 🚀 Como rodar

### Pré-requisitos

- Node.js ≥ 18
- Docker + Docker Compose
- (opcional) PostgreSQL 15 local se não usar Docker

### Stack completa via Docker (recomendado)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Acessos:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **pgAdmin**: http://localhost:5050 (admin@admin.com / admin)

### Local (sem Docker)

```bash
# Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev          # ts-node em watch

# Frontend (outro terminal)
cd frontend
npm install
npm run dev          # Vite em http://localhost:3000
```

### Variáveis de ambiente

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_erp"
JWT_SECRET="troque_em_producao"
JWT_EXPIRY="7d"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

---

## 🔗 API (resumo)

Todas as rotas (exceto `/api/auth/*` e `/health`) exigem header `Authorization: Bearer <JWT>`.

| Prefixo | Operações | Service |
|---|---|---|
| `/api/auth` | POST `/register`, `/login` | [authService.ts](backend/src/services/authService.ts) |
| `/api/products` | CRUD + `/low-stock` | [productService.ts](backend/src/services/productService.ts) |
| `/api/product-categories` | CRUD | [productCategoryService.ts](backend/src/services/productCategoryService.ts) |
| `/api/product-brands` | CRUD | — |
| `/api/product-collections` | CRUD | — |
| `/api/clients` | CRUD + `/:id/purchases` | [clientService.ts](backend/src/services/clientService.ts) |
| `/api/suppliers` | CRUD | — |
| `/api/employees` | CRUD | — |
| `/api/sales` | POST, GET (com filtros), GET `/:id` | [saleService.ts](backend/src/services/saleService.ts) |
| `/api/returns` | POST, GET `/by-sale/:saleId` | [returnService.ts](backend/src/services/returnService.ts) |
| `/api/financial` | `/transactions` + `/recurring` | [financialService.ts](backend/src/services/financialService.ts) |
| `/api/reports` | 12 endpoints | [reportService.ts](backend/src/services/reportService.ts) |

Mapa de rotas frontend em [frontend/src/App.tsx](frontend/src/App.tsx).

---

## 🔄 CI/CD

GitHub Actions ([.github/workflows/tests.yml](.github/workflows/tests.yml)) roda em todo PR e push em `main`:

```mermaid
graph LR
    PR[Pull Request / Push main] --> Backend
    PR --> Frontend
    Backend[Job backend<br/>Postgres service container] --> BTests[npm test]
    Frontend[Job frontend<br/>Node 20] --> FTests[npm test]
    BTests -.|✓ 249 passing|.-> Done[CI ✅]
    FTests -.|✓ 248 passing|.-> Done
```

Cache de dependências baseado em `package-lock.json` por pacote, Postgres 15 como service container na porta 5434.

---

## 🎨 Design system (resumo)

Tokens em [frontend/src/styles/globals/variables.css](frontend/src/styles/globals/variables.css). **Nunca cravar cor/espaçamento literal** — sempre `var(--token)`.

| Token | Valor |
|---|---|
| `--color-primary` | `#2563eb` |
| `--color-success` | `#10b981` |
| `--color-error` | `#ef4444` |
| Espaçamento base | 8px (`--spacing-md`) |
| Raio default | 8px (`--radius-md`) |
| Transição padrão | `0.2s ease` |
| Breakpoints | sm 640 · md 768 · lg 1024 · xl 1200 |

Ícones: única biblioteca é `lucide-react`. Tamanhos: 18 (botões), 24 (cabeçalhos), 48 (estados vazios).

---

## 🧰 Comandos úteis

```bash
# Backend
cd backend && npm run dev              # ts-node em watch
cd backend && npx tsc --noEmit         # type-check
cd backend && npx prisma migrate dev   # nova migration (CUIDADO em prod)
cd backend && npx prisma studio        # GUI do banco

# Frontend
cd frontend && npm run dev             # Vite
cd frontend && npm run build           # tsc + vite build

# Testes (raiz)
npm run test:db:up                     # sobe Postgres de teste
npm test                               # tudo
npm run test:coverage                  # com cobertura
```

⚠️ **Nunca rodar `prisma migrate deploy` contra produção sem autorização explícita.**

---

## 🐛 Troubleshooting

| Problema | Solução |
|---|---|
| Erro conexão PostgreSQL | `docker compose logs postgres` ou conferir `.env` |
| 401 Invalid token no login | `localStorage.clear()` no DevTools + reload |
| Conflito de porta 5434 (test DB) | Outro container Postgres ocupando — `docker ps` |
| Migrations divergentes | `npx prisma migrate status` para inspecionar |
| Testes falhando localmente | `npm run test:db:up` antes; se persistir, `npm run test:db:down && up` |

---

## 📋 Dívidas técnicas conhecidas

| Local | Problema |
|---|---|
| [backend/src/server.ts:52-54](backend/src/server.ts) | Segundo `app.use(cors({ origin: '*' }))` após CORS restrito — anula a proteção. Remover. |
| [backend/src/middleware/auth.ts:24](backend/src/middleware/auth.ts) | Fallback `'secret'` em `JWT_SECRET \|\| 'secret'` — tornar obrigatório. |
| `frontend/src/components/ProductForm/` vs `frontend/src/pages/CriarProdutoPage/` | Forms legado e novo coexistem. Consolidar no novo. |

---

## 👥 Autores

- Laís Peroni
- Nilton Cezar Oliveira dos Santos
- Vitor Giovane Laguna de Souza

Orientadora: Prof. Ms. Stéfani Mano Valmini

Projeto desenvolvido no curso de Análise e Desenvolvimento de Sistemas — Centro Universitário Uniftec.

---

**Status atual**: PDV completo · Devoluções com saldo de crédito · 12 relatórios · 497 testes passando · CI configurada
