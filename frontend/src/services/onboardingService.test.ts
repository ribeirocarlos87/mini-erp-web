import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './api';
import { onboardingService } from './onboardingService';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(apiClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('onboardingService', () => {
  it('get chama GET /onboarding', async () => {
    (mocked.get as any).mockResolvedValue({ data: { completed: false } });
    await onboardingService.get();
    expect(mocked.get).toHaveBeenCalledWith('/onboarding');
  });

  it('updatePartial envia PATCH /onboarding com payload', async () => {
    (mocked.patch as any).mockResolvedValue({ data: { completed: false } });
    await onboardingService.updatePartial({ segment: 'moda', salesChannels: ['fisica'] });
    expect(mocked.patch).toHaveBeenCalledWith('/onboarding', {
      segment: 'moda',
      salesChannels: ['fisica'],
    });
  });

  it('complete envia POST /onboarding/complete', async () => {
    (mocked.post as any).mockResolvedValue({ data: { completed: true, completedAt: '2026-05-29T12:00:00Z' } });
    const result = await onboardingService.complete({ whatsapp: '11999998888' });
    expect(mocked.post).toHaveBeenCalledWith('/onboarding/complete', { whatsapp: '11999998888' });
    expect(result.completed).toBe(true);
  });
});
