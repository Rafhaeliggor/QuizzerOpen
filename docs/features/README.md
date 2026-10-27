# Features

Um documento por funcionalidade desenvolvida: como funciona, casos de uso, endpoints/telas,
regras, testes e **pendências**. Modelo: [000-modelo.md](000-modelo.md). Decisões técnicas
ficam nos [ADRs](../adr/README.md); defeitos corrigidos em
[bugs-corrigidos.md](../bugs-corrigidos.md) e itens criados/removidos no caminho em
[ajustes-de-percurso.md](../ajustes-de-percurso.md).

Status: `Planejada` · `Em desenvolvimento` · `Concluída (MVP)` · `Concluída com pendências`

| # | Feature | Requisitos | Sprint | Status |
|---|---|---|---|---|
| [001](001-autenticacao-e-sessao.md) | Autenticação e sessão | RF01 | 1 | Concluída com pendências |
| [002](002-mfa-totp.md) | Verificação em duas etapas (TOTP) | RF01, RNF05 | 1 | Concluída com pendências |
| [003](003-controle-de-acesso.md) | Controle de acesso por papel e ambiente | RF01, RF02, RNF05 | 1 | Concluída (MVP) |
| [004](004-gestao-de-usuarios.md) | Gestão de usuários (cadastro e listagem) | RF02 | 1 | Concluída com pendências |
| [005](005-modelo-de-dados-e-seed.md) | Modelo de dados inicial e seed | RNF02 | 1 | Concluída (MVP) |
| [006](006-infraestrutura-e-deploy.md) | Infraestrutura, deploy, CI e observabilidade básica | RNF03, RNF05 | 1 | Concluída com pendências |
| [007](007-frontend-base-e-design-system.md) | Frontend base: rotas, layouts e design system | RNF01, RNF04 | 1 | Concluída com pendências |
| [008](008-banco-de-questoes.md) | Banco de questões (versionamento, dupla checagem, duplicidade) | RF04 | 2 | Concluída com pendências |
| [009](009-turmas-e-importacao-csv.md) | Turmas, matrículas e importação CSV | RF03 | 2 | Concluída com pendências |
| [010](010-composicao-de-provas.md) | Composição e publicação de provas | RF05 | 2 | Concluída com pendências |
| [011](011-aplicacao-e-execucao.md) | Aplicação e execução (cronômetro, autosave, PIN, comprovante) | RF06, RNF03 | 3 | Concluída com pendências |
| [012](012-correcao.md) | Correção e consolidação de nota | RF07 | 3 | Concluída com pendências |
| [013](013-recursos.md) | Recursos e contestações | RF08 | 4 | Concluída com pendências |
| [014](014-relatorios.md) | Relatórios e exportação CSV | RF09 | 4 | Concluída com pendências |
| [015](015-notificacoes-e-auditoria.md) | Notificações in-app e auditoria | RF10, RF11 | 4 | Concluída com pendências |
| [016](016-operacao-backup-e-carga.md) | Operação: backup, restauração e teste de carga | RNF03, RNF05 | 5 | Concluída com pendências |
| [017](017-https.md) | HTTPS (autoassinado / Let's Encrypt) e Nginx sem root | RNF05 | 6 | Concluída com pendências |
| [018](018-backup-externo.md) | Backup criptografado, cópia externa e alerta | RNF03, RNF05 | 6 | Concluída com pendências |
| [019](019-lgpd.md) | LGPD: meus dados, exclusão e anonimização | RNF05 | 6 | Concluída com pendências |
| [020](020-implantacao-producao.md) | Implantação em produção (admin sem seed, verificador, revogação imediata) | RNF05 | 6 | Concluída com pendências |
| [021](021-formatos-midia-e-alto-risco.md) | Formatos V/F e resposta curta, mídias e alto risco | RF04, RF07 | 7 | Concluída com pendências |
| [022](022-delegacao-e-co-professores.md) | Delegação de permissões e co-professores de turma | RF02, RF03 | 7 | Concluída com pendências |
| [023](023-mfa-opcional-e-sessoes.md) | MFA opcional, MFA exigido por prova e sessões abertas | RF01, RF05, RNF05 | 7 | Concluída (MVP) |
| [024](024-politicas-impressao-e-comportamento.md) | Gabarito, prazo de recurso, impressão/PDF, duplicação e eventos de comportamento | RF05–RF08 | 7 | Concluída com pendências |
| [025](025-relatorios-avancados-e-auditoria.md) | Relatórios por aluno/disciplina/período; auditoria com CSV | RF09, RF11 | 7 | Concluída com pendências |
| [026](026-monitoramento-e-manutencao.md) | Monitoramento, Dependabot e limpeza de sessões | RNF03, RNF05 | 7 | Concluída com pendências |
| [027](027-bateria-de-testes.md) | Bateria de testes consolidada (`testar-tudo.sh`) | — | 7 | Concluída (MVP) |
| [028](028-formulas-e-formatos-avancados.md) | Fórmulas, várias corretas, numérica, versões nas provas, limpeza de mídias | RF04, RF06, RF07 | 8 | Concluída (MVP) |
| [029](029-email-e-recuperacao-de-conta.md) | E-mail opcional, esqueci a senha, convites, códigos de recuperação, política | RF01, RF02, RF10, RNF05 | 8 | Concluída (MVP) |
| [030](030-aplicacao-avancada-e-turmas.md) | Alunos escolhidos, transferência, delegação com validade, limite por sessão | RF02, RF03, RF06 | 8 | Concluída (MVP) |
| [031](031-relatorios-excel-e-indicios.md) | Excel, impressão de relatórios, indícios, uptime e deploy | RF09, RF11, RNF03 | 8 | Concluída (MVP) |
| [032](032-secoes-e-sorteio.md) | Seções, sorteio de questões e nota mínima por seção | RF05–RF07 | 9 | Concluída (MVP) |
| [033](033-correcao-avancada-e-formatos-estruturados.md) | Corretores designados, às cegas, rubrica pontuada, recurso encaminhado; associação e ordenação | RF04, RF07, RF08 | 9 | Concluída (MVP) |
| [034](034-notificacoes-tempo-real-e-fila.md) | Notificações em tempo real (SSE) e fila de e-mail | RF10, RNF03 | 9 | Concluída (MVP) |
| [035](035-api-de-integracao.md) | API de integração com sistemas acadêmicos | RNF01 | 9 | Concluída (MVP) |
| [036](036-lgpd-correcao-e-retencao.md) | LGPD: correção de dados e retenção de externos | RNF05 | 9 | Concluída (MVP) |
| [037](037-visual-figma.md) | Visual do Figma nos dois ambientes (tokens, layouts, todas as páginas) | RNF04 | 10 | Concluída com pendências |
| [038](038-metricas-logs-e-teste-de-restauracao.md) | Métricas de 5xx/latência, logs centralizados, teste periódico de restauração, HSTS preload | RNF03, RNF05 | 10 | Concluída (MVP) |
| [039](039-tema-escuro.md) | Tema claro/escuro nas configurações (padrão: segue o sistema) | RNF04 | além do plano | Concluída |
| [040](040-termos-e-aceite.md) | Termos de Uso, Política de Privacidade e página de aceite obrigatória | RNF05 | além do plano | Concluída (revisão jurídica pendente) |
| [041](041-homepage.md) | Homepage pública em `/` (visitante) com acesso a professor, aluno e PIN | RNF04 | além do plano | Concluída |

Revisão de segurança: [checklist final](../seguranca/checklist-final.md) · Situação dos requisitos: [requisitos-status.md](../requisitos-status.md) ·
Roteiro de implantação: [operacao/implantacao.md](../operacao/implantacao.md) · Guias de uso: [guias/](../guias/README.md).

## Pendências transversais

- Os anexos citados no Documento de Requisitos e no plano **não estão no repositório**:
  `00_Documento_Unificado_Requisitos.md`, `01_RN_RF_Regras_e_Requisitos.txt` (69 RNs e 63 RFs),
  `03_Arquitetura_Modular.md`, `04_Docker.md`, `05_Componentes_e_Telas.md`, `06_Endpoints_API.md`,
  `08_Plano_de_Implementacao.md`. A Sprint 1 foi implementada a partir do
  `Documento_Requisitos_Sistema_de_Provas.docx` (RFs macro, Seção 6 e diagramas) e do plano de
  sprints. **Antes da Sprint 2, adicionar esses anexos em `docs/` e revisar as features contra as RNs numeradas.**
