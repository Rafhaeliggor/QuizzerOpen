# Plano de Implementação — 4 Semanas (Visão Geral)

Este é o documento geral do plano. As tarefas de cada pessoa, sprint a sprint, estão em arquivos individuais:

- `09a_Dev_A_Backend.md` — Dev A (Backend)
- `09b_Dev_B_Backend_DevOps.md` — Dev B (Backend + DevOps)
- `09c_Dev_C_Frontend.md` — Dev C (Frontend)

## 0. Situação da execução (atualizado em 2026-10-27)

> Implementação feita com agente de IA e verificada por testes automatizados (unitários, e2e da API
> contra banco real, Playwright no navegador e teste de carga). **Pendente para todos os itens: a
> revisão humana** exigida pela Definição de Pronto (Seção 5). Detalhes por requisito em
> [requisitos-status.md](requisitos-status.md); por tarefa, nos arquivos 09a/09b/09c.

| Sprint | Entrega prevista | Situação |
|---|---|---|
| 1 — Fundação | Login com MFA ponta a ponta; ambiente acessível pelo IP do VPS | ✅ (em homologação; VPS real pendente) |
| 2 — Questões, Turmas, Provas | Questão, turma (manual/CSV), prova manual publicada | ✅ |
| 3 — Aplicação e Correção | Aluno responde e envia; correção; nota consolidada | ✅ |
| 4 — Relatórios, Recursos, Auditoria, Polimento | Ciclo completo no VPS | ✅ ciclo completo em homologação |

**Além do plano** (necessário para uso real): sessão única por tentativa, administração completa de
contas, revogação de acesso em até 30 s, LGPD (exportação e anonimização), HTTPS em três modos com
Nginx sem root, backup criptografado com cópia externa e alerta, testes de navegador e de carga no
CI, verificador de prontidão para produção — features 016 a 020.

**Lote 6 (pendências dos requisitos, 2026-10-11):** questões verdadeiro/falso e resposta curta,
imagens/áudios na questão (com backup), aprovação de alteração em questão de alto risco, delegação
de permissões, co-professores, MFA opcional e exigível por prova, sessões abertas em *Minha conta*,
política de gabarito, prazo de recurso, registro de saída da aba, impressão/PDF e duplicação de
prova, relatórios por aluno/disciplina/período, auditoria com CSV, monitor com alerta, Dependabot e
a bateria única de testes `testes/testar-tudo.sh` — features 021 a 027.

**Lote 7 (2026-10-12):** fórmulas LaTeX, várias corretas e resposta numérica, e-mail opcional
(esqueci a senha, convites, cópia das notificações), códigos de recuperação do MFA, ciência da
política de privacidade, aplicação a alunos escolhidos, transferência entre turmas, Excel e
indícios nos relatórios, uptime externo e deploy manual — features 028 a 031. Da Seção 6, saíram
da lista "e-mail" (agora opcional) e "anomalias" (versão simples, só indícios).

**Lote 8 (2026-10-12):** composição por seções e sorteio (versões antifraude) com nota mínima por
seção, associação e ordenação, rubrica pontuada, correção às cegas, corretores designados, recurso
encaminhado à coordenação, notificações em tempo real, fila de e-mail, API de integração com
sistemas acadêmicos e LGPD (correção de dados, retenção de externos) — features 032 a 036. Da Seção 6
saíram "pool/seções" e "versões antifraude".

**Visual do Figma (2026-10-18):** a identidade visual das 19 telas do Figma foi aplicada aos dois ambientes (tokens, fonte Inter servida pelo app, menu lateral com trilha, barra do aluno e todas as páginas), com dados reais. Elementos sem suporte na API ficaram de fora — feature 037, ADR-0053.

**Tema escuro (2026-10-27):** escolha entre Padrão do sistema (padrão), Claro e Escuro em Configurações > Aparência, nos dois ambientes. A escolha fica no navegador — feature 039, ADR-0059.

**Termos de Uso e aceite (2026-10-27):** Termos de Uso e Política de Privacidade com base na legislação brasileira, página de aceite obrigatória no primeiro acesso (e a cada versão nova) e cópia sincronizada em `docs/legal/` verificada por teste — feature 040, ADR-0060. Revisão jurídica pendente.

**Homepage e barras de rolagem (2026-10-27):** `/` mostra uma homepage pública para visitantes, com acesso ao login profissional, à área do aluno e à prova por PIN (feature 041, AJ-120). As barras de rolagem ficaram minimalistas e seguem o tema (AJ-119).

**Lote 9 — operação (2026-10-19):** métricas de 5xx e latência com alerta no monitor, logs
centralizados opcionais (coletor Vector, com encaminhamento para fora do VPS), teste mensal da
restauração a partir da cópia externa (cobrado pelo monitor) e decisão sobre HSTS preload — feature
038, ADRs 0054 e 0055. Com isso, as pendências do plano do Dev B que não dependem do VPS real foram
fechadas. Em 2026-10-20 a homologação passou a ser pública em HTTPS com certificado válido do Let's Encrypt
(`https://203-0-113-10.sslip.io`, sem domínio próprio — ADR-0056).

**Auditoria do frontend (2026-10-24):** as tarefas do 09c foram conferidas uma a uma contra o código e a API.
Todas as telas existiam, mas havia 13 defeitos ([BUG-028 a BUG-040](bugs-corrigidos.md#bug-028)), todos corrigidos no frontend. Uma falha de escopo de "Reabrir tentativas" para Corretor continua aberta na API.
Os mais graves: editar uma prova em rascunho falhava com 400; a correção manual vinha com a nota máxima; o logout
com o token vencido não revogava a sessão. Também entraram a escolha do professor responsável da turma e
confirmações em ações irreversíveis (AJ-105 a AJ-107).

**Pendências do ambiente (2026-10-26):** dependências sem vulnerabilidades, deploy exigindo o
workflow CI verde, autosave e envio mais leves, escopo do corretor corrigido (BUG-041) e
homologação atualizada. Defeitos da revisão corrigidos no mesmo dia: gabarito dedutível em
associação/ordenação, travas na correção e no recurso, timeout da anulação e arredondamento da nota
(BUG-042 a BUG-045, ADR-0057). Em 2026-10-27, os defeitos da mesma revisão nos módulos do Dev A
também foram corrigidos (BUG-046 a BUG-057, ADR-0058: fuso `America/Maceio`), e os PRs do
Dependabot foram aplicados, exceto o Node 26, que espera o LTS. No frontend, foram corrigidos o
foco dos diálogos, o pacote inicial e o erro do sino (BUG-058 a BUG-060), e implementados os
filtros do banco, "Salvar e avançar" e "Marcar para revisar" (AJ-115).

**Seção 6 (fora do MVP)** — continuam fora: sugestão por IA,
push, dashboard executivo, RabbitMQ/MinIO (mídias em volume local — ADR-0032),
dois frontends. "TLS com certificado
válido" **saiu da lista**: o mecanismo está pronto e só aguarda o DNS.

**Pendências para o go-live:** revisão humana do código; conferir o resultado do CI no GitHub (o
repositório já está publicado e recebe os commits da `main`); revisar os PRs do Dependabot;
executar o [roteiro de implantação](operacao/implantacao.md) até `infra/vps/verificar-producao.sh`
ficar sem ❌ (HTTPS, contas sem seed, backup externo, firewall/SSH, política de privacidade
revisada pelo DPO), seguido do primeiro teste da cópia externa e do teste de carga a partir de outra
máquina; anexo `01_RN_RF_Regras_e_Requisitos.txt` (69 RNs) ausente — revisar as
regras implementadas contra ele quando for incluído.

## 1. Premissas e Ajuste de Escopo

O plano de implementação original (`08_Plano_de_Implementacao.md`) foi desenhado para **18 sprints (~9 meses)** com uma equipe de 5-7 pessoas. Este plano comprime a entrega para **4 semanas com apenas 3 pessoas**, o que exige um corte real de escopo — não apenas uma "aceleração". As decisões de corte estão na Seção 6.

**Infraestrutura-alvo:** VPS já provisionada, **sem DNS configurado ainda**. Acesso durante todo o período será via **IP público + porta**, HTTP (ou HTTPS autoassinado). A configuração de domínio/certificado válido (Let's Encrypt) fica pronta para ativar assim que houver DNS, mas não é bloqueante para a entrega.

**Stack simplificada para caber em 4 semanas:**
- Backend único (NestJS), sem separar `api-gateway` de `api-core` ainda.
- PostgreSQL + Redis (cronômetro/sessão). **RabbitMQ e MinIO adiados** — nesta fase, processamento é síncrono e mídia (se houver) vai para volume local.
- Frontend único (React) com rotas protegidas por papel, em vez de dois SPAs separados.

**Toda a equipe usa agentes de IA de codificação (ex.: Claude Code, Cursor) para implementar e configurar.** Isso muda duas coisas em relação a uma equipe sem apoio de IA: (1) tarefas de boilerplate (CRUD, Dockerfiles, configuração de CI, telas de formulário) são bem mais rápidas, o que permite comprimir prazos e **reincorporar alguns itens que seriam cortados** (marcados com 🔁 nos arquivos individuais); (2) a velocidade de geração desloca o gargalo para a **revisão humana** do que foi gerado — por isso a metodologia da Seção 3 é tão importante quanto o backlog em si.

## 2. Equipe e Papéis

| Pessoa | Papel | Foco principal |
|---|---|---|
| **Dev A** | Backend | Módulos de cadastro/fundação: IAM, Usuários, Turmas, Banco de Questões, Composição de Provas |
| **Dev B** | Backend + DevOps | Módulos de execução/estado: Aplicação, Correção, Recursos, Auditoria — **e** toda a infraestrutura (VPS, Docker, CI/CD, monitoramento) |
| **Dev C** | Frontend | Único app React cobrindo as telas dos dois ambientes (Profissional e Aluno) |

**Ritual diário:** daily stand-up de 15 min (o que fiz, o que farei, impedimentos, **o que a IA gerou que ainda precisa de revisão**). **Sprint:** 1 semana cada (4 sprints). **Revisão e retrospectiva:** sexta-feira à tarde de cada semana.

## 3. Metodologia de Desenvolvimento com Agentes de IA

Regras válidas para os três integrantes, em todas as sprints:

1. **Contexto antes de gerar.** Antes de pedir código ao agente, aponte-o para o documento de requisitos (`00_Documento_Unificado_Requisitos.md`) e o RN/RF relevante (`01_RN_RF_Regras_e_Requisitos.txt`) da funcionalidade em questão — o agente não deve inventar regra de negócio por conta própria.
2. **Nunca mesclar código sem revisão humana.** Todo código gerado por IA passa por leitura de quem está responsável pelo módulo antes do commit — mesmo sob prazo apertado. Isso vale especialmente para lógica de negócio (cronômetro, correção, cálculo de nota) e para qualquer coisa que toque autenticação/autorização.
3. **Peça os testes junto com o código**, não depois — ao gerar um endpoint ou componente, o mesmo prompt deve pedir os testes automatizados correspondentes.
4. **Revisão de segurança obrigatória em código gerado por IA** que lida com senha, token, upload de arquivo ou query direta ao banco — agentes de IA frequentemente geram padrões inseguros (ex.: SQL via concatenação, segredos hardcoded) se não forem explicitamente instruídos a evitá-los.
5. **CI como rede de segurança.** Como o volume de código gerado por sprint aumenta, o pipeline (lint + build + testes) da Sprint 1 passa a ser o principal filtro automático antes da revisão humana — nenhuma tarefa é considerada concluída se quebrar o CI (ver Seção 8).

## 4. Visão por Sprint

| Sprint | Semana | Tema | Entrega ao final da sprint |
|---|---|---|---|
| **1** | Semana 1 | Fundação | Login com MFA funcional de ponta a ponta; ambiente acessível pelo IP do VPS |
| **2** | Semana 2 | Banco de Questões, Turmas e Composição de Provas | Professor cadastra questão, cria turma (manual ou via CSV), monta prova manualmente e publica |
| **3** | Semana 3 | Aplicação (Execução) e Correção | Aluno responde e envia prova; professor/corretor corrige; nota final é consolidada |
| **4** | Semana 4 | Relatórios, Recursos, Auditoria Mínima e Polimento | MVP completo no VPS, cobrindo Questão → Prova → Aplicação → Correção → Recurso → Relatório |

### Pontos de integração entre os três (handoffs)

| Sprint | Dependência |
|---|---|
| 1 | Dev A entrega login/JWT/MFA (Qua–Qui) → Dev C integra login + MFA (Sex). Dev B publica o esqueleto da API no VPS (Qui) → Dev C consome a API publicada (Sex) |
| 2 | Dev A (CRUD de Questões, Turmas, CSV) e Dev B (composição de prova, PIN/link) alimentam as telas do Dev C; o wizard de prova (Sex) depende dos dois |
| 3 | Dev B (cronômetro, Seg–Ter) e Dev A (instância, autosave, submissão) alimentam a tela de execução do Dev C (Ter–Qua); correção do Dev B → tela de correção do Dev C (Sex) |
| 4 | Dev A (relatórios, notificações) e Dev B (recursos) alimentam as telas finais do Dev C |

## 5. Definição de Pronto (por Sprint)

Uma tarefa só é considerada concluída quando:
- Está implementada e testada manualmente no ambiente do VPS (não apenas local).
- **Se gerada por agente de IA, foi lida e revisada por uma pessoa antes do commit** — geração sem revisão não conta como concluída.
- Não quebra o fluxo das sprints anteriores (regressão mínima verificada).
- Passa no pipeline de CI (lint + build + testes, a partir da Sprint 1).
- Foi demonstrada na revisão de sexta-feira.

## 6. O Que Fica Fora do MVP de 4 Semanas

A velocidade ganha com agentes de IA permitiu **reincorporar 3 itens** que estariam cortados em uma equipe sem esse apoio: MFA, importação CSV e notificações in-app básicas (marcados 🔁 nos arquivos individuais). Os itens abaixo continuam fora do MVP — não porque a codificação seja lenta, mas porque envolvem **decisão de arquitetura, design de produto ou tempo de teste que não encolhe com IA**:

| Item adiado | Motivo |
|---|---|
| Composição automática por pool/sorteio e Seções dentro da prova | Complexidade estrutural de modelagem, não de codificação — já estava adiada para fase posterior no plano original |
| Geração de múltiplas versões antifraude da prova | Não essencial para validar o ciclo principal |
| Sugestão de nota via IA na correção manual | Exige curadoria de prompt e validação cuidadosa (RN específica) incompatível com o prazo |
| Notificações por e-mail/push | Reincorporamos apenas a versão in-app; e-mail/push exigem integração com provedor externo |
| Detecção de anomalias comportamentais e dashboard executivo | Relatório básico cobre a necessidade mínima; heurística de anomalia exige dados reais para calibrar |
| RabbitMQ (mensageria assíncrona) e MinIO (object storage) | Processamento síncrono e disco local bastam para o volume do MVP; adicionar infra não acelera com IA |
| Dois frontends separados (Web Profissional / Web Aluno) | Decisão de produto/arquitetura, não gargalo de codificação |
| TLS com certificado válido | Depende de DNS, que ainda não existe; acesso via IP é aceitável para o MVP |

## 7. Riscos Específicos do Prazo Comprimido

| Risco | Mitigação |
|---|---|
| Dev B acumula backend crítico + toda a infraestrutura | Priorizar automação (CI/CD) logo na Sprint 1 para reduzir trabalho manual de deploy nas semanas seguintes |
| Cronômetro resiliente a desconexão (Sprint 3) é tecnicamente arriscado | Reservar a segunda metade da Sprint 3 para testes de rede instável antes de seguir para correção |
| Sem DNS, qualquer instabilidade de IP do VPS derruba o acesso | Confirmar com o provedor que o IP é fixo (não dinâmico) antes da Sprint 1 |
| Escopo de 4 semanas é apertado para 3 pessoas cobrindo 7+ módulos | Lista da Seção 6 deve ser tratada como compromisso firme de corte, não como meta aspiracional |
| Código gerado por IA pode introduzir vulnerabilidade (ex.: injeção, segredo hardcoded, dependência inexistente/"alucinada") | Checklist de segurança obrigatório (Seção 3, item 4) antes de merge; checklist final completo na Sexta da Sprint 4 |
| Velocidade de geração cria falso senso de progresso se a revisão humana não acompanhar o ritmo | Revisão humana é item explícito da Definição de Pronto (Seção 5) — tarefa gerada mas não revisada não conta como concluída |
| Inconsistência de estilo/padrão entre código gerado por pessoas diferentes usando agentes diferentes | Compartilhar o mesmo prompt-base (contexto do documento de requisitos) entre os três integrantes desde a Sprint 1 |
