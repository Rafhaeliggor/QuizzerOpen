import { identificadorCredencial } from './throttlers.js';

describe('identificadorCredencial', () => {
  it('normaliza caixa e espaços do e-mail/login', () => {
    expect(identificadorCredencial({ body: { email: ' Ana@X.com ' } })).toBe(
      identificadorCredencial({ body: { email: 'ana@x.com' } }),
    );
  });

  it('não expõe o identificador em texto claro na chave', () => {
    expect(
      identificadorCredencial({ body: { login: '2026000001' } }),
    ).not.toContain('2026000001');
  });

  it('distingue identificadores diferentes e usa o Authorization como fallback', () => {
    const a = identificadorCredencial({ body: { email: 'a@x.com' } });
    const b = identificadorCredencial({ body: { email: 'b@x.com' } });
    const c = identificadorCredencial({
      body: {},
      headers: { authorization: 'Bearer abc' },
    });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});
