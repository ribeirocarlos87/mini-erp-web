import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

import nodemailer from 'nodemailer';
import { sendPasswordResetEmail } from './emailService';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = vi.mocked(nodemailer.createTransport);

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateTransport.mockReturnValue({ sendMail: mockSendMail } as any);
  process.env.SMTP_HOST = 'smtp.test.local';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@test.local';
  process.env.SMTP_PASS = 'testpass';
  process.env.SMTP_FROM = 'Mini ERP <noreply@test.local>';
  process.env.APP_URL = 'http://localhost:5173';
});

describe('sendPasswordResetEmail', () => {
  it('chama sendMail com destinatário e link corretos', async () => {
    await sendPasswordResetEmail('user@example.com', 'tok123');

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('user@example.com');
    expect(call.html).toContain('http://localhost:5173/auth?token=tok123');
  });

  it('propaga erro se sendMail falhar', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(sendPasswordResetEmail('x@x.com', 'tok')).rejects.toThrow('SMTP down');
  });
});
