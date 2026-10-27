# Quizzer — Sistema de Formulação de Quizzes e Provas

Plataforma de avaliações digitais (banco de questões, composição de provas, aplicação com
cronômetro no servidor, correção, recursos e relatórios), com ambientes **Profissional** e
**Aluno**. Requisitos em [`docs/Documento_Requisitos_Sistema_de_Provas.docx`](docs/) e plano
de 4 semanas em [`docs/09_Plano_Sprints_Geral.md`](docs/09_Plano_Sprints_Geral.md).

**Estado atual:** MVP funcional (Sprints 1–4) — ciclo completo **Questão → Prova → Aplicação →
Execução → Correção → Recurso → Relatório**, com MFA, prova pública por PIN, notificações in-app
e auditoria imutável; sessão única por tentativa, administração de contas, LGPD, HTTPS, backup
criptografado com cópia externa, testes de navegador e de carga no CI. **Lote 6:** questões
verdadeiro/falso e resposta curta, imagens/áudios, aprovação de alto risco, delegação de
permissões, co-professores, MFA opcional e exigível por prova, gabarito e prazo de recurso por
prova, impressão/PDF, relatórios por aluno/disciplina/período, monitor com alerta. **Lote 7:** fórmulas,
várias corretas, numérica, e-mail opcional (esqueci a senha, convites), códigos de recuperação do MFA,
aplicação a alunos escolhidos, Excel e indícios nos relatórios, uptime externo e deploy manual. **Lote 8:**
seções e sorteio de questões, associação e ordenação, correção às cegas/designada com rubrica pontuada,
notificações em tempo real, API de integração com sistemas acadêmicos ([guia](docs/operacao/integracao.md))
e LGPD (correção e retenção). Situação de cada requisito:
[requisitos-status.md](docs/requisitos-status.md) · como usar: [guias](docs/guias/README.md). Ver [features](docs/features/README.md), [decisões (ADRs)](docs/adr/README.md),
[bugs corrigidos](docs/bugs-corrigidos.md) e [ajustes de percurso](docs/ajustes-de-percurso.md).

## Stack

| Camada | Tecnologia |
|---|---|
| API | Node.js 24 · NestJS 12 · TypeScript 6 · Prisma 7 · PostgreSQL 18 · Redis 8 |
| Web | React 19 · Vite 8 · React Router 8 · TanStack Query 5 |
| Infra | Docker Compose · Nginx · GitHub Actions |
| Qualidade | Vitest · Testing Library · Playwright · oxlint · Dependabot |

## Estrutura

```
apps/api      API REST (monólito modular) — src/modules/<modulo>, prisma/
apps/web      SPA (ambientes profissional e aluno) — src/design-system, src/paginas
infra/        nginx, postgres (init), backup, monitor, tls, vps/
testes/       bateria completa (testar-tudo.sh), testes de infraestrutura e de carga
docs/         requisitos, plano, adr/, features/
```

## Desenvolvimento

Pré-requisitos: Node.js 24+, Docker.

```bash
npm ci
cp apps/api/.env.example apps/api/.env       # gere os segredos indicados no arquivo
npm run dev:infra                             # Postgres + Redis (somente 127.0.0.1)
npm run db:deploy -w @quizzer/api             # aplica migrations
npm run db:seed -w @quizzer/api               # admin, professor, aluno e turma de teste
npm run dev:api                               # http://localhost:3000/api/v1/health
npm run dev:web                               # http://localhost:5173
```

Usuários do seed (senha = `SEED_SENHA_PADRAO`):

| Login | Papel | Para testar |
|---|---|---|
| `professor@quizzer.local` | Professora (Ana) | questões, turmas, provas, aplicações, correção, recursos, relatórios |
| `revisor@quizzer.local` | Professor (Carlos) | aprovar questões da Ana (dupla checagem) |
| `corretor@quizzer.local` | Corretora | fila de correção |
| `admin@quizzer.local` | Administrador | usuários, auditoria, reabrir tentativas (pede cadastro de MFA no 1º login) |
| `aluno@quizzer.local` / matrícula `2026000001` | Aluno (Bruno) | fazer provas, ver resultados, contestar |
| `aluno2@quizzer.local` / matrícula `2026000002` | Aluna (Camila) | segundo participante |

O seed também deixa uma prova aberta para a turma (7 dias) e um quiz público — o **PIN** é
impresso no fim do seed (acesse `/p/<PIN>`).

## Roteiro rápido de teste no navegador

1. `/aluno/login` como **Bruno** → *Avaliação Diagnóstica de Biologia* → Iniciar. Responda,
   recarregue a página (nada se perde), envie e veja o comprovante.
2. `/login` como **Ana** → *Correções* → corrija a questão dissertativa → a nota é publicada
   e o Bruno recebe notificação (sino).
3. Como **Bruno** → *Resultados* → contestar uma questão. Como **Ana** → *Recursos* → decidir
   (ajuste ou anulação para todos).
4. Como **Ana** → *Relatórios* → gráficos e *Exportar CSV*.
5. Como **Ana** → *Banco de questões* → nova questão → enviar para revisão; como **Carlos** →
   aba *Aguardando minha revisão* → aprovar. Depois *Provas → Nova prova* → assistente →
   publicar → *Aplicar prova* à turma ou ao público.
6. Em uma janela anônima: `/p` → digite o PIN → responda como participante externo.
7. Como **Bruno** → *Mini quiz: verdadeiro/falso e resposta curta* → o resultado mostra o gabarito
   e o prazo de recurso. Como **Ana** → nova questão com **Formato** e imagem; prova → *Imprimir / PDF*.

Roteiro manual completo (inclui MFA opcional, delegação, co-professores e relatórios):
[docs/testes/roteiro-de-testes.md](docs/testes/roteiro-de-testes.md).

## Testes e qualidade

**Tudo de uma vez** (estático, unitários, e2e, stack, navegador, carga, backup, monitor, HTTPS e
prontidão) com relatório em `testes/resultados/`:

```bash
testes/testar-tudo.sh --senha <senha do seed>     # ou: npm run test:tudo -- --senha …
testes/testar-tudo.sh --rapido                    # ou: npm run test:rapido
```

Comandos avulsos:

```bash
npm run typecheck
npm run lint
npm test            # unitários (API + Web)
npm run test:e2e    # e2e da API contra Postgres/Redis reais (banco quizzer_test)

# Contra a stack Docker no ar e semeada:
E2E_SENHA=<senha do seed> npm run test:navegador        # Playwright: ciclo completo no navegador
npm run test:carga -- --senha <senha do seed> --alunos 40   # turma inteira ao mesmo tempo
```

## Implantação em produção

Siga o **[roteiro de implantação](docs/operacao/implantacao.md)**. Resumo:

```bash
sudo bash infra/vps/provisionar.sh                       # firewall, SSH só por chave, fail2ban
cp .env.example .env && chmod 600 .env                   # segredos
docker compose up -d --build
infra/tls/ativar-letsencrypt.sh <dominio> <email>        # ou gerar-autoassinado.sh <IP> sem domínio
docker compose run --rm migrate npx tsx prisma/criar-admin.ts --nome "…" --email …   # nunca o seed
infra/backup/gerar-chave.sh ~/quizzer-backup.key         # + remoto rclone e webhook no .env
sudo bash infra/vps/verificar-producao.sh                # go-live só sem ❌
```

HTTPS: [feature 017](docs/features/017-https.md) · backup: [016](docs/features/016-operacao-backup-e-carga.md)
e [018](docs/features/018-backup-externo.md) · LGPD: [019](docs/features/019-lgpd.md) ·
segurança: [checklist](docs/seguranca/checklist-final.md).

Detalhes em [docs/features/006-infraestrutura-e-deploy.md](docs/features/006-infraestrutura-e-deploy.md).

## Como contribuir

- Toda decisão de fatoaa → ADR em `docs/adr/`. Toda feature → documento em `docs/features/`
  ([ADR-0001](docs/adr/0001-registro-de-decisoes-e-features.md)).
- Bug corrigido → [`docs/bugs-corrigidos.md`](docs/bugs-corrigidos.md). Algo criado/removido
  fora do plano → [`docs/ajustes-de-percurso.md`](docs/ajustes-de-percurso.md)
  ([ADR-0015](docs/adr/0015-registro-de-bugs-e-ajustes.md)).
- Código gerado por IA passa por revisão humana antes do commit; testes no mesmo PR; CI verde
  (plano, Seções 3 e 5).
- Convenções de nome e API: [ADR-0013](docs/adr/0013-convencoes-de-nomenclatura-e-api.md).
# quizzer
