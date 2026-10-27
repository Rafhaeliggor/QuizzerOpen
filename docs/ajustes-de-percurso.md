# Ajustes de percurso

Registro de coisas **não previstas no plano** que, no caminho, precisaram ser **criadas**,
**removidas** ou **substituídas** — arquivos de template, dependências, configurações,
ferramentas do ambiente. Serve para quem revisa entender por que algo existe (ou sumiu).

Decisões de arquitetura continuam nos [ADRs](adr/README.md); defeitos corrigidos ficam em
[bugs-corrigidos.md](bugs-corrigidos.md). Cada entrada tem código `AJ-NNN` (não reutilizar).

**Tipo:** `Criado` · `Removido` · `Substituído` · `Revertido`

## Resumo

| Código | Data | Tipo | O quê | Onde |
|---|---|---|---|---|
| [AJ-001](#aj-001) | 2026-10-10 | Criado | Node.js 24 e Docker instalados na máquina de desenvolvimento | sistema |
| [AJ-002](#aj-002) | 2026-10-10 | Substituído | Versões escolhidas diferentes da "latest" de alguns pacotes | `package.json` |
| [AJ-003](#aj-003) | 2026-10-10 | Criado | Lista `allowScripts` (npm 11 bloqueia scripts de instalação) | `package.json` raiz |
| [AJ-004](#aj-004) | 2026-10-10 | Removido | Skills de agentes de IA baixadas pelo `prisma init` | `apps/api` |
| [AJ-005](#aj-005) | 2026-10-10 | Substituído | `prisma7.config.ts` + `dotenv` → `prisma.config.ts` + `process.loadEnvFile` | `apps/api` |
| [AJ-006](#aj-006) | 2026-10-10 | Removido | Arquivos de exemplo dos templates Nest e Vite | `apps/api`, `apps/web` |
| [AJ-007](#aj-007) | 2026-10-10 | Removido | Dependências `vite-tsconfig-paths` e `@nestjs/mau` | `apps/api` |
| [AJ-008](#aj-008) | 2026-10-10 | Substituído | `.gitignore` por app → `.gitignore` único na raiz | raiz |
| [AJ-009](#aj-009) | 2026-10-10 | Criado | `strict` e tipos de teste no `tsconfig.app.json` do web | `apps/web` |
| [AJ-010](#aj-010) | 2026-10-10 | Criado | Banco `quizzer_test` separado para os e2e | `infra/postgres` |
| [AJ-011](#aj-011) | 2026-10-10 | Criado | `configurar-app.ts` compartilhado entre `main.ts` e e2e | `apps/api/src` |
| [AJ-012](#aj-012) | 2026-10-10 | Substituído | `COOKIE_SECURE` → `TLS_ATIVO` | env |
| [AJ-013](#aj-013) | 2026-10-10 | Criado | Variáveis `RATE_LIMIT_POR_IP`, `RATE_LIMIT_CREDENCIAIS`, `TRUST_PROXY` | env |
| [AJ-014](#aj-014) | 2026-10-10 | Revertido | Tentativa de reduzir a imagem da API com `--omit=peer` | `apps/api/Dockerfile` |
| [AJ-015](#aj-015) | 2026-10-10 | Removido | `'unsafe-inline'` do `style-src` da CSP | `infra/nginx` |
| [AJ-016](#aj-016) | 2026-10-10 | Criado | Snippet `proxy-api.conf` do Nginx | `infra/nginx` |
| [AJ-017](#aj-017) | 2026-10-10 | Substituído | Reorganizações no frontend por causa do Fast Refresh | `apps/web/src` |
| [AJ-018](#aj-018) | 2026-10-10 | Criado | Utilitários de teste e override do oxlint para arquivos de teste | `apps/web` |
| [AJ-019](#aj-019) | 2026-10-10 | Criado | Playwright + Chromium para validação manual da UI (fora do repositório) | scratchpad |
| [AJ-020](#aj-020) | 2026-10-10 | Substituído | Nomes dos usuários do seed | `prisma/seed.ts` |
| [AJ-021](#aj-021) | 2026-10-10 | Criado | Formatação Prettier aplicada em toda a API | `apps/api` |
| [AJ-022](#aj-022) | 2026-10-10 | Substituído | Migration gerada com `migrate diff` (o `migrate dev` recusou rodar sem terminal) | `prisma/migrations` |
| [AJ-023](#aj-023) | 2026-10-10 | Removido | Tabela `topicos`, colunas `pin_acesso_hash`/`pin_expira_em`, unicidade `(prova_id, ordem)` | schema |
| [AJ-024](#aj-024) | 2026-10-10 | Criado | Schemas `recursos`, `notificacoes`, `auditoria` + trigger de imutabilidade | schema |
| [AJ-025](#aj-025) | 2026-10-10 | Substituído | Violações de fronteira entre módulos corrigidas durante a implementação | `apps/api/src/modules` |
| [AJ-026](#aj-026) | 2026-10-10 | Criado | Limitador `pin` e `@SkipThrottle` nas rotas de execução | `common/throttle`, `aplicacao` |
| [AJ-027](#aj-027) | 2026-10-10 | Criado | Limite do corpo JSON aumentado para 1 MB | `configurar-app.ts` |
| [AJ-028](#aj-028) | 2026-10-10 | Substituído | Seed ampliado com dados de demonstração | `prisma/seed.ts` |
| [AJ-029](#aj-029) | 2026-10-10 | Removido | Página "Em breve" e selos de sprint no menu | `apps/web` |
| [AJ-030](#aj-030) | 2026-10-10 | Criado | Utilitários de teste e2e: limpeza de todos os schemas e `autenticar()` | `apps/api/test` |
| [AJ-031](#aj-031) | 2026-10-10 | Substituído | Callbacks recursivos via `ref` e constantes fora de arquivos de componente | `apps/web` |
| [AJ-032](#aj-032) | 2026-10-10 | Criado | Roteiro Playwright do ciclo completo (fora do repositório) | scratchpad |
| [AJ-033](#aj-033) | 2026-10-10 | Criado | `SessaoService` exportado (`revogarTodas`) para a administração de usuários | `iam` |
| [AJ-034](#aj-034) | 2026-10-10 | Criado | Migration `20261010200000_sessao_unica_tentativa` (via `migrate diff`) | `prisma/migrations` |
| [AJ-035](#aj-035) | 2026-10-10 | Criado | Opção `cabecalhos` no cliente HTTP do frontend | `apps/web/src/api` |
| [AJ-036](#aj-036) | 2026-10-10 | Criado | Pasta `backups/` (ignorada no git e no contexto Docker) | raiz |
| [AJ-037](#aj-037) | 2026-10-10 | Criado | Suíte Playwright no repositório (`@playwright/test` 1.64.0) | `apps/web/e2e` |
| [AJ-038](#aj-038) | 2026-10-10 | Substituído | Imagem da API com `--omit=optional` (818 → 462 MB) | `apps/api/Dockerfile` |
| [AJ-039](#aj-039) | 2026-10-10 | Criado | `overrides` de `mysql2` e `deepmerge-ts` (0 vulnerabilidades) | `package.json` raiz |
| [AJ-040](#aj-040) | 2026-10-10 | Revertido | Edição manual do `package-lock.json` (quebrou a resolução; refeito via npm) | `package-lock.json` |
| [AJ-041](#aj-041) | 2026-10-10 | Removido | Dados criados pelos testes de carga no banco de demonstração | banco Docker |
| [AJ-042](#aj-042) | 2026-10-11 | Substituído | Nginx oficial → `nginx-unprivileged` (portas internas 8080/8443) | `apps/web/Dockerfile` |
| [AJ-043](#aj-043) | 2026-10-11 | Substituído | `default.conf.template` → modelos por modo de TLS + entrypoint + snippet de rotas | `infra/nginx` |
| [AJ-044](#aj-044) | 2026-10-11 | Criado | Serviço `certbot` (perfil `letsencrypt`) e volumes de certificados | `docker-compose.yml` |
| [AJ-045](#aj-045) | 2026-10-11 | Substituído | Imagem própria de backup (age, rclone, curl); scripts não são mais montados | `infra/backup` |
| [AJ-046](#aj-046) | 2026-10-11 | Substituído | Serviço de backup também na `frontend-net` (saída para a internet) | `docker-compose.yml` |
| [AJ-047](#aj-047) | 2026-10-11 | Criado | Pasta `infra/backup/rclone` e regras no `.gitignore` para `rclone.conf` e chaves | raiz |
| [AJ-048](#aj-048) | 2026-10-11 | Criado | Migration `20261011090000_lgpd` (`solicitacoes_lgpd`, `anonimizado_em`) | `prisma/migrations` |
| [AJ-049](#aj-049) | 2026-10-11 | Criado | `AuthGuard` passa a depender do `SessaoService` | `common/auth` |
| [AJ-050](#aj-050) | 2026-10-11 | Criado | Variáveis `HTTPS_PORT`/`PORTA_HTTPS_PUBLICA` (local e CI) e `E2E_IGNORAR_CERTIFICADO` | `.env`, CI, Playwright |
| [AJ-051](#aj-051) | 2026-10-11 | Criado | Situação marcada no documento de requisitos (.docx) e nos arquivos do plano | `docs/` |
| [AJ-052](#aj-052) | 2026-10-11 | Criado | Scripts `criar-admin`, `verificar-producao.sh` e scripts de TLS | `apps/api/prisma`, `infra` |
| [AJ-053](#aj-053) | 2026-10-11 | Removido | Dados de teste criados no banco de demonstração nesta etapa | banco Docker |
| [AJ-054](#aj-054) | 2026-10-11 | Criado | Pasta `testes/` com `testar-tudo.sh`, testes de infraestrutura e scripts `test:tudo`/`test:rapido` | `testes/`, `package.json` |
| [AJ-055](#aj-055) | 2026-10-11 | Substituído | Campo **Natureza** do editor de questões trocado por **Formato** (API aceita os dois) | web, API |
| [AJ-056](#aj-056) | 2026-10-11 | Substituído | `Midia.url` → `arquivo` (nome de capacidade) + `mime`/`tamanho`/`enviadoPorId`; `versaoQuestaoId` opcional | schema `questoes` |
| [AJ-057](#aj-057) | 2026-10-11 | Criado | Migration `20261011150000_formatos_midia_politicas` gerada por `migrate diff` + backfill manual | `apps/api/prisma/migrations` |
| [AJ-058](#aj-058) | 2026-10-11 | Criado | Volume `midias`, pasta `/app/dados/midias` na imagem da API, rota de upload no Nginx, mídias no backup e na restauração | Docker, Nginx, backup |
| [AJ-059](#aj-059) | 2026-10-11 | Criado | Dependência de desenvolvimento `@types/multer` e `multer` em `types` do `tsconfig` | `apps/api` |
| [AJ-060](#aj-060) | 2026-10-11 | Criado | Serviço `monitor`, `dependabot.yml` e workflow `Segurança` | `infra/monitor`, `.github` |
| [AJ-061](#aj-061) | 2026-10-11 | Criado | Prova de demonstração “Mini quiz: verdadeiro/falso e resposta curta” no seed | `prisma/seed.ts` |
| [AJ-062](#aj-062) | 2026-10-11 | Criado | `MIDIAS_DIR` dos testes e2e em pasta temporária; `apps/api/dados/` no `.gitignore` | testes, `.gitignore` |
| [AJ-063](#aj-063) | 2026-10-11 | Substituído | Seletor do Playwright `Natureza` → `Formato` no ciclo completo | `apps/web/e2e` |
| [AJ-064](#aj-064) | 2026-10-11 | Criado | Utilitário `test/cenarios.ts` (questão → prova → aplicação → execução) para os e2e novos | `apps/api/test` |
| [AJ-065](#aj-065) | 2026-10-11 | Removido | Mídia enviada no teste de fumaça da stack (registro e arquivo) | banco Docker, volume |
| [AJ-066](#aj-066) | 2026-10-11 | Substituído | Parágrafos "Implementação" do `.docx` regenerados a partir do original com a situação do lote 6 | `docs/` |
| [AJ-067](#aj-067) | 2026-10-12 | Criado | Dependências `nodemailer` 10.0.11 e `@types/nodemailer` (API) e `katex` 0.18.9 (web), versões fixas com mais de duas semanas | `package.json` |
| [AJ-068](#aj-068) | 2026-10-12 | Criado | Migration `20261012090000_lote7` (via `migrate diff`; comentário de PostgreSQL ≤ 11 removido) | `prisma/migrations` |
| [AJ-069](#aj-069) | 2026-10-12 | Criado | Rede `egress-net` só para a API (saída para SMTP) e variáveis de e-mail no Compose/`.env.example` | Docker |
| [AJ-070](#aj-070) | 2026-10-12 | Criado | Seed marca a ciência da política nas contas de demonstração | `prisma/seed.ts` |
| [AJ-071](#aj-071) | 2026-10-12 | Substituído | `ComAuth` dos testes do frontend passou a incluir o `QueryClientProvider` | `apps/web/src/test` |
| [AJ-072](#aj-072) | 2026-10-12 | Criado | `EMAIL_TRANSPORTE=memoria` e `APP_URL` na configuração dos e2e | `vitest.config.e2e.ts` |
| [AJ-073](#aj-073) | 2026-10-12 | Substituído | Rotas `…/csv` de relatório e auditoria viraram `…/:formato` (`csv` ou `xlsx`) — URLs antigas continuam | API |
| [AJ-074](#aj-074) | 2026-10-12 | Criado | Workflows `uptime.yml` e `deploy.yml` | `.github/workflows` |
| [AJ-075](#aj-075) | 2026-10-12 | Criado | Etapa `scripts` na bateria (`testes/infra/testar-scripts.sh`) e script `npm run rotacionar-chave-mfa` | `testes/`, `apps/api` |
| [AJ-076](#aj-076) | 2026-10-12 | Substituído | Teste antigo do MFA opcional passou a esperar `codigosRecuperacaoRestantes` | `test/acesso-e-conta.e2e-spec.ts` |
| [AJ-077](#aj-077) | 2026-10-12 | Criado | `util/formulas.ts` e `api/recursos.ts` separados dos componentes (regra de *fast refresh* do lint) | `apps/web/src` |
| [AJ-078](#aj-078) | 2026-10-12 | Criado | Migration `20261012180000_lote8` (seções, corretores, formatos, chaves, fila de e-mail, LGPD, código externo) | `prisma/migrations` |
| [AJ-079](#aj-079) | 2026-10-12 | Substituído | Componente de composição do assistente trocado por `ComposicaoSecoes`; `PUT /provas/:id/questoes` passou a gravar via composição por seções | web, API |
| [AJ-080](#aj-080) | 2026-10-12 | Criado | Rotas `GET /usuarios/corretores`, `PUT /provas/:id/corretores`, `POST /recursos/:id/encaminhar`, `POST /lgpd/retencao/aplicar` | API |
| [AJ-081](#aj-081) | 2026-10-12 | Criado | Módulo `integracao` (guard por chave, rotas `/integracao/v1/*` e administração das chaves) e tela *Integrações* | API, web |
| [AJ-082](#aj-082) | 2026-10-12 | Criado | `location` do Nginx para o SSE (`proxy_buffering off`) | `infra/nginx` |
| [AJ-083](#aj-083) | 2026-10-12 | Substituído | Consulta periódica do sino: de 1 para 5 min (o tempo real assumiu o papel) | web |
| [AJ-084](#aj-084) | 2026-10-12 | Substituído | Rótulo do status LGPD `CONCLUIDA`: "Dados anonimizados" → "Atendida" (agora também há correções) | web |
| [AJ-085](#aj-085) | 2026-10-12 | Criado | Variável `RETENCAO_EXTERNOS_DIAS` (padrão 0 = desligada) | API, `.env` |
| [AJ-086](#aj-086) | 2026-10-12 | Substituído | Limpeza dos testes e2e inclui as tabelas novas; asserções sobre a auditoria (imutável, não truncada) filtram pelo recurso do próprio teste | `apps/api/test` |
| [AJ-087](#aj-087) | 2026-10-12 | Removido | Parte "admin cria chave" do teste de navegador (o admin do seed exige cadastrar MFA no 1º login); coberta pelo e2e da API | `apps/web/e2e` |
| [AJ-088](#aj-088) | 2026-10-18 | Criado | Dependência `@fontsource-variable/inter` (fonte Inter servida pelo app) | `apps/web/package.json` |
| [AJ-089](#aj-089) | 2026-10-18 | Removido | `layouts/Navbar.tsx`, substituído por `Marca`, `MenuUsuario` e pelo topo dentro do `LayoutProfissional` | `apps/web/src/layouts` |
| [AJ-090](#aj-090) | 2026-10-18 | Criado | Variáveis `NOME_INSTITUICAO` e `URL_AJUDA` (argumentos de build do frontend) | `.env.example`, `docker-compose.yml`, `apps/web/Dockerfile` |
| [AJ-091](#aj-091) | 2026-10-18 | Substituído | Menu: "Painel" virou "Dashboard", "Recursos" do aluno virou "Contestações", "Minha conta" foi para o menu do usuário, "Configurações" leva a `/app/conta`; grupos do menu lateral removidos | `apps/web/src/layouts` |
| [AJ-092](#aj-092) | 2026-10-18 | Substituído | Teste de navegador espera "Bom dia/Boa tarde/Boa noite, …" em vez de "Olá, …" no painel profissional | `apps/web/e2e/apoio.ts` |
| [AJ-093](#aj-093) | 2026-10-18 | Substituído | `CabecalhoPagina.voltar.rotulo` passou a ser a frase completa ("Voltar para provas") | `apps/web/src/paginas` |
| [AJ-094](#aj-094) | 2026-10-18 | Criado | Exportações das telas do Figma e guia de vocabulário visual | `docs/design/` |
| [AJ-095](#aj-095) | 2026-10-18 | Criado | CSS por página (`questoes.css`, `provas.css`, `aluno.css` etc.), para os agentes não editarem o mesmo arquivo ao mesmo tempo | `apps/web/src/paginas` |
| [AJ-096](#aj-096) | 2026-10-19 | Criado | Rota interna `GET /api/v1/health/metricas` e middleware de métricas HTTP; `location` no Nginx que devolve 404 para ela | API, `infra/nginx/snippets-app.conf` |
| [AJ-097](#aj-097) | 2026-10-19 | Criado | `docker-compose.logs.yml` + `infra/logs/` (coletor Vector opcional); `/logs/` no `.gitignore` e `logs` no `.dockerignore` | raiz, `infra/logs` |
| [AJ-098](#aj-098) | 2026-10-19 | Criado | `infra/backup/testar-copia-externa.sh` e o arquivo de status `backups/.restauracao.json` | `infra/backup` |
| [AJ-099](#aj-099) | 2026-10-19 | Criado | Variáveis `MONITOR_5XX_PCT`, `MONITOR_P95_MS`, `MONITOR_MIN_REQUISICOES`, `MONITOR_RESTAURACAO_DIAS`, `LOGS_*`, `HSTS_PRELOAD` | `.env.example`, `docker-compose.yml` |
| [AJ-100](#aj-100) | 2026-10-19 | Substituído | Verificador de produção aceita o coletor de logs publicando só em `127.0.0.1` ("Só o nginx publica portas para fora") | `infra/vps/verificar-producao.sh` |
| [AJ-101](#aj-101) | 2026-10-19 | Substituído | Documentação desatualizada corrigida: CI "aguardando repositório" (o remoto já existe), "sem monitor externo" (há `uptime.yml`), Dependabot e validade do certificado marcados como pendentes já estando prontos | `docs/` |
| [AJ-102](#aj-102) | 2026-10-20 | Substituído | Pendências já feitas em lotes posteriores marcadas como concluídas nas features 001, 004, 005 e 028; log do monitor mostra `p95=-` sem requisições (antes `nullms`) | `docs/features`, `infra/monitor/monitor.sh` |
| [AJ-103](#aj-103) | 2026-10-20 | Substituído | Homologação passou de HTTP para HTTPS autoassinado; a bateria usa `URL_APP` (HTTPS com o TLS ligado, aceitando o certificado) em vez de `URL_HTTP` fixo | `.env` local, `testes/lib.sh`, `testes/testar-tudo.sh`, `testes/infra/testar-monitor.sh` |
| [AJ-104](#aj-104) | 2026-10-20 | Substituído | Homologação pública: portas 80/443, Let's Encrypt em `203-0-113-10.sslip.io`, `APP_URL` público; `ativar-letsencrypt.sh --sem-email`; HTTP redireciona sempre para o domínio do certificado (`HOST_REDIRECIONAMENTO`) | `.env` local, `infra/tls/ativar-letsencrypt.sh`, `infra/nginx` |
| [AJ-105](#aj-105) | 2026-10-24 | Criado | Campo "Professor responsável" na criação e na edição da turma (Admin/Coordenador), que faltava para o UC2 do doc 009 | `turmas/CampoResponsavel.tsx`, `ListaTurmas.tsx`, `DetalheTurma.tsx` |
| [AJ-106](#aj-106) | 2026-10-24 | Criado | Diálogos de confirmação para ações irreversíveis: arquivar prova, arquivar questão, revogar chave de integração | `DetalheProva.tsx`, `DetalheQuestao.tsx`, `Integracoes.tsx`, `e2e/recursos-avancados.spec.ts` |
| [AJ-110](#aj-108-a-aj-110) | 2026-10-26 | Substituído | Autosave lê só status, sessão, prazo e questões (sem gabarito nem respostas) e relê só status/sessão dentro do lock; modo de navegação e composição da prova em cache por 5 min (a composição é invalidada pelo `atualizadoEm` da prova) | `apps/api/src/modules/aplicacao/execucao.service.ts` |
| [AJ-111](#aj-111) | 2026-10-26 | Substituído | Métricas: rotas `/api/v1/auth/*` contam para a taxa de 5xx, mas não para a latência (Argon2 lento de propósito); teste Playwright do Excel abre a primeira prova com notas em vez da prova do seed; `testar-https.sh` espera a janela do limite de credenciais antes da suíte de navegador | `metricas-http.ts`, `recursos-avancados.spec.ts`, `testes/infra/testar-https.sh` |
| [AJ-112](#aj-112) | 2026-10-27 | Criado | Índices `notas (status, fim_em)` para a fila de correção e `notas (status, consolidada_em, id)` para o cursor da integração (migration `20261027090000_indices_notas`) | `apps/api/prisma` |
| [AJ-113](#aj-113-a-aj-114) | 2026-10-27 | Criado | Retenção de notificações: as lidas com mais de `NOTIFICACOES_RETENCAO_DIAS` (180; 0 desliga) são apagadas a cada 6 h | `notificacoes.service.ts`, `.env.example`, `docker-compose.yml` |
| [AJ-114](#aj-113-a-aj-114) | 2026-10-27 | Substituído | Dependências: `npm update` (minor/patch, Prisma 7.10.1 com `allowScripts` atualizado), vitest 5, imagens nginx-unprivileged 1.31, alpine 3.24 (monitor), certbot 5.8, Vector 0.60; Node 26 e `@types/node` 26 adiados até o LTS | `package.json`, `package-lock.json`, Dockerfiles, Compose |
| [AJ-115](#aj-115) | 2026-10-27 | Criado | Itens do Figma implementados: filtros do banco de questões por tipo e dificuldade (API + tela), "Salvar e avançar" na correção, "Marcar para revisar" na execução do aluno; suíte Playwright `telas-gestao.spec.ts` | `questoes`, `TelaCorrecao.tsx`, `ExecucaoProva.tsx`, `apps/web/e2e` |
| [AJ-116](#aj-116) | 2026-10-27 | Criado | Roteiro de demonstração do MVP (`docs/testes/roteiro-demonstracao-mvp.md`); teste do ciclo completo passa a escolher a Turma Piloto explicitamente | `docs/testes`, `apps/web/e2e/ciclo-completo.spec.ts` |
| [AJ-107](#aj-107) | 2026-10-24 | Criado | Aviso ao sair do passo *Montagem* pelo Stepper com alterações não salvas; comprovante público com a barra superior; limite de 1 MB checado no navegador antes de importar CSV; aviso no painel quando parte dos dados falha | `AssistenteProva.tsx`, `ComposicaoSecoes.tsx`, `Publico.tsx`, `DetalheTurma.tsx`, `Painel.tsx` |
| [AJ-108](#aj-108-a-aj-110) | 2026-10-26 | Substituído | Dependências: override `multer` ^2.5.0 (fixada em 2.4.0 pelo `@nestjs/platform-express`), `nodemailer` 10.2.1, `@nestjs/common`/`core`/`platform-express`/`testing` 12.2.0, `body-parser`, `fast-uri` e `zod` via `npm audit fix` — `npm audit --omit=dev` sem vulnerabilidades | `package.json`, `apps/api/package.json`, `package-lock.json` |
| [AJ-109](#aj-108-a-aj-110) | 2026-10-26 | Substituído | CI: actions `checkout`/`setup-node`/`upload-artifact` v7, `build-push-action` v7, `setup-buildx-action` v4 (Node 20 descontinuado); o deploy exige o **workflow CI** verde no commit (antes aceitava qualquer check, inclusive o uptime) | `.github/workflows` |
| [AJ-119](#aj-119) | 2026-10-27 | Criado | Barras de rolagem minimalistas (só o polegar, sem trilho nem setas) com tokens por tema | `apps/web/src/index.css` |
| [AJ-120](#aj-120) | 2026-10-27 | Substituído | `/` deixa de redirecionar o visitante ao login e passa a mostrar a homepage | `apps/web/src/paginas/Inicio.tsx`, `apps/web/src/paginas/home/` |
| [AJ-121](#aj-121) | 2026-10-27 | Substituído | IP real do servidor, senha da homologação e dados pessoais trocados por exemplos antes de publicar o repositório | `docs/`, `.github/workflows`, `infra/tls` |

---

### AJ-001
**Node.js 24 e Docker instalados na máquina de desenvolvimento** — *Criado*

A máquina não tinha Node nem Docker. Instalados: **Node.js 24.21 LTS** (tarball oficial com
SHA-256 conferido, em `/usr/local` — o `npm` do apt era o 9.2, antigo) e **Docker 29 + Compose
2.40** (`docker.io`/`docker-compose-v2` do apt). Imagens base baixadas: `postgres:18-alpine`,
`redis:8-alpine`, `nginx:1.29-alpine`, `node:24-alpine`.
No VPS isso é feito pelo `infra/vps/provisionar.sh`.

### AJ-002
**Versões diferentes da "latest"** — *Substituído*

| Pacote | latest no npm | Usado | Motivo |
|---|---|---|---|
| `typescript` | 7.0 | 6.0 | Nest CLI 12 fixa `~6.0` |
| `prisma` / `@prisma/client` | 8.0.0-rc | 7.10 | 8.x ainda é release candidate |

As demais seguem a última estável (NestJS 12, React 19, Vite 8, React Router 8, otplib 13, Vitest 4).
otplib 13 e React Router 8 tiveram a API conferida antes do uso (otplib 13 é reescrita completa).

### AJ-003
**Lista `allowScripts`** — *Criado*

O npm 11 não executa scripts `install`/`postinstall` por padrão. Sem eles, `argon2` (binário
nativo), `prisma`/`@prisma/engines` e `esbuild` não funcionam. Aprovados com
`npm install-scripts approve`, com versão fixada, no `package.json` raiz. Ver ADR-0012.

### AJ-004
**Skills de agentes de IA baixadas pelo `prisma init`** — *Removido*

O `prisma init` do Prisma 7 criou `.agents/`, `.claude/`, `.windsurf/` e `skills-lock.json`
com instruções para agentes de IA vindas de um repositório de terceiros. Removidos: não fazem
parte do produto e não foram revisados. Também removidos o `.env` e o `.gitignore` gerados.

### AJ-005
**`prisma7.config.ts` → `prisma.config.ts`** — *Substituído*

O init gerou `prisma7.config.ts` com `import 'dotenv/config'` (dependência que não estava
instalada). Renomeado para o nome padrão `prisma.config.ts` e trocado por
`process.loadEnvFile('.env')` nativo do Node, carregado só quando o arquivo existe (dev).
Também foi adicionado `migrations.seed` (`tsx prisma/seed.ts`) e o client passou a ser gerado
em `src/generated/prisma` (dentro do `rootDir`, para o `nest build` compilar).

### AJ-006
**Arquivos de exemplo dos templates** — *Removido*

- API: `app.controller.ts`, `app.service.ts`, `app.controller.spec.ts`, `test/app.e2e-spec.ts`, `README.md`.
- Web: `App.tsx`, `App.css`, `src/assets/*`, `public/icons.svg`, `README.md`; `favicon.svg` e
  `index.html` substituídos (título "Quizzer", `lang="pt-BR"`).

### AJ-007
**Dependências `vite-tsconfig-paths` e `@nestjs/mau`** — *Removido*

- `vite-tsconfig-paths`: o Vitest 4 avisou que o Vite resolve paths do tsconfig nativamente
  (`resolve.tsconfigPaths: true`).
- `@nestjs/mau` e o script `deploy`: serviço pago de deploy da Nest; usamos Docker no VPS.

### AJ-008
**`.gitignore` único na raiz** — *Substituído*

O template do Vite trouxe `apps/web/.gitignore`. Consolidado num `.gitignore` na raiz que
também ignora `.env*` (exceto `.env.example`), `src/generated/` e `*.tsbuildinfo`.
Criado também `.dockerignore` na raiz (exclui `.env`, `node_modules`, `docs`).

### AJ-009
**`strict` no frontend** — *Criado*

O `tsconfig.app.json` do template Vite atual não liga `strict`. Ativado, junto com os tipos
`vitest/globals` e `@testing-library/jest-dom`.

### AJ-010
**Banco `quizzer_test`** — *Criado*

`infra/postgres/init-test-db.sql` cria o banco na primeira subida do `docker-compose.dev.yml`.
Os e2e truncam tabelas; separar evita apagar os dados de desenvolvimento.

### AJ-011
**`configurar-app.ts`** — *Criado*

Prefixo `/api`, versionamento, `ValidationPipe`, Helmet, cookies e `trust proxy` precisavam
ser idênticos em produção e nos e2e. Extraído de `main.ts` para uma função compartilhada.

### AJ-012
**`COOKIE_SECURE` → `TLS_ATIVO`** — *Substituído*

A flag passou a controlar também HSTS e `upgrade-insecure-requests` (BUG-004), então o nome
foi generalizado.

### AJ-013
**Novas variáveis de ambiente** — *Criado*

`RATE_LIMIT_POR_IP` e `RATE_LIMIT_CREDENCIAIS` (BUG-003 / ADR-0011) e `TRUST_PROXY`
(número de proxies à frente da API: `1` atrás do Nginx, `0` em dev/teste).

### AJ-014
**Redução da imagem da API com `--omit=peer`** — *Revertido*

A imagem ficou com ~800 MB porque o `npm ci -w @quizzer/api` instala o lockfile inteiro
(deps do web, CLI do Prisma, TypeScript). Testado `--omit=peer`: sem efeito no `npm ci`.
Revertido; o Dockerfile tem um comentário `PENDENTE` e a otimização está nas pendências da
feature 006.

### AJ-015
**`'unsafe-inline'` removido do `style-src`** — *Removido*

O build do Vite gera CSS em arquivos e os `style={...}` do React são aplicados via CSSOM
(não bloqueados pela CSP). Validado no Chromium sem violações.

### AJ-016
**Snippet `proxy-api.conf`** — *Criado*

As duas `location` de `/api` (com e sem rate limit) repetiam os mesmos `proxy_*`. Extraído
para `infra/nginx/proxy-api.conf`, copiado para `/etc/nginx/snippets/` no Dockerfile do web.

### AJ-017
**Reorganizações por causa do Fast Refresh** — *Substituído*

A regra `react/only-export-components` exige que arquivos de componente só exportem
componentes:
- contexto e hook de autenticação separados em `auth/contexto.ts` (provedor em `ProvedorAuth.tsx`);
- `Inicio` saiu de `rotas.tsx` para `paginas/Inicio.tsx`;
- `mensagemDeErro` saiu de `FormularioLogin.tsx` para `api/cliente.ts`.

### AJ-018
**Utilitários de teste do frontend** — *Criado*

`src/test/setup.ts` (jest-dom) e `src/test/auth-falso.tsx` (contexto de autenticação falso).
Override no `.oxlintrc.json` desliga `only-export-components` para arquivos de teste;
o lint do web passou a rodar com `--deny-warnings`.

### AJ-019
**Playwright + Chromium** — *Criado (fora do repositório)*

Instalados no diretório temporário da sessão e em `~/.cache/ms-playwright` para validar a UI
contra a stack Docker (desktop e celular). Foi assim que BUG-001 e BUG-003 apareceram.
O roteiro **não** está no repositório; automatizar no CI está nas pendências da feature 007.

### AJ-020
**Nomes do seed** — *Substituído*

"Professora Ana Souza" → "Ana Souza" e "Aluno Bruno Lima" → "Bruno Lima": a saudação usa o
primeiro nome e mostrava "Olá, Aluno".

### AJ-021
**Prettier na API** — *Criado*

O template do Nest traz `.prettierrc`; o código foi formatado
(`prettier --write src test prisma`). O web não tem Prettier configurado (pendente decidir).

### AJ-022
**Migration gerada com `prisma migrate diff`** — *Substituído*

`prisma migrate dev --create-only` recusou rodar fora de terminal interativo (a mudança remove
colunas/tabela). A migration `20261010180000_sprints_2_a_4` foi gerada com
`prisma migrate diff --from-config-datasource --to-schema` contra o banco de desenvolvimento e
recebeu, à mão, o trigger da auditoria. Aplicada com `migrate deploy` (dev, teste e Docker).

### AJ-023
**Remoções no schema** — *Removido*

`questoes.topicos` (tópico virou texto), `aplicacoes.pin_acesso_hash`/`pin_expira_em` (PIN em
texto; expira com a janela) e a unicidade `prova_questoes(prova_id, ordem)` (atrapalhava
reordenar). Motivos no [ADR-0016](adr/0016-simplificacoes-de-dominio-no-mvp.md).

### AJ-024
**Novos schemas** — *Criado*

`recursos`, `notificacoes`, `auditoria`. A trilha de auditoria tem triggers que impedem
UPDATE/DELETE/TRUNCATE ([ADR-0022](adr/0022-notificacoes-e-auditoria.md)).

### AJ-025
**Fronteiras entre módulos** — *Substituído*

Duas leituras diretas de tabela de outro módulo foram escritas e corrigidas antes de concluir:
`CorrecaoService` lia `recursos.recursos` (checagem de reabertura e status do recurso no
resultado do aluno) e `RecursosService` lia `correcao.anulacoes`. A checagem de reabertura foi
para a aplicação (via `RecursosService.existeParaNota`), o frontend junta recursos ao resultado,
e anulações passaram a ser expostas por `CorrecaoService.anulacao`. Relatórios também usam
`CorrecaoService.notasParaRelatorio` em vez de ler as tabelas. Regra no [ADR-0019](adr/0019-fronteiras-entre-modulos.md).

### AJ-026
**Limitador de PIN e autosave sem limite por IP** — *Criado*

Terceiro limitador `pin` (30 req/min por IP) nas rotas públicas de PIN. As rotas de
execução (obter, autosave, enviar) usam `@SkipThrottle()`: são autenticadas e, com a turma
inteira atrás do mesmo IP salvando a cada poucos segundos, o limite de 600/min por IP seria
atingido. Complementa o [ADR-0011](adr/0011-rate-limit-por-ip-e-identificador.md).

### AJ-027
**Corpo JSON de até 1 MB** — *Criado*

A importação de alunos envia o CSV no corpo JSON; o limite padrão do Express (100 KB) não
comportava turmas grandes. `express.useBodyParser('json', { limit: '1mb' })`.

### AJ-028
**Seed de demonstração** — *Substituído*

O seed passou a criar revisor, corretora, segundo aluno, 7 questões publicadas, uma prova
aplicada à turma e um quiz público com PIN — para o sistema abrir com algo testável.
O seed não sobrescreve usuários existentes; no banco Docker de homologação os nomes antigos
("Professora Ana Souza", "Aluno Bruno Lima") foram atualizados manualmente.

### AJ-029
**Página "Em breve"** — *Removido*

`EmBreve.tsx` e os selos "Sprint N" do menu lateral saíram: todas as telas existem agora.

### AJ-030
**Utilitários de teste e2e** — *Criado*

`limparBanco` passou a truncar todos os schemas **exceto** `auditoria.eventos` (o trigger
impede); `autenticar(app, prisma, papel)` cria usuário e sessão direto pelo `SessaoService`.

### AJ-031
**Ajustes pedidos pelo oxlint no frontend** — *Substituído*

Callbacks de autosave/envio que se reagendam após falha de rede passaram a se chamar via
`useRef` (regra `react/immutability`); `new Date()` só em inicialização preguiçosa de estado
(`react/purity`); `linkProva`, `PARAMETROS_PADRAO` e papéis foram para arquivos `.ts` próprios.

### AJ-032
**Roteiro Playwright do ciclo completo** — *Criado (fora do repositório)*

Usado para validar a etapa no Chromium contra a stack Docker (12 passos, sem erros de console).
Automatizá-lo no CI continua pendente (feature 007).

### AJ-033
**`SessaoService` exportado** — *Criado*

A administração de usuários precisa encerrar todas as sessões de alguém (desativação, mudança
de papel/e-mail, reset de senha/MFA). Novo método `revogarTodas` e export no `IamModule`.

### AJ-034
**Migration da sessão única** — *Criado*

Colunas `tentativas.sessao_execucao` e `tentativas.trocas_sessao`, geradas com
`prisma migrate diff` (mesmo procedimento do AJ-022).

### AJ-035
**Cabeçalhos extras no cliente HTTP** — *Criado*

`api(caminho, { cabecalhos })` para enviar `X-Sessao-Execucao` no autosave e no envio.

### AJ-036
**Pasta de backups** — *Criado*

`./backups` (permissão 700) recebe os dumps do serviço `backup`; está no `.gitignore` e no
`.dockerignore` para nunca ir para o repositório nem para imagens.

### AJ-037
**Playwright no repositório** — *Criado*

O roteiro de navegador que estava fora do repositório (AJ-019, AJ-032) virou a suíte
`apps/web/e2e` (`npm run test:navegador`), com `playwright.config.ts` e dependência de
desenvolvimento fixada na mesma versão usada nas validações. Artefatos (`test-results/`,
`playwright-report/`) no `.gitignore`.

### AJ-038
**Imagem da API menor** — *Substituído*

A tentativa anterior com `--omit=peer` (AJ-014) não funcionava porque o npm marca o CLI do
Prisma e o TypeScript como **devOptional**; `--omit=optional` os remove. Validado com a stack
completa e a suíte Playwright.

### AJ-039
**Overrides de dependências** — *Criado*

`npm audit` acusava 4 vulnerabilidades altas na árvore do CLI do Prisma (`mysql2` < 3.24,
`deepmerge-ts` < 8). `overrides` forçam as versões corrigidas; o CLI foi validado (`validate`,
`migrate status`, `generate`, `db seed`). Remover quando o Prisma estável trouxer as versões novas.

### AJ-040
**Edição manual do lockfile** — *Revertido*

Para aplicar os overrides tentei apagar entradas do `package-lock.json` à mão. Isso fez o npm
considerar `@prisma/config` desnecessário e o CLI do Prisma parou de carregar a configuração.
Correção feita pelo próprio npm (instalar e desinstalar `@prisma/config` explicitamente para
recriar a entrada), seguida de `npm ci` limpo e de todas as suítes. **Lição:** nunca editar o
lockfile à mão; usar comandos do npm.

### AJ-041
**Limpeza dos dados de carga** — *Removido*

Cada execução do teste de carga cria uma turma "Carga …" e N alunos `carga.*@quizzer.local`.
No banco de demonstração eles foram removidos por SQL (tentativas, notas, matrículas, turmas,
notificações e usuários). Os eventos de auditoria permanecem (imutáveis). Automatizar a limpeza
está nas pendências da feature 016.

### AJ-042
**Nginx sem root** — *Substituído*

Item que estava como ⚠️ no checklist de segurança. A imagem `nginxinc/nginx-unprivileged` roda
como uid 101 e escuta em 8080/8443; o Compose passou a mapear `HTTP_PORT:8080` e `HTTPS_PORT:8443`.

### AJ-043
**Reorganização do Nginx** — *Substituído*

O único `default.conf.template` virou: `modelos/00-comum.conf.template` (zona de rate limit, HSTS
por esquema, upstream), `modelos/http.conf.template`, `modelos/https.conf.template`,
`snippets-app.conf` (rotas compartilhadas) e `entrypoint/15-modo-tls.envsh`, que escolhe o
modelo. O script é `.envsh` (carregado com `source` pelo entrypoint oficial) para que os `export`
cheguem ao `envsubst`; por isso não usa `set -eu`.

### AJ-044
**Certbot** — *Criado*

Serviço só ativo com `COMPOSE_PROFILES=letsencrypt`; renova a cada 12 h por webroot. Volumes
`tls_certs`, `letsencrypt` e `acme_webroot`.

### AJ-045
**Imagem de backup** — *Substituído*

Antes: imagem `postgres:18-alpine` com os scripts montados por bind. Agora: `infra/backup/Dockerfile`
com `age`, `rclone` e `curl` e os scripts copiados na imagem (com healthcheck próprio).

### AJ-046
**Backup com saída para a internet** — *Substituído*

Necessário para a cópia externa (rclone) e o webhook. Continua sem publicar portas.

### AJ-047
**Configuração do rclone fora do git** — *Criado*

`infra/backup/rclone/LEIA-ME.txt` explica como gerar o `rclone.conf`; o arquivo e quaisquer `*.key` estão no `.gitignore`.

### AJ-048
**Migration de LGPD** — *Criado*

Gerada com `prisma migrate diff`, como as anteriores (AJ-022).

### AJ-049
**Guard consulta a sessão** — *Criado*

Para a revogação em até 30 s (ADR-0027). O teste unitário do guard recebeu um `SessaoService` falso.

### AJ-050
**Portas HTTPS e testes sobre HTTPS** — *Criado*

O `.env` local e o do CI publicam o HTTPS só em `127.0.0.1:8443`, para não abrir a 443 pública
nestas máquinas. A suíte Playwright aceita certificado autoassinado com `E2E_IGNORAR_CERTIFICADO=true`.

### AJ-051
**Situação nos documentos de requisitos** — *Criado*

A pedido do responsável pelo projeto:
- `docs/Documento_Requisitos_Sistema_de_Provas.docx` ganhou, após cada RF/RNF das Seções 3 e 4, um
  parágrafo "Implementação (11/10/2026)" (o texto original não foi alterado; cópia do original
  guardada fora do repositório durante a sessão);
- `09a/09b/09c` ganharam a coluna *Situação*; `09_Plano_Sprints_Geral.md`, a seção 0;
- novo `docs/requisitos-status.md` com a rastreabilidade detalhada; guias de uso em `docs/guias/`.

### AJ-052
**Scripts de produção** — *Criado*

`apps/api/prisma/criar-admin.ts` (também `npm run criar-admin -w @quizzer/api`),
`infra/vps/verificar-producao.sh`, `infra/tls/{gerar-autoassinado,ativar-letsencrypt,desativar-tls}.sh`,
`infra/backup/gerar-chave.sh`.

### AJ-053
**Dados de teste no banco de demonstração** — *Removido*

Removidos novamente os dados do teste de carga. A solicitação LGPD de teste da aluna Camila foi
**recusada** (não anonimizada) para preservar o ambiente; o MFA do admin foi zerado após os testes;
os testes de navegador deixam questões/provas "Mini teste …" a cada execução (aceitável em homologação).

### AJ-054
**Bateria de testes consolidada** — *Criado*

A pedido do responsável ("deixe os testes em um arquivo à parte para eu testar tudo de uma vez"):
`testes/testar-tudo.sh` + `testes/lib.sh`, `testes/infra/testar-{backup,https,monitor}.sh`,
`testes/carga/limpar-dados-carga.sh`; scripts `npm run test:tudo` e `test:rapido`;
`testes/resultados/` no `.gitignore`. Ver [ADR-0040](adr/0040-bateria-de-testes-consolidada.md)
e o [roteiro](testes/roteiro-de-testes.md).

### AJ-055
**Natureza → Formato** — *Substituído*

O editor mostra **Formato** (4 opções). `natureza` continua no banco e na API (derivada do formato)
para não quebrar clientes, testes e o script de carga que enviam só `natureza`.

### AJ-056
**Modelo de mídia** — *Substituído*

A tabela `questoes.midias` existia desde a Sprint 1 com `url` e versão obrigatória, nunca usada.
Foi refeita para upload em duas etapas (mídia sem versão até ser ligada) e URL de capacidade
derivada do nome do arquivo (ADR-0032).

### AJ-057
**Migration do lote 6** — *Criado*

`prisma migrate dev` recusa rodar sem terminal interativo; a migration foi gerada com
`prisma migrate diff --from-config-datasource --to-schema` e aplicada com `migrate deploy`.
Acrescentado à mão o backfill `formato = 'DISSERTATIVA'` para questões e correções abertas.

### AJ-058
**Infra das mídias** — *Criado*

`RUN mkdir -p /app/dados/midias && chown node:node` na imagem (o volume herda o dono; a API roda
com sistema de arquivos só leitura), volume `midias` no compose, `location = /api/v1/midias` com 6 MB
no Nginx, `tar` das mídias no `backup.sh` (mesma cifra, cópia externa e retenção) e modo de
restauração de mídias no `restaurar.sh`.

### AJ-059
**Tipos do multer** — *Criado*

`@nestjs/platform-express` já traz o multer; faltavam os tipos (`Express.Multer.File`). Como o
`tsconfig` restringe `types`, `multer` foi adicionado à lista.

### AJ-060
**Monitoramento e manutenção** — *Criado*

`infra/monitor/{Dockerfile,monitor.sh}`, serviço `monitor` no compose, `.github/dependabot.yml`,
`.github/workflows/seguranca.yml`, variáveis `MONITOR_*` no `.env.example` e no verificador de
produção. Ver ADR-0036.

### AJ-061
**Seed com os novos formatos** — *Criado*

Três questões (duas V/F, uma resposta curta) e a prova "Mini quiz: verdadeiro/falso e resposta
curta" (gabarito após o resultado, recurso em 7 dias), aplicada à Turma Piloto por 7 dias.

### AJ-062
**Mídias nos testes** — *Criado*

Os e2e gravam mídias em `$TMPDIR/quizzer-midias-e2e`; `apps/api/dados/` (pasta padrão de
desenvolvimento) entrou no `.gitignore`.

### AJ-063
**Seletor do teste de navegador** — *Substituído*

`ciclo-completo.spec.ts` selecionava `Natureza = ABERTA`; passou a `Formato = DISSERTATIVA`.

### AJ-064
**Cenários dos e2e** — *Criado*

`apps/api/test/cenarios.ts` evita repetir o preparo (publicar questão, compor prova, turma,
aplicação, iniciar com sessão) nos três arquivos e2e novos.

### AJ-065
**Dados do teste de fumaça** — *Removido*

O upload de verificação feito pela stack (login → `POST /midias` → `GET` com cabeçalhos) foi
apagado do banco e do volume. Seed reaplicado na stack (idempotente) para criar o mini quiz.

### AJ-066
**Situação no documento de requisitos (atualização)** — *Substituído*

Os 16 parágrafos "Implementação (11/10/2026)" do `.docx` foram **regenerados a partir da cópia
original** (sem anotações) com os textos atualizados — evita parágrafos duplicados. Mudaram RF01–RF09,
RF11, RNF03 e RNF05; o texto original do documento continua intacto.

### AJ-067
**Dependências do lote 7** — *Criado*

`nodemailer` (envio SMTP) e `katex` (fórmulas → MathML). Escolhidas versões publicadas há mais de
duas semanas (as mais recentes tinham dias) por cautela com a cadeia de suprimentos; `npm audit`
continua sem vulnerabilidades. Nenhuma tem script de instalação.

### AJ-068
**Migration do lote 7** — *Criado*

Gerada por `prisma migrate diff`; o comentário automático sobre PostgreSQL ≤ 11 (vários valores
de enum numa migration) foi removido — usamos PostgreSQL 18.

### AJ-069
**Saída para SMTP** — *Criado*

As redes da API eram todas internas (sem internet). `egress-net` dá saída só à API, para o SMTP.

### AJ-070
**Seed e política** — *Criado*

Sem isso o aviso de ciência apareceria a cada teste de navegador/carga com as contas do seed.

### AJ-071 a AJ-077
**Ajustes de testes e organização** — ver tabela. Destaque: o formulário de login agora consulta
`/auth/recursos` (para mostrar *Esqueci minha senha*), por isso os testes que o montam precisam do
cliente do TanStack Query.

### AJ-078 a AJ-087
**Lote 8** — ver tabela. Destaques: a composição antiga (lista única de questões) virou caso
particular das seções (uma seção fixa sem nota mínima é gravada sem seção, compatível com provas
existentes); o fluxo SSE precisou de `location` própria no Nginx para não ficar retido em buffer.

### AJ-088 a AJ-095
**Visual do Figma** — ver tabela e [feature 037](features/037-visual-figma.md). Destaques:
- A CSP (`default-src 'self'`) impede o Google Fonts, por isso a Inter vem do npm.
- A troca da saudação do painel exigiu ajustar o `apoio.ts` do e2e.
- Cada grupo de páginas ganhou o próprio CSS, para que seis agentes trabalhassem em paralelo sem conflito em `layouts.css`.

**Erro do agente:** o primeiro subagente foi lançado com o modelo de instruções sem preencher (sem lista de arquivos). Ele foi interrompido antes de alterar qualquer coisa, o que foi conferido no `git status`, e relançado com as instruções corretas.

### AJ-096 a AJ-103
**Lote 9: operação** — ver a tabela, a [feature 038](features/038-metricas-logs-e-teste-de-restauracao.md) e o ADR-0054. Destaques:
- A rota de métricas fica no `HealthController` (já público e sem rate limit). O Nginx a bloqueia com regex que não diferencia maiúsculas, porque o Express também não diferencia (`/API/V1/HEALTH/METRICAS` chegaria à API).
- O Vector não interpolou `${VAR}` dentro do arquivo de destinos gerado no início do container, e a URL do Loki foi rejeitada. Os valores passaram a ser gravados já resolvidos, com escape de `\`, `"` e `$`, este último porque o Vector interpola `$VAR`. Teste: `testes/infra/testar-logs.sh`.
- O destino externo dos logs usa buffer com `drop_newest`. No padrão (`block`), um Loki fora do ar travaria também a gravação local.
- O teste da cópia externa é manual e mensal, porque a chave privada não fica no VPS (ADR-0030). Por isso o monitor cobra o prazo.
- **Documentação:** várias pendências já resolvidas continuavam abertas em 001, 004, 005, 006, 017, 018, 020, 028, no checklist e no 09b. Duas linhas de pendência tinham um `- [ ]` grudado num `- [x]`.
- **HTTPS na homologação (AJ-103):** com o TLS ligado, o HTTP só devolve 301. As etapas `stack`, `navegador`, `carga` e `monitor` chamavam o HTTP fixo e quebrariam. Um `POST` redirecionado vira `GET` no `fetch`, por exemplo. Agora elas usam `URL_APP`.
- **Incidente:** em 2026-10-20, as alterações do lote 9, ainda sem commit, foram descartadas do working tree (provavelmente `git checkout`/`git clean`) depois de a bateria ter passado. Não havia stash. Foram reimplementadas a partir do registro da sessão e verificadas de novo (typecheck, lint, unitários, e2e afetado e etapa `logs`). Lição: fazer commit assim que a bateria passar.

### AJ-104
**Homologação pública com certificado válido** — ver o [ADR-0056](adr/0056-dominio-sslip-sem-dominio-proprio.md). A primeira emissão real revelou o [BUG-026](bugs-corrigidos.md#bug-026). Primeiro foi feito um ensaio no staging do Let's Encrypt, para confirmar que a porta 80 era alcançável de fora, e esse certificado de ensaio foi apagado antes da emissão definitiva.

### AJ-105 a AJ-107
**Auditoria do 09c (2026-10-24).** Uma revisão do frontend, tarefa a tarefa, conferiu cada uma contra o código e a API. Ela achou os bugs [BUG-028 a BUG-038](bugs-corrigidos.md#bug-028) e as lacunas abaixo:
- **AJ-105:** a API já aceitava `professorResponsavelId` desde o lote 2, mas nenhuma tela o enviava.
- **AJ-106:** as três ações agiam direto, sem confirmação.
- **AJ-107:** o aviso de saída do passo usa `window.confirm`, para não manter um diálogo só para isso.

### AJ-108 a AJ-110
**Pendências do ambiente no plano do Dev B (2026-10-26).**
- **AJ-108:** a etapa `estatico` da bateria falhava por 7 vulnerabilidades (5 altas). O `@nestjs/platform-express` fixa `multer@2.4.0` até na versão 12.2.0, então foi preciso um override. Na primeira tentativa o npm removeu a `multer` do `node_modules`, e foi necessário reinstalar a `platform-express`. Subir só o `@nestjs/core` para 12.2 quebrou o e2e (`SSE_OPTIONS_METADATA` ausente no `common` 12.1), e os pacotes do Nest foram alinhados.
- **AJ-109:** além do falso positivo, o portão antigo bloqueava o deploy quando o uptime falhava (site fora do ar), justamente quando o deploy é necessário. A versão nova consulta `actions/workflows/ci.yml/runs?head_sha=…`. As versões das actions são as que o Dependabot já propunha; elas só serão verificadas na próxima execução do CI no GitHub.
- **AJ-110:** antes, cada gravação fazia cerca de 9 consultas e carregava os JSONs de questões e gabarito e todas as respostas, duas vezes. A composição usada no envio deixa de ser recarregada a cada aluno quando a turma envia junta. A prova publicada não muda os parâmetros lidos, e o cache tem teto de 200 provas.

### AJ-111
**Bateria completa de 2026-10-26: 3 falhas, nenhuma no produto.**
- **monitor:** a rodada "tudo saudável" viu na janela de 5 min o tráfego do teste de carga recém-executado, com p95 de 2,5 s. A latência vinha da troca de senha de 40 alunos ao mesmo tempo (Argon2), e o autosave estava em 235 ms. Em produção, isso dispararia alarme falso a cada início de prova. As rotas de credencial saíram da latência e continuam na taxa de 5xx (ADR-0054).
- **navegador/https (Excel):** o teste abria o relatório da "Avaliação Diagnóstica de Biologia", que só tem notas enquanto sobram dados de outros testes. A limpeza da carga apaga essas notas. O teste passou a abrir a primeira prova da tabela "Provas" dos relatórios.
- **https (login):** a suíte de navegador sobre HTTPS roda logo depois da etapa `navegador` e estourava o limite de 10 logins por minuto do mesmo professor (429, ADR-0011, comportamento correto). Por isso ela espera 61 s. Rodadas da bateria emendadas uma na outra ainda podem esbarrar nesse limite no primeiro teste.

### AJ-112
**Índices em `notas`.** A fila de correção (`status = PENDENTE_CORRECAO_MANUAL` ordenada por `fim_em`) e o cursor da API de integração (`status = CONSOLIDADA` ordenado por `consolidada_em, id`) varreriam a tabela inteira conforme ela crescesse. O `prisma migrate diff` das migrations contra o schema ficou vazio, o que confirma que os índices novos estão declarados nos dois lugares e que o índice parcial de matrícula não é removido.

### AJ-113 a AJ-114
- **AJ-113:** a tabela de notificações só era limpa por pedido da LGPD. O modelo não guarda a data de leitura, então a regra usa notificações **lidas** e **criadas** há mais de 180 dias. As não lidas ficam. A escolha dos 180 dias foi do usuário em 2026-10-27.
- **AJ-114:** foram aplicados os PRs do Dependabot. Os grupos npm de versões menores e patches viraram um `npm update` dentro das faixas, em vez dos lockfiles das branches, que estavam desatualizados. O `allowScripts` do `package.json` fixa versões, então os scripts de instalação do Prisma 7.10.1 precisaram ser aprovados (sem isso, o npm não os executa). O vitest 5 passou sem mudança nos testes. O Node 26 ainda não é LTS; por decisão do usuário, ele e o `@types/node` 26 ficam para depois. Os PRs aplicados devem fechar sozinhos depois do push.

### AJ-115
**Itens do Figma implementados (escolha do usuário em 2026-10-27).**
- **Filtros por tipo e dificuldade:** `GET /questoes?formato=&dificuldade=`.
- **"Salvar e avançar":** vai para a próxima questão pendente da tentativa. Sem nenhuma, abre a próxima tentativa da fila; com a fila vazia, volta para a lista.
- **"Marcar para revisar":** lembrete do aluno, guardado no `localStorage` por tentativa. Não vai para o servidor porque não afeta nota nem correção, e funciona sem rede. Não aparece na navegação sequencial.

Na mesma rodada, o usuário decidiu deixar **tema escuro** fora e **não** adotar agora a verificação automática de acessibilidade (axe). A conferência visual da montagem de prova foi feita por captura automatizada, comparada com o Figma 14.

A nova suíte de navegador cobre turmas (criação e CSV), acompanhamento de aplicação, filtros e a parte LGPD de "Minha conta". As telas de administração continuam fora do Playwright, porque exigem administrador com MFA; elas são cobertas pelo e2e da API.

**Erro do agente (2026-10-27):** o commit `3d73edc` usou `git add -A` e levou junto um arquivo que não era do agente, `docs/apresentacoes/roteiro-apresentacao-frontend.pdf`, criado em outra linha de trabalho. O arquivo foi removido pelo commit `eac87a6`, então o estado final está correto, mas o PDF ficou no histórico. Desde então, o agente só adiciona ao commit os caminhos que alterou.

### AJ-116
**Roteiro de demonstração e teste dependente de dados.** O teste do ciclo completo aplicava a prova na **primeira turma** do seletor. Uma "Turma E2E" sem alunos, criada por uma execução interrompida do teste novo de turmas, virou a primeira da lista e quebrou o ciclo (o aluno não via a prova). O teste passou a escolher a Turma Piloto 2026.2 pelo nome. O roteiro de demonstração percorre o ciclo completo por requisito do documento e indica o que mostrar e o resultado esperado de cada passo.


### AJ-117
**Tema escuro entra no escopo.** Na rodada do AJ-115, o tema escuro tinha ficado fora. No mesmo dia, o usuário pediu a troca de tema nas configurações, com padrão que segue o sistema (ADR-0059, feature 039). No caminho, 15 cores fixas do CSS (`#fff` sobre cor sólida, hover, cabeçalho de tabela, placeholder, trilho do interruptor e das barras) viraram tokens. Assim, nenhuma tela fica com fundo claro no tema escuro. O branco do botão do interruptor ficou fixo, porque funciona nos dois temas.

### AJ-118
**Termos de Uso e aceite obrigatório (ADR-0060).** O aviso de política adiável (`AvisoPolitica`, ADR-0043) e a página `Privacidade.tsx`, que tinha campos `[entre colchetes]`, foram removidos. No lugar entraram:

- os Termos de Uso e a Política de Privacidade, com fonte única em `apps/web/src/legal/documentos.ts`;
- a página de aceite bloqueante;
- a cópia gerada em `docs/legal/`.

`POLITICA_VERSAO` passou de `2026-10-11` para `2026-10-27`, e todos aceitam de novo. O aceite agora envia a versão lida e a API recusa texto desatualizado (409). Um teste unitário amarra a cópia em `docs/legal/` e as quatro ocorrências da versão ao texto exibido. Assim, a regra "a cópia sempre muda junto com os tópicos" passa a ser verificada pela automação, não só pela disciplina.

### AJ-119
**Barras de rolagem minimalistas.** A pedido do usuário, todas as barras de rolagem do sistema passaram a mostrar só o polegar: sem trilho, sem canto e sem as setas das pontas. A cor vem de dois tokens novos, `--qz-cor-rolagem` e `--qz-cor-rolagem-hover`, definidos na paleta clara e na escura, então a barra acompanha o tema. Chrome, Edge e Safari usam os pseudo-elementos `::-webkit-scrollbar`. O Firefox usa `scrollbar-width: thin` e `scrollbar-color`, só dentro de `@supports not selector(::-webkit-scrollbar)`, porque no Chrome 121+ essas propriedades anulariam os pseudo-elementos e as setas voltariam.

### AJ-120
**Homepage pública (feature 041).** A pedido do usuário, `/` passou a mostrar uma página de apresentação para quem não está logado. Antes, o visitante ia direto para `/login`. Quem tem sessão continua indo para a sua área. Os links "Voltar ao início" das páginas de erro e o logotipo das páginas legais agora levam à homepage.

### AJ-121
**Limpeza antes de publicar o repositório.** O projeto vai para um repositório novo no GitHub. Antes disso:

- o IP do servidor de homologação e o nome sslip.io correspondente foram trocados pelo exemplo reservado para documentação, `203.0.113.10` / `203-0-113-10.sslip.io`, já usado em `infra/tls`;
- a senha real das contas de demonstração da homologação saiu do guia da bateria de testes;
- o nome do usuário do GitHub antigo e o autor dos metadados do `.docx` de requisitos foram removidos. A capa do documento continua com os autores, por decisão do usuário.

As senhas e chaves do `.env` nunca foram versionadas. Credenciais de demonstração fictícias (`@teste.local`, `@quizzer.local`) foram mantidas, porque o projeto é aberto e está em desenvolvimento.
