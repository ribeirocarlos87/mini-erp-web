import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService, AppError } from '../services/authService';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;
      const result = await AuthService.registerUser(name, email, password);

      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Register error:', error.message);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const result = await AuthService.loginUser(email, password);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
);

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

export default router;
