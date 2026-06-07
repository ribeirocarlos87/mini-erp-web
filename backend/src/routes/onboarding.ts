import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  OnboardingService,
  TAX_REGIMES,
  BUSINESS_TYPES,
  SEGMENTS,
  MULTI_STORE_OPTIONS,
  SALES_CHANNELS,
  HEARD_ABOUT,
  CURRENT_CONTROLS,
  IMPROVEMENT_GOALS,
  EQUIPMENT,
  LEARNING_PREFS,
  TECH_LEVELS,
  TUTORIAL_PREFS,
} from '../services/onboardingService';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ── Validators ──
// Todos os campos são optional aqui — o frontend manda só os steps preenchidos.
// A obrigatoriedade dos campos mínimos pro `complete` é validada no service.

const onboardingRules = [
  // Company fields
  body('cnpj').optional({ nullable: true }).custom((v) => v === null || /^\d{14}$/.test(v))
    .withMessage('CNPJ deve ter 14 dígitos numéricos'),
  body('taxRegime').optional().isIn(TAX_REGIMES).withMessage('Regime tributário inválido'),
  body('segment').optional().isIn(SEGMENTS).withMessage('Segmento inválido'),
  body('businessType').optional().isIn(BUSINESS_TYPES).withMessage('Tipo de negócio inválido'),
  body('multiStore').optional().isIn(MULTI_STORE_OPTIONS).withMessage('Opção de multi-loja inválida'),

  // OnboardingResponse fields
  body('salesChannels').optional().isArray({ max: 7 }).withMessage('salesChannels deve ser array'),
  body('salesChannels.*').isIn(SALES_CHANNELS).withMessage('Canal de venda inválido'),

  body('heardAbout').optional().isIn(HEARD_ABOUT).withMessage('Origem inválida'),
  body('currentControl').optional().isIn(CURRENT_CONTROLS).withMessage('Forma de controle inválida'),

  body('improvementGoals').optional().isArray({ max: 6 }).withMessage('improvementGoals deve ser array'),
  body('improvementGoals.*').isIn(IMPROVEMENT_GOALS).withMessage('Objetivo inválido'),

  body('equipment').optional().isArray({ max: 9 }).withMessage('equipment deve ser array'),
  body('equipment.*').isIn(EQUIPMENT).withMessage('Equipamento inválido'),

  body('learningPrefs').optional().isArray({ max: 10 }).withMessage('learningPrefs deve ser array'),
  body('learningPrefs.*').isIn(LEARNING_PREFS).withMessage('Forma de aprendizado inválida'),

  body('techLevel').optional().isIn(TECH_LEVELS).withMessage('Nível tech inválido'),
  body('tutorialPref').optional().isIn(TUTORIAL_PREFS).withMessage('Preferência de tutorial inválida'),

  body('whatsapp').optional().trim().isLength({ min: 10, max: 20 })
    .withMessage('WhatsApp deve ter entre 10 e 20 dígitos')
    .matches(/^[0-9]+$/).withMessage('WhatsApp deve conter apenas dígitos'),
];

/**
 * GET /api/onboarding — retorna o estado atual do onboarding do tenant.
 * Frontend usa para retomar o wizard de onde parou.
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const state = await OnboardingService.get(req.user!.id);
    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/onboarding — aplica patch parcial. Chamado a cada step do wizard.
 * Tolera apenas alguns campos por vez; campos não enviados ficam intocados.
 */
router.patch('/', onboardingRules, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const state = await OnboardingService.updatePartial(req.user!.id, req.body);
    res.json(state);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/onboarding/complete — último step do wizard. Aplica patch final
 * e marca o onboarding como completo (User.onboardingCompletedAt = now()).
 * Após isso, o frontend libera acesso à área logada.
 */
router.post('/complete', onboardingRules, async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const state = await OnboardingService.complete(req.user!.id, req.body);
    res.json(state);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
