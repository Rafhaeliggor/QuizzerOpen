# Checklist final de segurança

Revisão obrigatória do plano (Seção 3, item 4; Dev B, Sprint 4) sobre todo o código gerado com
apoio de IA. Data: 2026-10-10, atualizado em 2026-10-11 (etapa de uso real). Itens marcados ✅ foram **verificados** (comando ou teste citado),
não apenas presumidos.

## Autenticação e sessão

- ✅ Senhas com Argon2id (parâmetros OWASP, re-hash transparente) — `senha.service.spec.ts`, `auth.e2e-spec.ts`.
- ✅ Mensagem genérica e tempo equalizado para usuário inexistente — `auth.e2e-spec.ts`.
- ✅ Bloqueio após N falhas (senha e MFA), notificação ao titular e auditoria.
- ✅ MFA TOTP obrigatório para Admin/Coordenação; segredo cifrado AES-256-GCM; anti-replay.
- ✅ Access token só em memória; refresh httpOnly + SameSite=Strict + path restrito; rotação e
  detecção de reuso; `Secure` quando `TLS_ATIVO=true`.
- ✅ Desativação, mudança de papel/e-mail, reset de senha e reset de MFA encerram as sessões — `usuarios-admin.e2e-spec.ts`.
- ✅ Desativação/logout/LGPD cortam o access token em até 30 s (ADR-0027) — `usuarios-admin.e2e-spec.ts`, `lgpd.e2e-spec.ts`.

## Autorização

- ✅ Guard global com negação por padrão; papel + ambiente em toda rota — `auth.guard.spec.ts`.
- ✅ Escopo por dono do recurso (404 fora do escopo) — `fluxo-completo.e2e-spec.ts` (professor alheio, aluno intruso).
- ✅ Gabarito nunca enviado durante a prova (e2e); no resultado, só conforme a política da prova (ADR-0035) — `politicas-e-relatorios.e2e-spec.ts`.
- ✅ Delegação de permissões: catálogo fechado, só gestão concede, só a professor/corretor, justificativa auditada, removida ao mudar o papel (ADR-0033) — `acesso-e-conta.e2e-spec.ts`, `auth.guard.spec.ts`.
- ✅ Alteração de questão de alto risco exige aprovação de outra pessoa — `questoes-formatos.e2e-spec.ts`.
- ✅ Sessão única por tentativa — e2e e Playwright.

## Entrada de dados e injeção

- ✅ `ValidationPipe` com `whitelist` + `forbidNonWhitelisted` em todos os DTOs.
- ✅ Sem SQL bruto inseguro: `grep queryRawUnsafe|executeRawUnsafe` só encontra o client gerado e o utilitário de teste (SQL fixo).
- ✅ Sem `eval` ou `new Function` no frontend/API (grep). `dangerouslySetInnerHTML` **só** no
  `TextoRico`, com saída MathML do KaTeX (`trust: false`, escape do próprio KaTeX, sem estilos inline,
  limites de expansão) — `TextoRico.test.tsx` confere que texto comum não vira HTML (ADR-0047).
- ✅ CSV exportado neutraliza fórmulas (`= + - @`) — `csv.spec.ts`.
- ✅ Corpo JSON limitado a 1 MB; CSV de importação limitado a 1000 linhas.
- ✅ **Upload de mídia** (ADR-0032): tipo pela assinatura do arquivo (SVG/HTML/PDF recusados mesmo
  renomeados), 5 MB, nome aleatório de 128 bits (sem caminho do usuário — `..%2F` dá 404), servido
  com `nosniff` + `CSP: sandbox` + `Content-Type` fixo — `midias.spec.ts`, `questoes-formatos.e2e-spec.ts`.
- ✅ Eventos de comportamento: horário do cliente só se plausível, teto de 500 por tentativa.

## Abuso e disponibilidade

- ✅ Rate limit por IP+identificador nas credenciais, por IP no PIN, flood geral por IP; Nginx com zona de login — `auth.e2e-spec.ts`.
- ✅ Turma inteira no mesmo IP não é bloqueada — e2e (30 identificadores) e teste de carga (100 alunos).
- ✅ Tempo da prova controlado só pelo servidor; envio idempotente.

## Segredos e configuração

- ✅ Nenhum segredo com valor padrão; validação no boot (zod); `.env` fora do git e do contexto Docker.
- ✅ Busca por segredos literais em `apps/`, `infra/`, `.github/`: nenhum fora de configuração de testes.
- ✅ Seed bloqueado em produção sem `SEED_PERMITIR_PRODUCAO=true`.

## Transporte e cabeçalhos

- ✅ CSP restritiva (`script-src 'self'; style-src 'self'`, sem inline), `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy: no-referrer` (`curl -I`); `x-powered-by` desligado; `server_tokens off`.
- ✅ HTTPS pronto em três modos (ADR-0029): TLS 1.2/1.3, HSTS só em HTTPS, cookies `Secure`, redirecionamento — verificado em modo autoassinado.
- ✅ O ambiente de homologação é público em HTTPS com Let's Encrypt (`https://203-0-113-10.sslip.io`, ADR-0056) desde 2026-10-20; HTTP só redireciona. Produção exige `TLS_MODO=letsencrypt` com o domínio da instituição.
- ⚠️ Homologação pública com as contas de demonstração do seed (senha comum conhecida; professor/aluno sem MFA), sem firewall ativo e com SSH por senha — trocar as senhas ou desativar as contas não usadas.

## Infraestrutura e dependências

- ✅ API como usuário não-root (uid 1000), filesystem somente leitura, `no-new-privileges`.
- ✅ Nginx sem root (`nginx-unprivileged`, uid 101).
- ✅ Postgres/Redis só em redes internas; Redis com senha.
- ✅ `npm audit`: **0 vulnerabilidades** (overrides de `mysql2`/`deepmerge-ts`; CLI do Prisma fora do runtime).
- ✅ Scripts de instalação npm só para pacotes aprovados (`allowScripts`).
- ✅ Auditoria imutável no banco (trigger) — e2e confirma que `DELETE` falha; preservada no backup.
- ✅ Monitor `read_only`, `cap_drop: ALL`; Dependabot e `npm audit` semanal (ADR-0036).
- ✅ MFA opcional para todos; desativar exige senha + código; ativar encerra as outras sessões (ADR-0034).
- ✅ Códigos de recuperação: uso único, só hash no banco, falha conta para o bloqueio, aviso ao titular (ADR-0042).
- ✅ Recuperação de senha: resposta neutra, token de 256 bits só no e-mail (hash no banco), 30 min, uso
  único, 3 pedidos/30 min, sessões encerradas ao redefinir (ADR-0041) — `conta-e-recuperacao.e2e-spec.ts`.
- ✅ Rotas de execução com teto por sessão (300/min) além do bloqueio por IP nas credenciais.
- ✅ Excel exportado nunca contém fórmula (células de texto *inline*) — `xlsx.spec.ts`.
- ✅ Deploy: manual, CI verde, *environment* protegido, fingerprint SSH fixo (ADR-0046).
- ✅ Chaves de integração: segredo de 256 bits só como hash, comparação em tempo constante, escopos,
  validade e revogação; JWT de usuário não acessa a API de integração e vice-versa (ADR-0051).
- ✅ SSE: fluxo fecha a cada 60 s e o guard revalida sessão/token; sinal sem conteúdo (ADR-0050).
- ✅ Fila de e-mail não guarda mensagens com link de acesso.
- ✅ Correção às cegas e corretores designados (menor exposição de dados a quem corrige).
- ✅ Impressão de ordenação/associação sem gabarito não revela a ordem salva (`QuestaoEstruturada.test.tsx`).

### Revisão de 2026-10-26 (leitura do código por área)

- ✅ Escopo do Corretor: permissão delegada não amplia o acesso a aplicações, recursos e relatórios ([BUG-041](../bugs-corrigidos.md#bug-041)).
- ✅ Dependências sem vulnerabilidades conhecidas em produção (`npm audit --omit=dev`, AJ-108).
- ✅ Gabarito não dedutível em associação e ordenação: IDs opacos por instância ([BUG-042](../bugs-corrigidos.md#bug-042), ADR-0057).
- ✅ Correção, dupla correção e decisão de recurso com trava de linha ([BUG-043](../bugs-corrigidos.md#bug-043)).
- ✅ Sem enumeração de contas pelo bloqueio ([BUG-048](../bugs-corrigidos.md#bug-048)) e matrícula sem dados de terceiros ([BUG-051](../bugs-corrigidos.md#bug-051)).
- ✅ Renovação de sessão tolerante a abas simultâneas, mantendo a detecção de reuso fora da janela de 30 s ([BUG-047](../bugs-corrigidos.md#bug-047)).
- ✅ Correção às cegas sem IDs do aluno e da tentativa na resposta ([BUG-046](../bugs-corrigidos.md#bug-046)).
- ✅ Campo `pagina` com teto nas listagens ([BUG-052](../bugs-corrigidos.md#bug-052)).

## Pendências de segurança (não bloqueiam a homologação, bloqueiam produção)

Todas verificadas automaticamente por `infra/vps/verificar-producao.sh` (roteiro em `docs/operacao/implantacao.md`):

- [ ] Emitir o certificado Let's Encrypt para o domínio da instituição (mecanismo testado de ponta a ponta em homologação — ADR-0056, BUG-026 corrigido).
- [x] ~~Seed em produção~~ — produção usa `prisma/criar-admin.ts`; o verificador bloqueia contas `@quizzer.local`.
- [ ] Executar `infra/vps/provisionar.sh` no VPS real (ufw, SSH só por chave, fail2ban).
- [x] ~~Backups fora do VPS, criptografados, com alerta~~ — mecanismo pronto (feature 018); configurar o remoto real.
- [x] ~~LGPD: exclusão/anonimização~~ — feature 019; falta revisão jurídica da política de privacidade.
- [x] ~~Auditoria com dado pessoal~~ — `TENTATIVA_INICIADA` não grava mais o nome (BUG-013).
- [x] ~~Dependabot / `npm audit` agendado~~ — `.github/dependabot.yml` e `seguranca.yml` (lote 6); o Dependabot já abre PRs no GitHub (imagens Docker, Actions e npm) — revisar antes do merge.
- [x] ~~Rota interna de métricas~~ — bloqueada no Nginx sem diferenciar maiúsculas (ADR-0054); só o monitor lê pela rede interna.
- [x] ~~HSTS preload~~ — decisão no ADR-0055 (desligado por padrão).
