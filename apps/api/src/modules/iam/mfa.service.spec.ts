import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { generate } from 'otplib';
import { gerarCodigosRecuperacao, hashCodigoRecuperacao, MfaService } from './mfa.service.js';

describe('MfaService', () => {
  const config = new ConfigService({
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    MFA_ISSUER: 'Quizzer Teste',
  });
  const mfa = new MfaService(config as never);

  it('aceita o código TOTP atual', async () => {
    const segredo = mfa.gerarSegredo();
    const codigo = await generate({ secret: segredo });
    const resultado = await mfa.verificarCodigo(segredo, codigo);
    expect(resultado.valido).toBe(true);
    expect(resultado.passo).toEqual(expect.any(Number));
  });

  it('rejeita reutilização do mesmo código (replay)', async () => {
    const segredo = mfa.gerarSegredo();
    const codigo = await generate({ secret: segredo });
    const primeiro = await mfa.verificarCodigo(segredo, codigo);
    const segundo = await mfa.verificarCodigo(segredo, codigo, primeiro.passo);
    expect(segundo.valido).toBe(false);
  });

  it('rejeita código de outro segredo e formato inválido', async () => {
    const codigo = await generate({ secret: mfa.gerarSegredo() });
    expect((await mfa.verificarCodigo(mfa.gerarSegredo(), codigo)).valido).toBe(
      false,
    );
    expect(
      (await mfa.verificarCodigo(mfa.gerarSegredo(), 'abc123')).valido,
    ).toBe(false);
  });

  it('gera URI otpauth e QR code para cadastro', async () => {
    const dados = await mfa.gerarDadosCadastro(
      mfa.gerarSegredo(),
      'admin@quizzer.local',
    );
    expect(dados.otpauthUri).toMatch(/^otpauth:\/\/totp\/.*issuer=Quizzer/);
    expect(dados.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('segredo cifrado não expõe o texto claro e é reversível', () => {
    const segredo = mfa.gerarSegredo();
    const cifrado = mfa.cifrarSegredo(segredo);
    expect(cifrado).not.toContain(segredo);
    expect(mfa.decifrarSegredo(cifrado)).toBe(segredo);
  });
});

describe('códigos de recuperação do MFA (ADR-0042)', () => {
  it('gera 10 códigos únicos XXXX-XXXX sem caracteres ambíguos e guarda só o hash', () => {
    const { codigos, hashes } = gerarCodigosRecuperacao();
    expect(codigos).toHaveLength(10);
    expect(new Set(codigos).size).toBe(10);
    for (const c of codigos) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(hashes[0]).toBe(hashCodigoRecuperacao(codigos[0]!));
    expect(hashes[0]).not.toContain(codigos[0]!.slice(0, 4));
  });

  it('aceita o código digitado em minúsculas, sem hífen ou com espaços', () => {
    const h = hashCodigoRecuperacao('ABCD-2345');
    expect(hashCodigoRecuperacao('abcd2345')).toBe(h);
    expect(hashCodigoRecuperacao(' abcd-2345 ')).toBe(h);
  });
});
