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
