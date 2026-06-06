import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import clientRoutes from './routes/clients';
import productCategoryRoutes from './routes/productCategories';
import productBrandRoutes from './routes/productBrands';
import productCollectionRoutes from './routes/productCollections';
import supplierRoutes from './routes/suppliers';
import employeeRoutes from './routes/employees';
import salesRoutes from './routes/sales';
import reportRoutes from './routes/reports';
import financialRoutes from './routes/financial';
import returnRoutes from './routes/returns';
import settingsRoutes from './routes/settings';

console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
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

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
app.use(cors({
  origin: '*',
}));
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
