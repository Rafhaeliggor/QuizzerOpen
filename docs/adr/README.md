# Registro de Decisões Arquiteturais (ADR)

Cada decisão de fato tomada no projeto vira um arquivo `NNNN-titulo.md` nesta pasta.
ADRs são **imutáveis depois de aceitos**: para mudar uma decisão, crie um novo ADR
que a substitui e marque o antigo como `Substituído por ADR-XXXX`.

Use o [modelo](0000-modelo.md). Status possíveis: `Proposto`, `Aceito`, `Substituído`, `Descartado`.

| ADR | Título | Status |
|---|---|---|
| [0001](0001-registro-de-decisoes-e-features.md) | Registro de decisões (ADR) e documentação de features | Aceito |
| [0002](0002-monorepo-npm-workspaces.md) | Monorepo com npm workspaces | Aceito |
| [0003](0003-backend-nestjs-monolito-modular.md) | Backend NestJS 12 como monólito modular | Aceito |
| [0004](0004-orm-prisma.md) | Prisma 7 como ORM e ferramenta de migrations | Aceito |
| [0005](0005-banco-schemas-por-modulo.md) | PostgreSQL com um schema por módulo e sem FK entre schemas | Aceito |
| [0006](0006-autenticacao-jwt-sessao.md) | Autenticação: login por ambiente, JWT curto + refresh rotacionado | Aceito |
| [0007](0007-mfa-totp.md) | MFA por TOTP obrigatório para Administrador e Coordenador | Aceito |
| [0008](0008-infraestrutura-docker-vps.md) | Infraestrutura: Docker Compose no VPS, Nginx único, acesso HTTP por IP | Aceito |
| [0009](0009-frontend-spa-unico.md) | Frontend: SPA React único com rotas por ambiente e design system próprio | Aceito |
| [0010](0010-configuracao-e-segredos.md) | Configuração validada no boot e gestão de segredos | Aceito |
| [0011](0011-rate-limit-por-ip-e-identificador.md) | Rate limit por IP + identificador (turmas atrás de NAT) | Aceito |
| [0012](0012-qualidade-testes-e-ci.md) | Qualidade: Vitest, oxlint, CI no GitHub Actions e scripts de instalação | Aceito |
| [0013](0013-convencoes-de-nomenclatura-e-api.md) | Convenções de nomenclatura, idioma e formato da API | Aceito |
| [0014](0014-logging-estruturado.md) | Logging estruturado em JSON (pino) | Aceito |
| [0015](0015-registro-de-bugs-e-ajustes.md) | Registro de bugs corrigidos e ajustes de percurso | Aceito |
| [0016](0016-simplificacoes-de-dominio-no-mvp.md) | Simplificações de domínio no MVP (questões, pesos, PIN, nota 0–10) | Aceito |
| [0017](0017-cronometro-no-servidor.md) | Cronômetro com prazo persistido no PostgreSQL (e não no Redis) | Aceito |
| [0018](0018-correcao-snapshot-e-consolidacao.md) | Correção com snapshot, consolidação e anulação | Aceito |
| [0019](0019-fronteiras-entre-modulos.md) | Comunicação entre módulos por serviços exportados | Aceito |
| [0020](0020-participante-externo.md) | Participante externo de prova pública | Aceito |
| [0021](0021-escopo-de-acesso-por-papel.md) | Escopo de acesso por papel nos módulos de avaliação | Aceito |
| [0022](0022-notificacoes-e-auditoria.md) | Notificações in-app e auditoria imutável | Aceito |
| [0023](0023-parametros-argon2-owasp.md) | Parâmetros Argon2id da OWASP com re-hash transparente | Aceito |
| [0024](0024-sessao-unica-por-tentativa.md) | Sessão única por tentativa (assumir em vez de bloquear) | Aceito |
| [0025](0025-backup-automatizado.md) | Backup automatizado do PostgreSQL | Aceito |
| [0026](0026-testes-de-navegador-carga-e-supply-chain.md) | Testes de navegador e de carga no CI; endurecimento de dependências | Aceito |
| [0027](0027-revogacao-imediata-de-sessao.md) | Revogação de acesso em até 30 segundos | Aceito |
| [0028](0028-lgpd-anonimizacao.md) | LGPD — exportação e anonimização preservando o registro acadêmico | Aceito |
| [0029](0029-https-e-nginx-sem-root.md) | HTTPS em três modos e Nginx sem root | Aceito |
| [0030](0030-backup-externo-criptografado.md) | Backup criptografado, cópia externa e alerta de falha | Aceito |
| [0031](0031-implantacao-em-producao.md) | Implantação em produção sem seed e com verificação automatizada | Aceito |
| [0032](0032-midias-em-volume-local.md) | Mídias das questões em volume local com URL de capacidade | Aceito |
| [0033](0033-delegacao-de-permissoes.md) | Delegação de permissões específicas sem mudar o papel | Aceito |
| [0034](0034-mfa-opcional-e-sessoes.md) | MFA opcional, MFA exigido por prova e autoatendimento de sessões | Aceito |
| [0035](0035-politicas-da-prova.md) | Políticas da prova: gabarito, prazo de recurso e eventos de comportamento | Aceito |
| [0036](0036-monitoramento-e-manutencao.md) | Monitoramento por webhook e manutenção contínua de dependências | Aceito |
| [0037](0037-impressao-e-duplicacao-de-prova.md) | Impressão/PDF da prova pelo navegador e duplicação | Aceito |
| [0038](0038-formatos-de-questao-e-alto-risco.md) | Formatos de questão e aprovação de alterações de alto risco | Aceito |
| [0039](0039-co-professores-de-turma.md) | Co-professores de turma | Aceito |
| [0040](0040-bateria-de-testes-consolidada.md) | Bateria de testes consolidada em um único comando | Aceito |
| [0041](0041-email-opcional-e-recuperacao-de-senha.md) | E-mail opcional, recuperação de senha e convite de primeiro acesso | Aceito |
| [0042](0042-codigos-de-recuperacao-e-rotacao-da-chave-mfa.md) | Códigos de recuperação do MFA e rotação da chave de cifra | Aceito |
| [0043](0043-ciencia-da-politica-de-privacidade.md) | Registro de ciência da política de privacidade | Substituído em parte (0060) |
| [0044](0044-exportacao-excel-e-impressao-de-relatorios.md) | Exportação Excel (.xlsx) própria e impressão de relatórios | Aceito |
| [0045](0045-indicios-para-revisao.md) | Indícios para revisão humana nos relatórios | Aceito |
| [0046](0046-uptime-externo-e-deploy-manual.md) | Uptime externo e deploy manual pelo GitHub Actions | Aceito |
| [0047](0047-formulas-e-novos-formatos.md) | Fórmulas (LaTeX → MathML), várias corretas e resposta numérica | Aceito |
| [0048](0048-secoes-e-sorteio.md) | Composição por seções, sorteio de questões e nota mínima por seção | Aceito |
| [0049](0049-correcao-designada-as-cegas-e-rubrica.md) | Corretores designados, correção às cegas e rubrica com critérios | Aceito |
| [0050](0050-tempo-real-e-fila-de-email.md) | Notificações em tempo real (SSE) e fila de e-mail com retentativa | Aceito |
| [0051](0051-api-de-integracao.md) | API de integração com sistemas acadêmicos (chaves por escopo) | Aceito |
| [0052](0052-lgpd-correcao-e-retencao.md) | LGPD — pedido de correção de dados e retenção de externos | Aceito |
| [0053](0053-identidade-visual-figma.md) | Identidade visual do Figma no frontend (tokens, Inter local, layouts) | Aceito |
| [0054](0054-metricas-logs-centralizados-e-teste-de-restauracao.md) | Métricas de 5xx/latência, logs centralizados (Vector) e teste periódico de restauração | Aceito |
| [0055](0055-hsts-preload.md) | HSTS preload — opcional e desligado por padrão | Aceito |
| [0056](0056-dominio-sslip-sem-dominio-proprio.md) | Certificado válido sem domínio próprio (sslip.io + Let's Encrypt) | Aceito |
| [0057](0057-ids-opacos-e-arredondamento-da-nota.md) | IDs opacos por instância em associação/ordenação e arredondamento decimal da nota | Aceito |
| [0058](0058-fuso-horario-da-instituicao.md) | Fuso horário da instituição para datas sem hora e mensagens | Aceito |
| [0059](0059-tema-escuro.md) | Tema escuro com escolha por navegador (padrão: segue o sistema) | Aceito |
| [0060](0060-termos-de-uso-e-aceite-obrigatorio.md) | Termos de Uso, Política de Privacidade (fonte única + cópia em docs/legal) e aceite obrigatório | Aceito |
