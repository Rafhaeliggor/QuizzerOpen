# Dev A — Backend

**Responsabilidade:** módulos de cadastro/fundação — IAM, Usuários, Turmas, Banco de Questões, Composição de Provas (CRUD), e na Sprint 3 a geração de instância/autosave/submissão da Aplicação.

> 🔁 = item reincorporado ao escopo graças ao apoio de agentes de IA.

> **Situação em 2026-10-27** — a base do backend e do domínio do produto foi implementada,
> testada e validada por automação. A revisão de código de 2026-10-26 achou 10 defeitos em
> módulos do Dev A, todos corrigidos em 2026-10-27 (BUG-047 a BUG-057, ADR-0058; tabela ao final).
> A **revisão humana** exigida pela Definição de Pronto (plano, Seção 5) continua **pendente para
> todos os itens**. Repositório publicado e CI ligado; falta a validação operacional em produção.
> Visão completa: [requisitos-status.md](requisitos-status.md).
>
> **2026-10-27 (tarde):** o aceite da política passou a receber a versão lida e recusa texto
> desatualizado (409) — Termos de Uso e aceite obrigatório, ADR-0060, feature 040.

## Status final do backend

- O backend está funcional e coberto pela maioria dos requisitos de negócio e segurança do sistema.
- O que já foi entregue atende ao fluxo principal: autenticação, papéis, turma, banco de questões, provas, execução, correção, recursos, relatórios e auditoria.
- A lacuna restante não é de escopo funcional e sim de revisão humana/operacional: revisão final do código, conferência das regras contra o anexo de RNs (ausente), checagem de produção, domínio/TLS definitivos e aprovação do DPO/política de privacidade.
- A identidade visual do Figma foi tratada no frontend, conforme a feature 037; ela não representa pendência do backend.

---

## Sprint 1 (Semana 1) — Fundação

| Tarefa | Prazo | Situação |
|---|---|---|
| Setup do projeto NestJS (estrutura modular, lint, config de ambiente) | Seg | ✅ [006](features/006-infraestrutura-e-deploy.md) |
| Modelagem do schema inicial (Usuário, Turma, Questão, Prova, Aplicação, Tentativa, Nota) + migrations | Seg–Ter | ✅ [005](features/005-modelo-de-dados-e-seed.md) |
| Módulo IAM: cadastro, login, JWT, guard de papéis (Admin/Professor/Aluno) | Ter–Qua | ✅ [001](features/001-autenticacao-e-sessao.md) [003](features/003-controle-de-acesso.md) [004](features/004-gestao-de-usuarios.md); renovação simultânea não derruba a sessão ([BUG-047](bugs-corrigidos.md#bug-047)); bloqueio sem enumeração ([BUG-048](bugs-corrigidos.md#bug-048)) |
| 🔁 MFA (TOTP) obrigatório para Admin/Coordenador, com testes gerados junto | Qui | ✅ [002](features/002-mfa-totp.md) |
| Seed de dados de teste (1 admin, 1 professor, 1 aluno, 1 turma) + revisão humana de tudo acima | Sex | ✅ [005](features/005-modelo-de-dados-e-seed.md) |

---

## Sprint 2 (Semana 2) — Banco de Questões, Turmas e Composição de Provas

| Tarefa | Prazo | Situação |
|---|---|---|
| CRUD de Questões (natureza fechada e aberta) | Seg–Ter | ✅ [008](features/008-banco-de-questoes.md) |
| CRUD de Turmas + matrícula manual de alunos | Qua | ✅ [009](features/009-turmas-e-importacao-csv.md) |
| 🔁 Importação de alunos via CSV em lote (parser + validação de linha) | Qui | ✅ [009](features/009-turmas-e-importacao-csv.md); linhas em paralelo e matrícula repetida barrada ([BUG-049](bugs-corrigidos.md#bug-049)); mensagens sem dados de terceiros ([BUG-051](bugs-corrigidos.md#bug-051)) |
| CRUD de Provas (dados gerais e parâmetros: tempo, tentativas, critério de aprovação) + testes | Sex | ✅ [010](features/010-composicao-de-provas.md) |

---

## Sprint 3 (Semana 3) — Aplicação (Execução) e Correção

| Tarefa | Prazo | Situação |
|---|---|---|
| Geração de instância por aluno (fixação de ordem de questões) | Seg–Ter | ✅ [011](features/011-aplicacao-e-execucao.md) |
| Autosave de respostas + submissão final idempotente | Qua | ✅ [011](features/011-aplicacao-e-execucao.md) |
| Geração de comprovante de submissão | Qui | ✅ [011](features/011-aplicacao-e-execucao.md) |
| 🔁 Testes de borda gerados com apoio de IA (duplo clique, reenvio por falha de rede, envio após expiração) + ajustes de integração | Sex | ✅ e2e + [011](features/011-aplicacao-e-execucao.md) |

---

## Sprint 4 (Semana 4) — Relatórios, Recursos, Auditoria Mínima e Polimento

| Tarefa | Prazo | Situação |
|---|---|---|
| Relatórios básicos: desempenho por aluno/turma/prova (taxa de acerto, notas) | Seg–Ter | ✅ [014](features/014-relatorios.md); agrupamento pelo aluno, não pelo e-mail ([BUG-055](bugs-corrigidos.md#bug-055)); anulação por prova ([BUG-056](bugs-corrigidos.md#bug-056)) |
| Exportação simples em CSV | Qua | ✅ [014](features/014-relatorios.md) |
| 🔁 Notificações in-app básicas (evento "prova disponível" e "resultado publicado", sem e-mail/push) | Qui | ✅ [015](features/015-notificacoes-e-auditoria.md) |
| Ajustes finos de regras pendentes (ex.: bloqueio de correção 100% automática em prova mista) + revisão final | Sex | ✅ [012](features/012-correcao.md) |

---

## Além do plano — lote 6 (2026-10-11): pendências dos requisitos

Itens que o plano deixou fora das 4 semanas, implementados depois a pedido do responsável.

| Tarefa | Situação |
|---|---|
| Formatos verdadeiro/falso e resposta curta (criação, execução, correção automática, snapshot) | ✅ [021](features/021-formatos-midia-e-alto-risco.md) |
| Mídias (imagem/áudio) na versão da questão — upload, validação, URL de capacidade | ✅ [021](features/021-formatos-midia-e-alto-risco.md) |
| Aprovação formal de alteração em questão de alto risco (versão pendente) | ✅ [021](features/021-formatos-midia-e-alto-risco.md) |
| Delegação de permissões específicas (RF02) | ✅ [022](features/022-delegacao-e-co-professores.md) |
| Co-professores de turma (RF03) | ✅ [022](features/022-delegacao-e-co-professores.md) |
| MFA opcional, MFA exigido por prova, sessões abertas | ✅ [023](features/023-mfa-opcional-e-sessoes.md) |
| Política de gabarito, prazo de recurso, eventos de comportamento, duplicar prova | ✅ [024](features/024-politicas-impressao-e-comportamento.md) |
| Relatórios por aluno, por disciplina e por período; auditoria com nomes, período e CSV | ✅ [025](features/025-relatorios-avancados-e-auditoria.md); período no fuso da instituição ([BUG-057](bugs-corrigidos.md#bug-057), ADR-0058); paginação com teto ([BUG-052](bugs-corrigidos.md#bug-052)) |

## Além do plano — lote 7 (2026-10-12)

| Tarefa | Situação |
|---|---|
| Várias corretas (parcial), resposta numérica, mídias no snapshot da correção, limpeza de mídias órfãs | ✅ [028](features/028-formulas-e-formatos-avancados.md) |
| Aviso de versão mais nova e atualização da prova em rascunho | ✅ [028](features/028-formulas-e-formatos-avancados.md) |
| E-mail opcional, esqueci a senha, convites, códigos de recuperação do MFA, ciência da política, rotação da chave | ✅ [029](features/029-email-e-recuperacao-de-conta.md) |
| Alunos escolhidos, transferência entre turmas, delegação com validade, limite por sessão | ✅ [030](features/030-aplicacao-avancada-e-turmas.md) |
| Excel (.xlsx) e indícios para revisão | ✅ [031](features/031-relatorios-excel-e-indicios.md) |

## Além do plano — lote 8 (2026-10-12)

| Tarefa | Situação |
|---|---|
| Seções, sorteio por participante e nota mínima por seção | ✅ [032](features/032-secoes-e-sorteio.md) |
| Associação e ordenação; rubrica pontuada; correção às cegas; corretores designados; recurso encaminhado | ✅ [033](features/033-correcao-avancada-e-formatos-estruturados.md) |
| Notificações em tempo real (SSE + Redis) e fila de e-mail | ✅ [034](features/034-notificacoes-tempo-real-e-fila.md); fila sem envio duplicado ([BUG-050](bugs-corrigidos.md#bug-050)); retenção de notificações lidas (AJ-113) |
| API de integração (chaves por escopo, turmas por código externo, notas por cursor) | ✅ [035](features/035-api-de-integracao.md) |
| LGPD: correção de dados e retenção de externos | ✅ [036](features/036-lgpd-correcao-e-retencao.md) |

### Observação de escopo

Este documento cobre o backend e a lógica de negócio associada ao produto. A identidade visual do Figma, incluindo tokens, layouts e reaproveitamento de componentes no front-end, foi tratada no documento do frontend: [09c_Dev_C_Frontend.md](09c_Dev_C_Frontend.md) e a feature [037](features/037-visual-figma.md).

> Em outras palavras, o backend não tinha uma pendência de entrega separada nesse tema; o que ficou pendente na feature 037 foi exclusivamente de experiência visual e implementação UI, não de API ou domínio.

## Revisão de 2026-10-26 — defeitos corrigidos em 2026-10-27

| Defeito | Situação |
|---|---|
| Relatórios agrupando tentativas pelo e-mail | ✅ [BUG-055](bugs-corrigidos.md#bug-055) |
| Renovação de sessão simultânea derrubando a sessão | ✅ [BUG-047](bugs-corrigidos.md#bug-047) |
| Período em UTC e fusos misturados | ✅ [BUG-057](bugs-corrigidos.md#bug-057) — `FUSO_HORARIO=America/Maceio` (ADR-0058) |
| Anulação vazando entre provas e N+1 nos relatórios | ✅ [BUG-056](bugs-corrigidos.md#bug-056) |
| Importação de CSV em série | ✅ [BUG-049](bugs-corrigidos.md#bug-049) |
| Fila de e-mail com envio duplicado | ✅ [BUG-050](bugs-corrigidos.md#bug-050) |
| Enumeração de contas pelo bloqueio | ✅ [BUG-048](bugs-corrigidos.md#bug-048) — resposta genérica + aviso ao titular |
| Matrícula revelando e-mail/papel de terceiros | ✅ [BUG-051](bugs-corrigidos.md#bug-051) |
| Paginação sem máximo | ✅ [BUG-052](bugs-corrigidos.md#bug-052) |
| Validação em inglês | ✅ [BUG-053](bugs-corrigidos.md#bug-053) |
| Notificações sem retenção | ✅ AJ-113 — lidas com mais de 180 dias |
| PRs do Dependabot (exceto Node 26) | ✅ AJ-114 |

