# Dev B — Backend + DevOps

**Responsabilidade:** módulos de execução/estado — composição de prova, cronômetro, correção, recursos e auditoria — **e** toda a infraestrutura (VPS, Docker, CI/CD, monitoramento).

> 🔁 = item reincorporado ao escopo graças ao apoio de agentes de IA.

> **Situação em 2026-10-20 (lote 9)** — a parte de backend + DevOps foi implementada e validada com
> automação. O lote 9 fechou as pendências que não dependiam do VPS: métricas de 5xx/latência,
> logs centralizados, teste periódico da cópia externa e a decisão sobre HSTS preload
> ([038](features/038-metricas-logs-e-teste-de-restauracao.md)). A homologação roda em HTTPS
> com Let's Encrypt em `https://203-0-113-10.sslip.io` desde 2026-10-20 (ADR-0056). A **revisão humana** exigida pela Definição de Pronto (plano,
> Seção 5) continua **pendente para todos os itens**. O que resta é execução no ambiente real
> (lista abaixo). Visão completa: [requisitos-status.md](requisitos-status.md).

## Status final do backend + DevOps

- O backend operacional está funcional em homologação, com observabilidade, backup, carga e monitoramento básicos implementados.
- Os itens de infraestrutura estão prontos, mas ainda não foram validados no ambiente de produção final com a revisão humana concluída.

### O que resta (depende do ambiente real ou de terceiros)

| Pendência | Quem / onde |
|---|---|
| Rodar `infra/vps/provisionar.sh` no VPS e o roteiro até o verificador ficar sem ❌ | TI — [implantação](operacao/implantacao.md) |
| Domínio da instituição → `ativar-letsencrypt.sh` (fluxo já validado com sslip.io em homologação) | TI — [017](features/017-https.md) |
| Remoto real do backup (bucket) + webhook; primeiro `testar-copia-externa.sh` | TI — [018](features/018-backup-externo.md), [038](features/038-metricas-logs-e-teste-de-restauracao.md) |
| Teste de carga a partir de outra máquina, antes de liberar | TI — [implantação, "Teste de carga antes de liberar"](operacao/implantacao.md) |
| Conferir o resultado do CI no GitHub (aba *Actions*) e revisar os PRs do Dependabot | equipe |
| Volume do banco cifrado (disco do VPS / provedor) | TI / provedor |
| Política de privacidade revisada pelo DPO | instituição |
| Revisão humana de todos os itens | equipe |

---

## Sprint 1 (Semana 1) — Fundação

| Tarefa | Prazo | Situação |
|---|---|---|
| Provisionar VPS: Docker + Docker Compose, usuário não-root, firewall (ufw), SSH hardening | Seg | ⚠️ script pronto, **não executado no VPS real** — [020](features/020-implantacao-producao.md) |
| `docker-compose.yml` + Dockerfiles (api, postgres, redis, nginx) | Ter | ✅ [006](features/006-infraestrutura-e-deploy.md) |
| Pipeline CI (GitHub Actions): lint → build → test a cada push + Nginx como reverse proxy (IP do VPS, HTTP por enquanto) | Qua | ✅ pipeline e Nginx prontos; repositório no GitHub (Dependabot ativo). 2026-10-26: `npm audit` zerado (AJ-108), deploy exige o workflow CI verde e actions atualizadas (AJ-109) — ⚠️ conferir a próxima execução no GitHub — [006](features/006-infraestrutura-e-deploy.md) |
| Deploy do esqueleto da API no VPS + endpoint de health-check | Qui | ⚠️ health-check ✅; rodando em homologação, deploy no VPS real pendente |
| 🔁 Logging estruturado básico (stdout em JSON) e revisão de segurança dos Dockerfiles gerados por IA (sem segredo hardcoded) | Sex | ✅ [006](features/006-infraestrutura-e-deploy.md) |

---

## Sprint 2 (Semana 2) — Banco de Questões, Turmas e Composição de Provas

| Tarefa | Prazo | Situação |
|---|---|---|
| Composição manual de prova (seleção de questões + cálculo de peso) | Seg–Ter | ✅ [010](features/010-composicao-de-provas.md); arredondamento decimal da nota ([BUG-045](bugs-corrigidos.md#bug-045)) |
| Visibilidade da prova (pública/privada) + geração de PIN/link de acesso | Qua | ✅ [011](features/011-aplicacao-e-execucao.md) |
| Infra: volume persistente do Postgres + rotina de backup automatizado (cron simples) | Qui | ✅ [016](features/016-operacao-backup-e-carga.md) [018](features/018-backup-externo.md) |
| Revisão de segurança do endpoint de acesso público (gerado por IA): rate limit e validação de PIN | Sex | ✅ ADR-0011/0016 |

---

## Sprint 3 (Semana 3) — Aplicação (Execução) e Correção

| Tarefa | Prazo | Situação |
|---|---|---|
| Cronômetro server-side via Redis, resiliente a desconexão (sem pausa automática) | Seg–Ter | ✅ prazo no PostgreSQL em vez do Redis (ADR-0017) — [011](features/011-aplicacao-e-execucao.md) |
| Correção automática de questões fechadas | Qua | ✅ [012](features/012-correcao.md); gabarito de associação/ordenação não mais dedutível pelos IDs ([BUG-042](bugs-corrigidos.md#bug-042), ADR-0057) |
| Fila de correção manual (questões abertas) + consolidação de nota final | Qui | ✅ [012](features/012-correcao.md); trava na nota para corretores simultâneos ([BUG-043](bugs-corrigidos.md#bug-043)), índice da fila (AJ-112), às cegas sem IDs do aluno ([BUG-046](bugs-corrigidos.md#bug-046)) |
| Infra: logs centralizados básicos (stdout + volume) e verificação simples de uptime | Sex | ✅ logs JSON com rotação, healthchecks, **monitor com alerta por webhook** ([026](features/026-monitoramento-e-manutencao.md)), logs centralizados opcionais com métricas de 5xx/latência ([038](features/038-metricas-logs-e-teste-de-restauracao.md)); uptime externo (`uptime.yml`) ligado com `URL_PRODUCAO=https://203-0-113-10.sslip.io` (2026-10-26) |

---

## Sprint 4 (Semana 4) — Relatórios, Recursos, Auditoria Mínima e Polimento

| Tarefa | Prazo | Situação |
|---|---|---|
| Recursos/Contestações (fluxo simples: abrir, decidir, recalcular nota manualmente) | Seg–Ter | ✅ [013](features/013-recursos.md); anulação em lote com timeout de 60 s ([BUG-044](bugs-corrigidos.md#bug-044)) e decisão com trava ([BUG-043](bugs-corrigidos.md#bug-043)) |
| Log de auditoria mínimo (tabela de eventos sensíveis: quem, quando, o quê) | Qua | ✅ [015](features/015-notificacoes-e-auditoria.md) |
| Hardening final do VPS (variáveis de ambiente/secrets, preparação para TLS quando houver DNS) + revisão de segurança de tudo que a IA gerou nas 4 semanas (checklist final) | Qui | ✅ [017](features/017-https.md) · [checklist](seguranca/checklist-final.md); TLS com Let's Encrypt validado em homologação (ADR-0056); revisão de 2026-10-26 com os achados corrigidos (BUG-041 a BUG-045) |
| Teste de carga básico (ex.: simular turma inteira iniciando prova ao mesmo tempo) | Sex | ✅ [016](features/016-operacao-backup-e-carga.md); autosave e envio mais leves (AJ-110); ⚠️ repetir em produção a partir de outra máquina (procedimento pronto) |

---

## Além do plano — lote 6 (2026-10-11)

| Tarefa | Situação |
|---|---|
| Volume de mídias, rota de upload no Nginx, mídias no backup/restauração | ✅ [021](features/021-formatos-midia-e-alto-risco.md), [018](features/018-backup-externo.md) |
| Monitor (API, Nginx, certificado, backup, disco) com webhook; Dependabot; `npm audit` semanal | ✅ [026](features/026-monitoramento-e-manutencao.md) |
| Limpeza periódica de sessões antigas | ✅ [023](features/023-mfa-opcional-e-sessoes.md) |
| Bateria de testes consolidada (`testes/testar-tudo.sh`) e roteiro de testes | ✅ [027](features/027-bateria-de-testes.md) |

## Além do plano — lote 7 (2026-10-12)

| Tarefa | Situação |
|---|---|
| SMTP opcional com rede de saída dedicada; verificador de produção confere `APP_URL` | ✅ [029](features/029-email-e-recuperacao-de-conta.md) |
| Uptime externo e deploy manual (GitHub Actions) | ✅ [031](features/031-relatorios-excel-e-indicios.md) |
| Rotação da `MFA_ENCRYPTION_KEY` e etapa `scripts` na bateria | ✅ [029](features/029-email-e-recuperacao-de-conta.md) |

## Além do plano — lote 8 (2026-10-12)

| Tarefa | Situação |
|---|---|
| Nginx para SSE (sem buffer); guia de integração para a TI; variável de retenção | ✅ [034](features/034-notificacoes-tempo-real-e-fila.md), [035](features/035-api-de-integracao.md), [036](features/036-lgpd-correcao-e-retencao.md) |

## Além do plano — lote 9 (2026-10-19/20)

| Tarefa | Situação |
|---|---|
| Métricas HTTP na API (5xx, p50/p95) e alertas no monitor; rota interna bloqueada no Nginx | ✅ [038](features/038-metricas-logs-e-teste-de-restauracao.md), ADR-0054 |
| Logs centralizados opcionais (`docker-compose.logs.yml`, Vector): arquivo por serviço/dia, retenção, encaminhamento HTTP/Loki | ✅ [038](features/038-metricas-logs-e-teste-de-restauracao.md) |
| Teste mensal da restauração a partir da cópia externa (`testar-copia-externa.sh`), cobrado pelo monitor e pelo verificador | ✅ [038](features/038-metricas-logs-e-teste-de-restauracao.md) |
| HSTS preload: decisão e opção `HSTS_PRELOAD` | ✅ ADR-0055 |
| Procedimento do teste de carga em produção a partir de outra máquina | ✅ [implantação](operacao/implantacao.md) — execução pendente |
| Homologação pública em HTTPS com certificado válido sem domínio próprio (sslip.io + Let's Encrypt), portas 80/443; bateria seguindo o modo TLS ativo | ✅ [017](features/017-https.md), ADR-0056 |
| Permissões do certificado do Let's Encrypt para o Nginx sem root | ✅ [BUG-026](bugs-corrigidos.md#bug-026) |
| Documentação desatualizada corrigida (CI/repositório, monitor externo, Dependabot, validade do certificado, pendências antigas já entregues) | ✅ AJ-101 e AJ-102 no [ajustes-de-percurso](ajustes-de-percurso.md) |

## Pendências do ambiente — 2026-10-26

| Tarefa | Situação |
|---|---|
| Vulnerabilidades em dependências (etapa `estatico` falhando) | ✅ AJ-108 |
| Portão "CI verde" do deploy e versões das actions | ✅ AJ-109 — validar na próxima execução no GitHub |
| Autosave e envio pesados no cenário de turma inteira | ✅ AJ-110 |
| Corretor com permissão delegada fora do escopo | ✅ [BUG-041](bugs-corrigidos.md#bug-041) |
| Homologação desatualizada (6 dias; migration de matrícula única não aplicada) | ✅ redeploy em 2026-10-26 com a migration aplicada |
| `URL_PRODUCAO` no GitHub e commit das alterações do ambiente | ✅ variável criada e commit `back fix_01` (2026-10-26) |

## Defeitos da revisão de 2026-10-26

| Defeito | Situação |
|---|---|
| Gabarito dedutível em associação/ordenação | ✅ [BUG-042](bugs-corrigidos.md#bug-042) |
| Correção e recurso sem trava | ✅ [BUG-043](bugs-corrigidos.md#bug-043) |
| Anulação estourando o tempo da transação | ✅ [BUG-044](bugs-corrigidos.md#bug-044) |
| Arredondamento binário da nota | ✅ [BUG-045](bugs-corrigidos.md#bug-045) |
| Correção às cegas devolvendo IDs do aluno | ✅ [BUG-046](bugs-corrigidos.md#bug-046) |
| Índices da fila de correção e do cursor da integração | ✅ AJ-112 |
