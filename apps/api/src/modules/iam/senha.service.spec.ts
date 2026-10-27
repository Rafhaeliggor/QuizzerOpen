import * as argon2 from 'argon2';
import { PARAMETROS_ARGON2, SenhaService } from './senha.service.js';

describe('SenhaService', () => {
  const senhas = new SenhaService();

  it('gera Argon2id com os parâmetros OWASP e verifica', async () => {
    const hash = await senhas.hash('SenhaForte2026');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(await senhas.verificar(hash, 'SenhaForte2026')).toBe(true);
    expect(await senhas.verificar(hash, 'errada')).toBe(false);
    expect(senhas.precisaRehash(hash)).toBe(false);
  });

  it('identifica hash com parâmetros antigos para re-hash no login', async () => {
    const antigo = await argon2.hash('x', { type: argon2.argon2id });
    expect(senhas.precisaRehash(antigo)).toBe(true);
    expect(PARAMETROS_ARGON2.memoryCost).toBe(19_456);
  });

  it('senha temporária tem 16 caracteres sem ambíguos', () => {
    for (let i = 0; i < 20; i++) expect(senhas.gerarTemporaria()).toMatch(/^[A-HJ-NP-Za-km-z2-9@#%&*]{16}$/);
  });
});
