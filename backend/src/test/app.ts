import express, { Express } from 'express';
import authRoutes from '../routes/auth';
import productRoutes from '../routes/products';
import clientRoutes from '../routes/clients';
import productCategoryRoutes from '../routes/productCategories';
import productBrandRoutes from '../routes/productBrands';
import productCollectionRoutes from '../routes/productCollections';
import supplierRoutes from '../routes/suppliers';
import employeeRoutes from '../routes/employees';
import salesRoutes from '../routes/sales';
import reportRoutes from '../routes/reports';
import financialRoutes from '../routes/financial';
import returnRoutes from '../routes/returns';
import settingsRoutes from '../routes/settings';
import onboardingRoutes from '../routes/onboarding';

/**
 * Constrói uma instância do app Express IDÊNTICA à do server.ts, mas sem `listen()`.
 * Usada pelo supertest para testar rotas e middlewares de ponta a ponta sem
 * abrir uma porta de rede.
 *
 * NOTA: não replicamos o segundo `app.use(cors({ origin: '*' }))` que existe
 * em server.ts (dívida técnica conhecida, conforme CLAUDE.md raiz).
 */
export function buildTestApp(): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/product-categories', productCategoryRoutes);
  app.use('/api/product-brands', productBrandRoutes);
  app.use('/api/product-collections', productCollectionRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/financial', financialRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/onboarding', onboardingRoutes);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'OK' });
  });

  return app;
}

/**
 * Helper para emitir um JWT válido para um userId/email — usar em testes que
 * precisam passar pelo authMiddleware.
 */
export function signTestToken(userId: number, email: string): string {
  const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
  return jwt.sign({ id: userId, email }, process.env.JWT_SECRET!);
}
