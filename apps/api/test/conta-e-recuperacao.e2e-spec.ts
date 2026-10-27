import type { INestApplication } from '@nestjs/common';
import { generate } from 'otplib';
import type { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { EmailService } from '../src/infra/email/email.service.js';
import { cenarios } from './cenarios.js';
import { autenticar, criarApp, limparBanco, SENHA } from './utilitarios.js';

/** Lote 7 — e-mail opcional, recuperação de senha, convite, códigos de recuperação do MFA, política, delegação com validade. */
describe('Conta e recuperação — e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let caixa: EmailService['caixaDeSaida'];
  const c = cenarios(() => app);
  const http = () => c.http();
  const tokenDoLink = (texto: string) => /token=([A-Za-z0-9_-]{43})/.exec(texto)?.[1] ?? '';
  const esperar = async (cond: () => boolean) => {
    for (let i = 0; i < 50 && !cond(); i++) await new Promise((r) => setTimeout(r, 20));
  };

  beforeEach(async () => {
    ({ app, prisma } = await criarApp());
    await limparBanco(prisma);
    caixa = app.get(EmailService).caixaDeSaida;
    caixa.length = 0;
  });
  afterEach(() => app.close());

  it('esqueci minha senha: resposta igual para e-mail inexistente, link de uso único, sessões encerradas', async () => {
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    expect((await http().get('/api/v1/auth/recursos').expect(200)).body).toEqual({ emailHabilitado: true });

    const naoExiste = await http().post('/api/v1/auth/senha/esqueci').send({ email: 'ninguem@teste.local' }).expect(200);
    const existe = await http().post('/api/v1/auth/senha/esqueci').send({ email: 'PROF@teste.local' }).expect(200);
    expect(existe.body).toEqual(naoExiste.body);
    expect(caixa).toHaveLength(1);
    expect(caixa[0]!.para).toBe('prof@teste.local');
    expect(caixa[0]!.texto).toContain('https://quizzer.teste/redefinir-senha?token=');
    const token = tokenDoLink(caixa[0]!.texto);
    expect(await prisma.redefinicaoSenha.count({ where: { tokenHash: token } })).toBe(0); // só o hash no banco

    await http().post('/api/v1/auth/senha/redefinir').send({ token, novaSenha: 'curta' }).expect(400);
    await http().post('/api/v1/auth/senha/redefinir').send({ token, novaSenha: 'NovaSenhaSegura2026' }).expect(200);
    const reuso = await http().post('/api/v1/auth/senha/redefinir').send({ token, novaSenha: 'OutraSenhaSegura2026' }).expect(400);
    expect(reuso.body.codigo).toBe('TOKEN_INVALIDO');

    await http().get('/api/v1/auth/me').set('Authorization', prof.auth).expect(401); // sessões revogadas
    await http().post('/api/v1/auth/profissional/login').send({ email: 'prof@teste.local', senha: SENHA }).expect(401);
    await http().post('/api/v1/auth/profissional/login').send({ email: 'prof@teste.local', senha: 'NovaSenhaSegura2026' }).expect(200);

    // Link expirado
    await http().post('/api/v1/auth/senha/esqueci').send({ email: 'prof@teste.local' }).expect(200);
    const t2 = tokenDoLink(caixa.at(-1)!.texto);
    await prisma.redefinicaoSenha.updateMany({ where: { usadoEm: null }, data: { expiraEm: new Date(Date.now() - 1000) } });
    await http().post('/api/v1/auth/senha/redefinir').send({ token: t2, novaSenha: 'NovaSenhaSegura2027' }).expect(400);
  });

  it('cadastro pela administração envia convite para definir a senha', async () => {
    const admin = await autenticar(app, prisma, 'ADMINISTRADOR', { email: 'admin@teste.local' });
    const r = await http().post('/api/v1/usuarios').set('Authorization', admin.auth)
      .send({ nome: 'Nova Professora', email: 'nova@teste.local', papel: 'PROFESSOR' }).expect(201);
    expect(r.body.conviteEnviado).toBe(true);
    const convite = caixa.find((m) => m.para === 'nova@teste.local')!;
    expect(convite.assunto).toBe('Seu acesso ao Quizzer');
    await http().post('/api/v1/auth/senha/redefinir').send({ token: tokenDoLink(convite.texto), novaSenha: 'SenhaDaNova2026' }).expect(200);
    const login = await http().post('/api/v1/auth/profissional/login').send({ email: 'nova@teste.local', senha: 'SenhaDaNova2026' }).expect(200);
    expect(login.body.usuario.trocarSenha).toBe(false);
  });

  it('códigos de recuperação do MFA: uso único no login, aviso ao titular e regeneração com o app', async () => {
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    const { body: cad } = await http().post('/api/v1/minha-conta/mfa/iniciar').set('Authorization', aluno.auth).expect(200);
    const { body: conf } = await http().post('/api/v1/minha-conta/mfa/confirmar').set('Authorization', aluno.auth)
      .send({ codigo: await generate({ secret: cad.segredo }) }).expect(200);
    expect(conf.codigosRecuperacao).toHaveLength(10);
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email: 'aluno@teste.local' } });
    expect(usuario.mfaCodigosRecuperacao).toHaveLength(10);
    expect(usuario.mfaCodigosRecuperacao).not.toContain(conf.codigosRecuperacao[0]);

    const entrarCom = async (codigo: string) => {
      const l = await http().post('/api/v1/auth/aluno/login').send({ login: 'aluno@teste.local', senha: SENHA }).expect(200);
      return http().post('/api/v1/auth/mfa/verificar').send({ mfaToken: l.body.mfaToken, codigo });
    };
    const ok = await entrarCom(conf.codigosRecuperacao[0].toLowerCase().replace('-', ''));
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('AUTENTICADO');
    expect((await entrarCom(conf.codigosRecuperacao[0])).status).toBe(401); // uso único
    expect((await entrarCom('ZZZZ-ZZZZ')).status).toBe(401);

    const notif = await prisma.notificacao.findFirst({ where: { usuarioId: usuario.id, tipo: 'MFA_RECUPERACAO_USADA' } });
    expect(notif?.mensagem).toContain('Restam 9');
    await esperar(() => caixa.some((m) => m.assunto === 'Código de recuperação usado'));
    expect(caixa.some((m) => m.assunto === 'Código de recuperação usado')).toBe(true);

    const sit = await http().get('/api/v1/minha-conta/mfa').set('Authorization', `Bearer ${ok.body.accessToken}`).expect(200);
    expect(sit.body.codigosRecuperacaoRestantes).toBe(9);
    await http().post('/api/v1/minha-conta/mfa/codigos-recuperacao').set('Authorization', `Bearer ${ok.body.accessToken}`)
      .send({ codigo: '000000' }).expect(400);
    await prisma.usuario.update({ where: { id: usuario.id }, data: { mfaUltimoPasso: null } });
    const novos = await http().post('/api/v1/minha-conta/mfa/codigos-recuperacao').set('Authorization', `Bearer ${ok.body.accessToken}`)
      .send({ codigo: await generate({ secret: cad.segredo }) }).expect(200);
    expect(novos.body.codigosRecuperacao).toHaveLength(10);
    expect((await entrarCom(conf.codigosRecuperacao[1])).status).toBe(401); // antigos invalidados
  });

  it('política de privacidade: pendente até registrar ciência; preferência de e-mail das notificações', async () => {
    const aluno = await autenticar(app, prisma, 'ALUNO', { email: 'aluno@teste.local' });
    expect((await http().get('/api/v1/auth/me').set('Authorization', aluno.auth)).body).toMatchObject({
      politicaPendente: true,
      notificacoesPorEmail: true,
    });
    // Aceite de um texto que não é o vigente (frontend desatualizado) é recusado.
    await http().post('/api/v1/minha-conta/politica/aceitar').set('Authorization', aluno.auth).send({ versao: '2000-01-01' }).expect(409);
    expect((await http().get('/api/v1/auth/me').set('Authorization', aluno.auth)).body.politicaPendente).toBe(true);
    const { body } = await http().post('/api/v1/minha-conta/politica/aceitar').set('Authorization', aluno.auth)
      .send({ versao: '2026-10-27' }).expect(200);
    expect(body.versao).toBe('2026-10-27');
    expect((await http().get('/api/v1/auth/me').set('Authorization', aluno.auth)).body.politicaPendente).toBe(false);
    expect(await prisma.eventoAuditoria.count({ where: { acao: 'POLITICA_ACEITA', usuarioId: aluno.usuario.id } })).toBe(1);

    // Notificação vira e-mail; desligada a preferência, não.
    const prof = await autenticar(app, prisma, 'PROFESSOR', { email: 'prof@teste.local' });
    const revisor = await autenticar(app, prisma, 'PROFESSOR', { email: 'revisor@teste.local' });
    const q = await c.questaoPublicada(prof.auth, revisor.auth, {
      disciplina: 'X', dificuldade: 'FACIL', formato: 'VERDADEIRO_FALSO', enunciado: 'Afirmação.', alternativaCorreta: 0,
    });
    const provaId = await c.provaPublicada(prof.auth, [{ versaoQuestaoId: q.versaoId, peso: 100 }]);
    const turmaId = await c.turmaCom(prof.auth, ['aluno@teste.local']);
    await c.aplicar(prof.auth, provaId, turmaId);
    await esperar(() => caixa.some((m) => m.para === 'aluno@teste.local' && m.assunto === 'Nova prova disponível'));
    expect(caixa.find((m) => m.assunto === 'Nova prova disponível')?.texto).toContain('https://quizzer.teste/aluno');

    await http().patch('/api/v1/minha-conta/preferencias').set('Authorization', aluno.auth).send({ notificacoesPorEmail: false }).expect(200);
    caixa.length = 0;
    await c.aplicar(prof.auth, provaId, turmaId);
    await new Promise((r) => setTimeout(r, 200));
    expect(caixa.filter((m) => m.para === 'aluno@teste.local')).toHaveLength(0);
  });

  it('delegação com validade: vence sozinha', async () => {
    const coord = await autenticar(app, prisma, 'COORDENADOR', { email: 'coord@teste.local' });
    const profAuth = (await autenticar(app, prisma, 'PROFESSOR', { email: 'prof2@teste.local' })).auth;
    const alvo = await prisma.usuario.findUniqueOrThrow({ where: { email: 'prof2@teste.local' } });
    await http().put(`/api/v1/permissoes/usuarios/${alvo.id}/CONSULTAR_AUDITORIA`).set('Authorization', coord.auth)
      .send({ justificativa: 'x', expiraEm: '2020-01-01T00:00:00Z' }).expect(400);
    const amanha = new Date(Date.now() + 86_400_000).toISOString();
    const r = await http().put(`/api/v1/permissoes/usuarios/${alvo.id}/CONSULTAR_AUDITORIA`).set('Authorization', coord.auth)
      .send({ justificativa: 'Plantão de hoje', expiraEm: amanha }).expect(200);
    expect(r.body[0]).toMatchObject({ expirada: false });
    await http().get('/api/v1/auditoria').set('Authorization', profAuth).expect(200);

    await prisma.permissaoDelegada.updateMany({ where: { usuarioId: alvo.id }, data: { expiraEm: new Date(Date.now() - 1000) } });
    // Revogar outra permissão limpa o cache de 30 s deste usuário (efeito imediato no teste).
    await http().post(`/api/v1/permissoes/usuarios/${alvo.id}/REABRIR_TENTATIVAS/revogar`).set('Authorization', coord.auth)
      .send({ justificativa: 'x' }).expect(200);
    await http().get('/api/v1/auditoria').set('Authorization', profAuth).expect(403);
    const lista = await http().get(`/api/v1/permissoes/usuarios/${alvo.id}`).set('Authorization', coord.auth).expect(200);
    expect(lista.body[0].expirada).toBe(true);
  });
});
