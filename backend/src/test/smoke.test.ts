import { describe, it, expect } from 'vitest';

describe('Vitest smoke test', () => {
  it('roda no ambiente node', () => {
    expect(1 + 1).toBe(2);
  });

  it('tem acesso a process.env', () => {
    expect(typeof process.env).toBe('object');
  });
});
