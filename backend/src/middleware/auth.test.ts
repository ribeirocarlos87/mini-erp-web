import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from './auth';

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('authMiddleware', () => {
  it('rejeita 401 quando header Authorization está ausente', () => {
    const req = { headers: {} } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejeita 401 quando header não começa com "Bearer "', () => {
    const req = { headers: { authorization: 'Basic abc' } } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejeita 401 com token inválido', () => {
    const req = { headers: { authorization: 'Bearer token.invalido.aqui' } } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejeita 401 com token assinado por outra secret', () => {
    const token = jwt.sign({ id: 1, email: 'x@y.com' }, 'outra_secret');
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejeita 401 com token expirado', () => {
    const token = jwt.sign({ id: 1, email: 'x@y.com' }, process.env.JWT_SECRET!, { expiresIn: -1 });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('chama next() e popula req.user quando token é válido', () => {
    const token = jwt.sign({ id: 42, email: 'ok@test.local' }, process.env.JWT_SECRET!);
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ id: 42, email: 'ok@test.local' });
    expect(res.status).not.toHaveBeenCalled();
  });
});
