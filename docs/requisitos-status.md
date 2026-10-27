# Situação dos requisitos

Rastreabilidade entre o [Documento de Requisitos](Documento_Requisitos_Sistema_de_Provas.docx)
(Seções 3, 4 e 6) e a implementação. Atualizado em **2026-10-27** (auditoria do frontend em 2026-10-24 — BUG-028 a BUG-040; revisão de código em 2026-10-26/27 — BUG-041 a BUG-060, ADRs 0057 e 0058; itens do Figma — AJ-115).

**Legenda:** ✅ implementado e testado · ⚠️ parcial (ver observação) · ❌ não implementado ·
🚫 fora do MVP por decisão do plano (Seção 6 do plano de sprints)

## Resumo

| Requisito | Prioridade | Situação | Features |
|---|---|---|---|
| RF01 Autenticação e Segurança | Essencial | ✅ (2º fator por app, com códigos de recuperação) | [001](features/001-autenticacao-e-sessao.md), [002](features/002-mfa-totp.md), [003](features/003-controle-de-acesso.md), [023](features/023-mfa-opcional-e-sessoes.md), [029](features/029-email-e-recuperacao-de-conta.md) |
| RF02 Usuários e Hierarquia | Essencial | ✅ (convite por e-mail com SMTP configurado) | [004](features/004-gestao-de-usuarios.md), [022](features/022-delegacao-e-co-professores.md) |
| RF03 Turmas | Essencial | ✅ | [009](features/009-turmas-e-importacao-csv.md), [022](features/022-delegacao-e-co-professores.md) |
| RF04 Banco de Questões | Essencial | ✅ | [008](features/008-banco-de-questoes.md), [021](features/021-formatos-midia-e-alto-risco.md) |
| RF05 Composição de Provas | Essencial | ✅ (manual, seções e sorteio) | [010](features/010-composicao-de-provas.md), [024](features/024-politicas-impressao-e-comportamento.md), [032](features/032-secoes-e-sorteio.md) |
| RF06 Aplicação de Provas | Essencial | ✅ | [011](features/011-aplicacao-e-execucao.md), [024](features/024-politicas-impressao-e-comportamento.md) |
| RF07 Correção | Essencial | ✅ (sugestão por IA 🚫) | [012](features/012-correcao.md), [021](features/021-formatos-midia-e-alto-risco.md) |
| RF08 Recursos e Contestações | Importante | ✅ | [013](features/013-recursos.md), [024](features/024-politicas-impressao-e-comportamento.md) |
| RF09 Relatórios e Métricas | Importante | ✅ (indícios simples; dashboard executivo 🚫) | [014](features/014-relatorios.md), [025](features/025-relatorios-avancados-e-auditoria.md) |
| RF10 Notificações | Desejável | ✅ in-app em tempo real e e-mail opcional (push 🚫) | [015](features/015-notificacoes-e-auditoria.md) |
| RF11 Auditoria | Essencial | ✅ | [015](features/015-notificacoes-e-auditoria.md), [025](features/025-relatorios-avancados-e-auditoria.md) |
| RNF01 Interoperabilidade | Essencial | ✅ (SPA único por decisão do plano; API de integração LMS/ERP) | [007](features/007-frontend-base-e-design-system.md) |
| RNF02 Banco de Dados | Essencial | ✅ | [005](features/005-modelo-de-dados-e-seed.md) |
| RNF03 Contingência | Essencial | ✅ | [011](features/011-aplicacao-e-execucao.md), [016](features/016-operacao-backup-e-carga.md), [018](features/018-backup-externo.md), [026](features/026-monitoramento-e-manutencao.md), [038](features/038-metricas-logs-e-teste-de-restauracao.md) |
| RNF04 Apresentação | Importante | ✅ | [007](features/007-frontend-base-e-design-system.md), [037](features/037-visual-figma.md), [039](features/039-tema-escuro.md), [041](features/041-homepage.md) |
| RNF05 Segurança | Essencial | ⚠️ sem criptografia de disco (depende do VPS) | [017](features/017-https.md), [019](features/019-lgpd.md), [023](features/023-mfa-opcional-e-sessoes.md), [checklist](seguranca/checklist-final.md) |

## Detalhamento

### RF01 — Autenticar-se no Sistema
- ✅ Login segmentado por ambiente (profissional por e-mail; aluno por e-mail ou matrícula); senha correta no portal errado não autentica.
- ✅ Token de sessão com ambiente e papel; redirecionamento ao painel do papel.
- ✅ MFA obrigatório para Administrador e Coordenador (app autenticador TOTP, cadastro guiado no 1º acesso).
- ✅ MFA **opcional** para os demais (inclusive aluno) em *Minha conta*; prova pode **exigir** MFA do aluno (lote 6).
- ❌ Segundo fator por e-mail ou SMS (decisão: só app autenticador + códigos de recuperação — lote 7).
- ✅ Credenciais inválidas: contador, bloqueio temporário ao exceder o limite e **notificação ao titular**.
- ✅ Código MFA inválido: erro e nova tentativa (conta para o bloqueio).
- ✅ "Esqueci minha senha" por e-mail (com SMTP), link de uso único — lote 7.
- ✅ Gestão de sessão: refresh rotacionado, logout, revogação em até 30 s (desativação, troca de papel, LGPD); lista e encerramento de sessões pelo próprio usuário; limpeza automática de sessões antigas (lote 6).

### RF02 — Cadastrar Usuário Profissional e Atribuir Papel
- ✅ Administrador cadastra (nome, e-mail, papel); e-mail duplicado bloqueado.
- ✅ "Sistema envia credenciais": com SMTP, convite por e-mail para definir a senha (lote 7); sem SMTP, senha temporária exibida ao administrador.
- ✅ Primeiro login com troca de senha obrigatória.
- ✅ Editar, mudar papel, desativar/reativar, redefinir senha, desbloquear, resetar MFA (Sprint 5).
- ✅ Delegação de permissão específica sem alterar o papel: reabrir tentativas, desbloquear contas, consultar auditoria (catálogo inicial; ampliar com as RNs), com validade opcional — lotes 6 e 7.

### RF03 — Criar Turma e Matricular Alunos
- ✅ Turma com período de vigência e professor responsável (a coordenação escolhe o responsável na tela desde 2026-10-24 — AJ-105).
- ✅ Mais de um professor por turma: titular + co-professores (lote 6).
- ✅ Matrícula individual e **importação CSV** com relatório de falhas por linha (linhas válidas processadas).
- ✅ Remoção desfaz só o vínculo ativo; histórico preservado. ✅ Transferência entre turmas (lote 7).
- ✅ Turma como critério de elegibilidade; prova não exige turma (aplicação pública).

### RF04 — Cadastrar e Publicar Questão
- ✅ Disciplina, tópico, dificuldade, natureza; fechada com alternativas e gabarito; aberta com rubrica.
- ✅ Formatos: múltipla escolha, **várias corretas** (parcial), **verdadeiro/falso**, **resposta curta**, **numérica** com tolerância, **associação** e **ordenação** (correção automática) e dissertativa — lotes 6 a 8.
- ✅ Verificação de similaridade com alerta antes de enviar para revisão.
- ✅ Rascunho → Em revisão → Publicada (validador ≠ autor) / devolução com comentário; arquivamento.
- ✅ Edição de publicada gera nova versão preservando a anterior.
- ✅ Aprovação formal para edição de questão de "alto risco/certificação" (versão pendente aprovada por outra pessoa — lote 6).
- ✅ Imagem e áudio vinculados à versão (lote 6) e **fórmulas LaTeX** (lote 7).

### RF05 — Montar e Publicar Prova
- ✅ Parâmetros: tempo, tentativas, visibilidade, critério de aprovação, navegação, ordem.
- ✅ Composição manual com cálculo de peso; publicação **bloqueada** se a soma ≠ 100% (opção "normalizar" não adotada).
- ✅ Composição por **seções** e **sorteio** de N questões por participante (versões antifraude) — lote 8.
- ✅ Critério de aprovação: nota mínima, nenhum, **nota mínima por seção** e combinação (geral + seções) — lote 8.
- ✅ Prova pública tratada como **não certificada**. ✅ Verificação extra configurável: *exigir MFA do aluno* (lote 6).
- ✅ Exportar prova em PDF com/sem gabarito (impressão do navegador) e duplicar prova (lote 6); aviso de versão mais nova das questões (lote 7).

### RF06 — Responder Prova
- ✅ Acesso por login (privada) ou PIN/link com identificação mínima (pública); aplicação a turma ou a **alunos escolhidos** (lote 7).
- ✅ Validação de elegibilidade e janela; acesso negado fora delas.
- ✅ Instância congelada por participante (ordem de questões e alternativas, gabarito).
- ✅ Cronômetro no servidor, sem pausa em desconexão; envio automático ao expirar.
- ✅ Autosave com reenvio automático após queda de conexão; navegação livre ou sequencial.
- ✅ Envio idempotente (duplo clique/reenvio) e comprovante com início e término.
- ✅ Sessão única por tentativa (troca de dispositivo registrada).
- ✅ Reabertura apenas administrativa, com justificativa (RN-40).
- ✅ "Registro de eventos relevantes": início, envio, expiração, troca de sessão e reabertura auditados; saídas/voltas da aba registradas e visíveis ao professor (lote 6).

### RF07 — Corrigir Tentativa e Consolidar Nota
- ✅ Correção automática das fechadas (inclusive associação e ordenação — lote 8); fila de correção manual das abertas com nota e feedback; rubrica com critérios pontuados, correção às cegas e corretores designados (lote 8).
- ✅ Nota provisória "pendente de correção manual"; consolidação só com todas as abertas corrigidas (bloqueio de consolidação 100% automática em prova mista).
- ✅ Critério de aprovação aplicado e resultado publicado (aluno notificado).
- ✅ Política de exibição do gabarito ao aluno: nunca / após a correção / após o encerramento (lote 6).
- ✅ Questão anulada após publicação → reprocessamento de todos os afetados.
- 🚫 Sugestão de nota por IA.

### RF08 — Contestar Questão
- ✅ Recurso por questão com justificativa; status Aberto → Em análise → Deferido/Indeferido.
- ✅ Indeferido mantém a nota e notifica com a justificativa.
- ✅ Prazo para recurso configurável por prova (lote 6).
- ⚠️ Políticas de anulação: pontuar a todos e remover do total ("recalcular proporcional" equivale a remover do total na fórmula adotada — ADR-0018). Também há ajuste individual.
- ✅ Anulação reprocessa e notifica todos os afetados.
- ✅ Encaminhamento à coordenação (decisão pela gestão) — lote 8.

### RF09 — Consultar Relatório de Desempenho
- ✅ Por prova/aplicação e por turma (aluno × prova); taxa de acerto por questão, tempo médio, média, mediana, distribuição, aprovação.
- ✅ Por aluno: página dedicada (média, evolução, provas, disciplinas) — lote 6.
- ✅ Por disciplina e filtro por período em todas as visões (lote 6).
- ✅ Exportação CSV e **Excel (.xlsx)**; impressão/PDF pelo navegador (lote 7).
- ✅ Indícios simples para revisão humana (tempo, saídas da aba, trocas, erros idênticos) — lote 7. 🚫 Modelos estatísticos/dashboard.

### RF10 — Notificações
- ✅ In-app: prova disponível, resultado publicado, recurso aberto/decidido, nota reprocessada, conta bloqueada, solicitação LGPD.
- ✅ E-mail opcional (cópia das notificações, com preferência do usuário e fila com retentativa) — lotes 7 e 8. ✅ Sino em tempo real (SSE) — lote 8. 🚫 Push.

### RF11 — Auditoria
- ✅ Registro imutável (trigger no banco bloqueia alteração e exclusão) das ações sensíveis sobre questões, provas, tentativas, recursos, contas, delegações e LGPD; consulta pelo Administrador (ou delegada) com nome do usuário, filtro por período e exportação CSV (lote 6).

### RNF01 — Interoperabilidade
- ✅ Navegador web responsivo (desktop e celular); API REST comum.
- ⚠️ Um SPA com ambientes isolados (rotas, layouts e tokens), em vez de dois frontends — decisão do plano (ADR-0009).
- ✅ API de integração com LMS/ERP (chaves por escopo; turmas por código externo; exportação de notas) — lote 8.

### RNF02 — Banco de Dados
- ✅ PostgreSQL com um schema por módulo e sem chaves estrangeiras entre schemas (ADR-0005).

### RNF03 — Contingência
- ✅ Respostas preservadas em queda de conexão; cronômetro no servidor; envio idempotente; reabertura administrativa com justificativa.
- ✅ Backup automatizado (banco + mídias), criptografado, com cópia externa, alerta e restauração testada.
- ✅ Monitor com alerta por webhook (API, Nginx, certificado, backup, disco) — lote 6.
- ✅ Métricas de 5xx e latência (p95) com alerta; logs centralizados opcionais com encaminhamento para fora do VPS; teste mensal da restauração a partir da cópia externa, cobrado pelo monitor — lote 9 (ADR-0054, feature 038). ⚠️ Ativação no VPS real pendente.

### RNF04 — Apresentação
- ✅ Design system compartilhado: DataTable, StatusBadge, Timer, Stepper, AlertBanner (e Button, TextField, Dialog, Tabs…).
- ✅ Identidade visual do Figma aplicada nos dois ambientes (2026-10-18, ADR-0053, feature 037). ⚠️ Elementos do Figma sem suporte na API ficaram de fora (lista na feature 037).
- ✅ Tema claro/escuro em Configurações > Aparência, com padrão que segue o sistema (2026-10-27, ADR-0059, feature 039).
- ✅ Homepage pública em `/` para visitantes, com acesso ao login profissional, à área do aluno e à prova por PIN (2026-10-27, feature 041).

### RNF05 — Segurança
- ✅ Isolamento estrito entre ambiente profissional e do aluno.
- ✅ MFA obrigatório para perfis administrativos. ✅ MFA escalonável por criticidade: opcional para todos e exigível por prova (lote 6).
- ✅ Criptografia em trânsito: HTTPS pronto (autoassinado / Let's Encrypt — ativar em produção; homologação pública com Let's Encrypt via sslip.io desde 2026-10-20 — ADR-0056). HSTS `preload` opcional, desligado por padrão (ADR-0055).
- ⚠️ Criptografia em repouso: segredos MFA (AES-256-GCM), senhas (Argon2id) e backups (age) cifrados; volume do banco não cifrado (depende do disco do VPS).
- ✅ Menor privilégio por papel e por dono do recurso.
- ✅ LGPD: exportação dos dados, solicitação de exclusão e anonimização; registro de ciência da política (lote 7); pedido de correção e retenção configurável de externos (lote 8); Termos de Uso e Política de Privacidade com base na legislação vigente e **aceite obrigatório** no primeiro acesso (2026-10-27, ADR-0060, feature 040). ⚠️ Textos a revisar pelo DPO/jurídico.

## Itens fora do documento de requisitos, implementados para o uso real

Teste de carga (turma inteira simultânea), testes de navegador no CI, verificador de prontidão
para produção, criação do primeiro administrador sem seed — ver features 016–020. Monitoramento,
Dependabot/`npm audit` semanal e a bateria única de testes (`testes/testar-tudo.sh`) — features 026–027.
Uptime externo e deploy manual pelo GitHub Actions, rotação da chave do MFA — features 029 e 031.
Seções/sorteio, correção avançada, tempo real, API de integração e LGPD (correção/retenção) — features 032–036.
Métricas de 5xx/latência, logs centralizados e teste periódico da cópia externa — feature 038.
