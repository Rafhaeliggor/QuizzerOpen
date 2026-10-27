# Bugs corrigidos

Registro de defeitos encontrados **e corrigidos** durante o desenvolvimento. Bugs ainda
abertos ficam na seção "Pendências" da feature correspondente em [`features/`](features/README.md).

Cada entrada tem um código `BUG-NNN` (não reutilizar) e é adicionada no topo da tabela-resumo.
Ao corrigir um bug, sempre que possível adicione um **teste de regressão** e cite-o aqui.

**Severidade:** `Crítica` (quebra fluxo principal ou segurança) · `Alta` · `Média` · `Baixa` (cosmético/teste)

| Código | Data | Severidade | Resumo | Feature |
|---|---|---|---|---|
| [BUG-060](#bug-060) | 2026-10-27 | Média | Pacote único de 900 KB: aluno baixava o ambiente profissional inteiro e o KaTeX mesmo sem fórmulas | 007 |
| [BUG-059](#bug-059) | 2026-10-27 | Baixa | Sino de notificações: falha ao marcar como lida sumia em silêncio | 015 |
| [BUG-058](#bug-058) | 2026-10-27 | Alta | Campo dentro de diálogo perdia o foco a cada tecla (motivo da exclusão, resposta LGPD, código MFA, senha); Tab escapava do diálogo | 007 |
| [BUG-057](#bug-057) | 2026-10-27 | Média | Período de relatórios e auditoria interpretado em UTC (3 h de deslocamento) e fusos diferentes nas mensagens | 014, 025 |
| [BUG-056](#bug-056) | 2026-10-27 | Média | Anulação de uma prova excluía a mesma questão de outra prova no relatório por disciplina; anulações lidas uma consulta por prova | 014, 025 |
| [BUG-055](#bug-055) | 2026-10-27 | Alta | Relatórios agrupavam tentativas pelo e-mail: anonimizados fundidos numa linha, aluno com e-mail trocado contado duas vezes | 014 |
| [BUG-053](#bug-053) | 2026-10-27 | Baixa | Mensagens de validação padrão do class-validator chegavam ao usuário em inglês | 007 |
| [BUG-052](#bug-052) | 2026-10-27 | Baixa | Campo `pagina` sem máximo nas listagens de usuários, questões e auditoria | 004, 008, 025 |
| [BUG-051](#bug-051) | 2026-10-27 | Baixa | Matrícula de alunos revelava o e-mail de quem já tinha a matrícula e o papel de quem já tinha o e-mail | 009 |
| [BUG-050](#bug-050) | 2026-10-27 | Média | Fila de e-mail podia enviar a mesma mensagem duas vezes (rodadas sobrepostas, item sem reserva) | 034 |
| [BUG-049](#bug-049) | 2026-10-27 | Média | Importação de CSV processava linha a linha (hash + convite em série) e estourava o tempo com arquivos grandes | 009 |
| [BUG-048](#bug-048) | 2026-10-27 | Baixa | Login respondia 423 "bloqueada" só para contas existentes (enumeração de contas) | 001 |
| [BUG-047](#bug-047) | 2026-10-27 | Alta | Duas renovações de sessão simultâneas derrubavam a sessão (inclusive do aluno em prova) | 001 |
| [BUG-046](#bug-046) | 2026-10-27 | Baixa | Correção às cegas devolvia `usuarioId` e `tentativaId` do aluno | 033 |
| [BUG-045](#bug-045) | 2026-10-26 | Baixa | Nota arredondada em ponto flutuante: 5,025 virava 5,02 | 012 |
| [BUG-044](#bug-044) | 2026-10-26 | Média | Anulação de questão recalculava nota a nota numa transação de 5 s e podia ser desfeita em provas grandes | 013 |
| [BUG-043](#bug-043) | 2026-10-26 | Média | Correções e decisões simultâneas sem trava: nota que nunca consolidava, avaliação de dupla sobrescrita, recurso decidido duas vezes | 012, 013, 033 |
| [BUG-042](#bug-042) | 2026-10-26 | Alta | Gabarito dedutível pelos IDs das alternativas em associação e ordenação | 011, 033 |
| [BUG-041](#bug-041) | 2026-10-26 | Média | Corretor com permissão delegada `REABRIR_TENTATIVAS` reabria tentativa de qualquer prova (escopo de "gestão" para o papel Corretor) | 003, 022 |
| [BUG-040](#bug-040) | 2026-10-24 | Média | Revisão das correções: PUT da prova zerava `sugestaoIa`/`tempoPorQuestaoSeg`; equipe da turma e corretores designados não salvavam com alguém inativo; turma com responsável inativo não salvava; inteiros em diálogos geravam 400 em inglês | 010, 009, 033, 013, 022 |
| [BUG-039](#bug-039) | 2026-10-24 | Baixa | e2e do ciclo completo esperava soma 100% sem distribuir os pesos (desatualizado desde o lote 8) | 007 |
| [BUG-038](#bug-038) | 2026-10-24 | Baixa | Ajustes menores do frontend: MFA recarregado voltava sempre ao login profissional; "Pontuação (%)" aceitava decimais; recurso "encaminhado a outro professor"; "Encaminhar à coordenação" para a própria coordenação; gabarito incompleto em *Contestações*; código MFA reaparecendo entre diálogos | 002, 012, 013, 023 |
| [BUG-037](#bug-037) | 2026-10-24 | Baixa | Asserção do e2e do recurso passava mesmo se a decisão falhasse | 007 |
| [BUG-036](#bug-036) | 2026-10-24 | Média | Erros que não apareciam: exportar turma, arquivar prova, atualizar versões, recusar versão (atrás do diálogo), sino, painel, banco de questões da montagem, permissões delegadas | vários |
| [BUG-035](#bug-035) | 2026-10-24 | Média | Montagem da prova mostrava só as 100 primeiras questões publicadas | 032 |
| [BUG-034](#bug-034) | 2026-10-24 | Média | Interruptor "avisos por e-mail" voltava ao valor antigo ao trocar de aba | 029 |
| [BUG-033](#bug-033) | 2026-10-24 | Média | Delegação vencida sumia da ficha do usuário em vez de aparecer como "expirada" | 030 |
| [BUG-032](#bug-032) | 2026-10-24 | Média | Permissões delegadas só chegavam aos menus/botões após novo login (doc prometia 30 s) | 022 |
| [BUG-031](#bug-031) | 2026-10-24 | Média | "Limpar período" dos relatórios mantinha a data inicial aplicada | 025 |
| [BUG-030](#bug-030) | 2026-10-24 | Alta | Logout com access token vencido não revogava a sessão: ao recarregar, o usuário voltava logado | 001 |
| [BUG-029](#bug-029) | 2026-10-24 | Alta | Correção manual vinha preenchida com a nota máxima; salvar sem mexer dava nota cheia | 012, 033 |
| [BUG-028](#bug-028) | 2026-10-24 | Crítica | Editar dados/regras de uma prova em rascunho sempre falhava com 400 | 010 |
| [BUG-026](#bug-026) | 2026-10-20 | Crítica | Com Let's Encrypt, o Nginx (sem root) não lia o certificado e caía para HTTP | 017 |
| [BUG-025](#bug-025) | 2026-10-12 | Alta | Prova impressa sem gabarito revelaria a ordem certa das questões de ordenação | 033 |
| [BUG-024](#bug-024) | 2026-10-12 | Média | Teste do monitor não via o alerta: receptor de webhook fechava antes de ler o corpo / log sem quebra de linha | 026 |
| [BUG-023](#bug-023) | 2026-10-12 | Alta | `testes/lib.sh` terminava com status 1: todos os testes de infraestrutura saíam calados | 027 |
| [BUG-022](#bug-022) | 2026-10-12 | Baixa | Teste de limpeza de mídias contava arquivos deixados por execuções anteriores | 028 |
| [BUG-021](#bug-021) | 2026-10-12 | Alta | Ciclo de importação (notificações → usuários → IAM → notificações) impedia a API de subir conforme a ordem de carga | 029 |
| [BUG-020](#bug-020) | 2026-10-11 | Baixa | Asserção antiga "resultado não contém a palavra gabarito" quebrava com os campos de política | 024 |
| [BUG-019](#bug-019) | 2026-10-11 | Média | Monitor alertava "API/Nginx fora do ar" a cada reinício da stack | 026 |
| [BUG-018](#bug-018) | 2026-10-11 | Média | Upload de mídia de 5 MB seria barrado pelo Nginx (limite global de 5 MB + multipart) | 021 |
| [BUG-017](#bug-017) | 2026-10-11 | Média | Monitor como `nobody` não conseguiria ler o status do backup (pasta 700/root) | 026 |
| [BUG-016](#bug-016) | 2026-10-11 | Baixa | Scripts de operação: erro de sintaxe no verificador e `criar-admin` sem ler o `.env` | 020 |
| [BUG-015](#bug-015) | 2026-10-11 | Baixa | Teste de navegador da sessão única intermitente (corrida com o 409) | 011 |
| [BUG-014](#bug-014) | 2026-10-11 | Média | HSTS não era enviado no modo HTTPS (herança de `add_header` no Nginx) | 017 |
| [BUG-013](#bug-013) | 2026-10-11 | Alta | Auditoria imutável gravava o nome do participante (dado pessoal impossível de anonimizar) | 019 |
| [BUG-012](#bug-012) | 2026-10-11 | Média | Healthcheck do backup marcava "falha" mesmo com backup recente | 018 |
| [BUG-011](#bug-011) | 2026-10-10 | Baixa | Suíte Playwright: esperas frágeis e 409 esperados contados como erro | 007 |
| [BUG-010](#bug-010) | 2026-10-10 | Baixa | Comentário do `SenhaService` apontava para ADR inexistente | 001 |
| [BUG-009](#bug-009) | 2026-10-10 | Alta | Login de uma turma inteira levava até 12 s (Argon2 com parâmetros pesados) | 001 / 016 |
| [BUG-008](#bug-008) | 2026-10-10 | Baixa | Teste de CSV grande não testava o que dizia (arquivo < 100 KB) | 009 |
| [BUG-007](#bug-007) | 2026-10-10 | Baixa | Teste de rate limit falhava com `address of null` no supertest | 001 |
| [BUG-006](#bug-006) | 2026-10-10 | Alta | `start:prod` apontava para `dist/main` sem extensão (ESM) | 006 |
| [BUG-005](#bug-005) | 2026-10-10 | Média | Log de requisição registrava todos os cabeçalhos de resposta | 006 |
| [BUG-004](#bug-004) | 2026-10-10 | Média | HSTS e `upgrade-insecure-requests` enviados com acesso HTTP puro | 006 |
| [BUG-003](#bug-003) | 2026-10-10 | Crítica | Rate limit por IP bloquearia turmas inteiras atrás de NAT | 001 |
| [BUG-002](#bug-002) | 2026-10-10 | Média | Login direto perdia a rota de origem (mesma corrida do BUG-001) | 007 |
| [BUG-001](#bug-001) | 2026-10-10 | Crítica | Após verificar o MFA, a tela voltava ao login | 002 / 007 |

---

### BUG-001

**Após verificar o MFA, a tela voltava ao login**

- **Severidade:** Crítica — Administrador/Coordenador não conseguiam entrar pelo navegador.
- **Como foi encontrado:** validação manual com Chromium (Playwright) contra a stack Docker.
  Os testes de API passavam; o problema era só no frontend.
- **Causa:** em `VerificacaoMfa`, `verificarMfa()` autenticava o usuário e limpava
  `pendenciaMfa`. O React re-renderizava a tela antes do `navegar(destino)` e caía no
  `if (!pendenciaMfa) return <Navigate to="/login" />`.
- **Correção:** a tela passou a redirecionar de forma declarativa: com `usuario` presente →
  `<Navigate to={destino ?? rotaInicial(...)} />`. A navegação imperativa foi removida.
- **Arquivos:** `apps/web/src/paginas/auth/VerificacaoMfa.tsx`
- **Teste de regressão:** `apps/web/src/paginas/auth/VerificacaoMfa.test.tsx` — "após o código
  correto vai para a rota original (e não volta ao login)".

### BUG-002

**Login direto perdia a rota de origem**

- **Severidade:** Média — latente; encontrado na análise do BUG-001.
- **Causa:** mesmo padrão do BUG-001 em `FormularioLogin` (navegação imperativa logo após
  mudar o estado de autenticação). Ao adicionar o redirecionamento de "usuário já logado",
  a corrida passaria a mandar sempre para o painel, ignorando a rota de origem.
- **Correção:** redirecionamento declarativo com `usuario` presente; `navegar` só para `/mfa`.
- **Arquivos:** `apps/web/src/paginas/auth/FormularioLogin.tsx`
- **Teste:** `FormularioLogin.test.tsx` — "com sessão ativa, segue para a área do ambiente".

### BUG-003

**Rate limit por IP bloquearia turmas inteiras atrás de NAT**

- **Severidade:** Crítica (de projeto) — inviabilizaria a aplicação de prova em laboratório.
- **Como foi encontrado:** o roteiro de navegador recebeu `429` no login do aluno depois de
  poucas chamadas de um único usuário.
- **Causa:** limite de 10 req/min **por IP** nas rotas de login da API e 20 req/min por IP no
  Nginx para todo `/api/v1/auth/` (incluindo `/refresh`, chamado a cada carregamento de página).
  Toda a turma sai pelo mesmo IP público do campus.
- **Correção:** limitador `credenciais` por **IP + identificador** (10/min) apenas em rotas
  `@RotaCredencial()`; limite geral por IP folgado (600/min); zona do Nginx restrita a login/MFA
  com 300 req/min. Decisão registrada no [ADR-0011](adr/0011-rate-limit-por-ip-e-identificador.md).
- **Arquivos:** `apps/api/src/common/throttle/throttlers.ts`, `app.module.ts`,
  `modules/iam/auth.controller.ts`, `config/env.ts`, `infra/nginx/default.conf.template`
- **Testes:** `apps/api/test/auth.e2e-spec.ts` — "não bloqueia colegas na mesma rede (mesmo IP,
  identificadores diferentes)"; `throttlers.spec.ts`.

### BUG-004

**HSTS e `upgrade-insecure-requests` enviados com acesso HTTP puro**

- **Severidade:** Média — o acesso do MVP é por IP via HTTP (sem DNS/TLS); o cabeçalho
  `upgrade-insecure-requests` faz o navegador tentar HTTPS em recursos e o HSTS não tem sentido.
- **Causa:** Helmet com configuração padrão.
- **Correção:** variável `TLS_ATIVO` (substitui `COOKIE_SECURE`) controla cookie `Secure`,
  HSTS e `upgrade-insecure-requests`.
- **Arquivos:** `apps/api/src/configurar-app.ts`, `config/env.ts`, `modules/iam/auth.controller.ts`
- **Verificação:** `curl -I /api/v1/health` sem `Strict-Transport-Security` com `TLS_ATIVO=false`.

### BUG-005

**Log de requisição registrava todos os cabeçalhos de resposta**

- **Severidade:** Média — logs verbosos e risco de vazar dados (o `redact` cobria só
  `authorization`, `cookie` e `set-cookie`).
- **Correção:** `serializers` do pino registram apenas `id`, `method`, `url` e `statusCode`
  ([ADR-0014](adr/0014-logging-estruturado.md)).
- **Arquivos:** `apps/api/src/app.module.ts`

### BUG-006

**`start:prod` apontava para `dist/main` sem extensão**

- **Severidade:** Alta — com `"type": "module"`, `node dist/main` falha (ESM exige extensão).
- **Origem:** script gerado pelo template do Nest CLI 12.
- **Correção:** `node dist/main.js` (o Dockerfile já usava o caminho correto).
- **Arquivos:** `apps/api/package.json`

### BUG-007

**Teste de rate limit falhava com `Cannot read properties of null (reading 'address')`**

- **Severidade:** Baixa — defeito do teste, não da aplicação.
- **Causa:** as 11 requisições do supertest eram criadas antes de serem executadas; cada uma
  sobe um servidor efêmero e o objeto ficava sem endereço.
- **Correção:** criar e aguardar cada requisição dentro do laço.
- **Arquivos:** `apps/api/test/auth.e2e-spec.ts`

### BUG-008

**Teste de "CSV grande" não exercitava o limite de corpo da requisição**

- **Severidade:** Baixa — defeito do teste.
- **Como foi encontrado:** a asserção de sanidade `tamanho > 100 KB` (adicionada justamente para
  garantir que o teste passava do limite padrão de 100 KB do Express) falhou: 300 linhas davam ~25 KB.
- **Correção:** 900 linhas mais longas (> 100 KB), dentro do máximo de 1000 linhas do importador.
  Com isso o teste confirma que `useBodyParser('json', { limit: '1mb' })` está ativo.
- **Arquivos:** `apps/api/test/fluxo-completo.e2e-spec.ts`

> Nota da etapa Sprints 2–4: a validação completa no navegador (questão → revisão → prova →
> aplicação → execução no celular → correção → recurso → relatório/CSV → notificações → prova
> pública por PIN) **não encontrou defeitos na aplicação**. As falhas do roteiro de navegador
> foram do próprio roteiro (esperar a URL em vez do conteúdo, já que o React Router atualiza a
> URL antes de terminar a renderização) e não estão no repositório.

### BUG-009

**Login de uma turma inteira levava até 12 s**

- **Severidade:** Alta — no início de uma prova em laboratório, alunos esperariam até 12 s para
  entrar (e mais 7 s na troca da senha temporária).
- **Como foi encontrado:** teste de carga com 40 alunos simultâneos (feature 016).
- **Causa:** Argon2id com os padrões da biblioteca (64 MiB, t=3, p=4): ~106 ms de CPU por
  verificação; 40 verificações concorrentes em 2 vCPUs enfileiravam ~4 s, e o login/troca somam
  várias.
- **Correção:** parâmetros mínimos da OWASP (19 MiB, t=2, p=1) com re-hash transparente no
  login ([ADR-0023](adr/0023-parametros-argon2-owasp.md)). Login p95 11,8 s → 2,8 s; cenário
  completo 15,1 s → 5,9 s.
- **Arquivos:** `apps/api/src/modules/iam/{senha.service,auth.service}.ts`, `prisma/seed.ts`
- **Testes:** `senha.service.spec.ts`; `auth.e2e-spec.ts` — "migra hash com parâmetros antigos
  no login"; teste de carga no CI (job `navegador`).

### BUG-010

**Comentário apontava para ADR inexistente**

- **Severidade:** Baixa (documentação no código).
- **Causa:** o comentário do `SenhaService` citava `0006-autenticacao-jwt-sessao-mfa.md`; o
  arquivo real é `0006-autenticacao-jwt-sessao.md`.
- **Correção:** comentário reescrito junto com o BUG-009.

### BUG-011

**Suíte Playwright com esperas frágeis**

- **Severidade:** Baixa — defeitos do teste, não da aplicação (investigados para confirmar).
- **Causas e correções:**
  1. contava as questões (`.qz-mapa button`) antes de a tela de execução renderizar → passou a
     esperar o cronômetro;
  2. não tratava o alerta de duplicidade (RF04), que aparece a partir da segunda execução por
     haver questões parecidas → trata o diálogo quando presente;
  3. o navegador registra toda resposta 4xx como erro de console; os 409 esperados (duplicidade,
     sessão assumida) faziam a checagem "zero erros" falhar → essa mensagem genérica de status é
     ignorada; erros de JavaScript continuam reprovando.
- **Arquivos:** `apps/web/e2e/{ciclo-completo.spec,apoio}.ts`

### BUG-012

**Healthcheck do backup sempre falhava**

- **Severidade:** Média — o alerta de "backup atrasado" dispararia todo dia, tornando-se ruído.
- **Como foi encontrado:** teste do healthcheck logo após um backup bem-sucedido (deveria passar).
- **Causa:** o `date` do BusyBox (imagem Alpine) não aceita o formato ISO `2026-10-11T02:07:46Z`;
  o script tratava a data como inválida e considerava o backup antigo.
- **Correção:** conversão para `2026-10-11 02:07:46` antes do `date -d`; falha explícita se ainda
  assim não interpretar.
- **Arquivos:** `infra/backup/saude.sh`
- **Verificação:** recente → saudável; 10 dias → falha; nunca houve sucesso → falha.

### BUG-013

**Auditoria gravava o nome do participante**

- **Severidade:** Alta (LGPD) — a trilha é imutável por trigger; um nome gravado nela nunca mais
  poderia ser anonimizado, contrariando o direito de eliminação.
- **Como foi encontrado:** revisão dos dados pessoais armazenados, ao desenhar a anonimização (ADR-0028).
- **Causa:** o evento `TENTATIVA_INICIADA` incluía `participante: <nome>` em `dados`.
- **Correção:** o evento guarda só `aplicacaoId` e `numero`; a regra "auditoria sem nome/e-mail"
  vale para os eventos de LGPD (o e-mail anonimizado não é registrado). Teste e2e confere.
- **Limitação:** eventos antigos do banco de **homologação** continuam com o nome (não podem ser
  alterados). Produção deve começar de banco novo (roteiro de implantação).
- **Arquivos:** `apps/api/src/modules/aplicacao/execucao.service.ts`, `modules/lgpd/lgpd.service.ts`

### BUG-014

**HSTS ausente no HTTPS**

- **Severidade:** Média — sem HSTS, um navegador poderia ser levado a usar HTTP numa rede hostil.
- **Como foi encontrado:** verificação dos cabeçalhos ao ativar o modo autoassinado.
- **Causa:** regra de herança do Nginx — o `add_header` do bloco `server` é ignorado nas `location`
  que têm os próprios `add_header` (as do SPA, com os cabeçalhos de segurança).
- **Correção:** `map $scheme $cabecalho_hsts` no contexto http e `add_header Strict-Transport-Security
  $cabecalho_hsts` dentro do snippet de segurança (vazio em HTTP, então o cabeçalho é omitido).
- **Arquivos:** `infra/nginx/modelos/{00-comum,https}.conf.template`, `infra/nginx/seguranca.conf`
- **Verificação:** HTTPS envia `max-age=31536000; includeSubDomains`; HTTP não envia.

### BUG-015

**Teste de navegador da sessão única intermitente**

- **Severidade:** Baixa — defeito do teste (falhou 1 vez em ~10 execuções).
- **Causa:** depois de outra aba assumir a prova, a gravação pendente da aba antiga pode receber o
  409 a qualquer momento (ao sair do campo de texto). O teste checava se a tela de "aberta em outro
  lugar" estava visível e, se não, marcava uma alternativa com `check()` — que esperava até o timeout
  quando a tela trocava no meio do caminho.
- **Correção:** espera pela questão **ou** pela tela de substituição; se ainda for preciso gravar,
  usa um clique tolerante ao elemento sumir; então exige a tela de substituição.
- **Verificação:** 4 + 3 execuções seguidas sem falha, inclusive logo após reiniciar a stack.
- **Arquivos:** `apps/web/e2e/ciclo-completo.spec.ts`

### BUG-016

**Scripts de operação**

- **Severidade:** Baixa — encontrados na primeira execução, antes de qualquer uso.
- `verificar-producao.sh`: `${#JWT:=…}` (substituição inválida no bash) → atribuição separada.
- `criar-admin.ts` fora do container não lia o `.env` (erro "client password must be a string") →
  carrega `.env` quando existir e falha com mensagem clara sem `DATABASE_URL`.
- **Arquivos:** `infra/vps/verificar-producao.sh`, `apps/api/prisma/criar-admin.ts`

### BUG-017

**Monitor não leria o status do backup**

- **Severidade:** Média — encontrado na revisão, antes da primeira execução.
- A imagem do monitor rodava como `nobody`, mas `./backups` no host é `700/root` (criada pelo
  serviço de backup). Resultado: alerta permanente "nenhum backup bem-sucedido".
- **Correção:** roda como root **sem nenhuma capacidade** (`cap_drop: [ALL]`, `read_only`,
  `no-new-privileges`) — lê só por ser o dono dos arquivos (ADR-0036).
- **Arquivos:** `infra/monitor/Dockerfile`, `docker-compose.yml`

### BUG-018

**Limite de upload do Nginx**

- **Severidade:** Média — encontrado na revisão.
- `client_max_body_size 5m` global: um arquivo de exatamente 5 MB (limite da API) mais os cabeçalhos
  do multipart excederia o Nginx, que devolveria 413 com página HTML em vez da mensagem da API.
- **Correção:** `location = /api/v1/midias` com `client_max_body_size 6m`; o limite real (5 MB) é
  da API, com mensagem amigável. Conferido: 5,3 MB → 413 da API.
- **Arquivos:** `infra/nginx/snippets-app.conf`

### BUG-019

**Falso alarme do monitor na subida**

- **Severidade:** Média — visto no primeiro `docker compose up` com o monitor.
- O monitor subia antes da API e do Nginx ficarem saudáveis e enviava "PROBLEMA: API não responde"
  a cada reinício (e "RESOLVIDO" 5 min depois) — ruído que ensina a equipe a ignorar alertas.
- **Correção:** `depends_on` com `service_healthy` (API e Nginx) e carência inicial de 60 s
  (`MONITOR_ATRASO_INICIAL_S`).
- **Arquivos:** `docker-compose.yml`, `infra/monitor/monitor.sh`, `infra/monitor/Dockerfile`

### BUG-020

**Teste do resultado do aluno procurava a palavra "gabarito"**

- **Severidade:** Baixa — teste.
- `fluxo-completo.e2e-spec.ts` garantia "sem gabarito" verificando que o JSON não continha a
  palavra. Com a política de gabarito, a resposta passou a ter `exibirGabarito`/`gabaritoVisivel` e
  `gabarito: null` — o teste falhou sem haver vazamento.
- **Correção:** a asserção verifica o significado: política `NUNCA`, `gabaritoVisivel=false`,
  `gabarito`/`rubrica` nulos em todas as questões e nenhum critério de rubrica no corpo.
- **Arquivos:** `apps/api/test/fluxo-completo.e2e-spec.ts`

### BUG-021

**Ciclo de importação derrubava a injeção de dependências**

- **Severidade:** Alta — a API não subia ("Nest can't resolve dependencies of the AuthService …
  index [6]") quando o primeiro módulo carregado era o de aplicação; pego pela suíte e2e completa
  antes de chegar à stack.
- **Causa:** para mandar notificação por e-mail, `NotificacoesService` passou a importar
  `UsuariosService`, que importa `iam/auth.service`, que importa `NotificacoesService`. Em ESM o
  ciclo deixa a classe `undefined` no momento em que o decorador lê os tipos do construtor.
- **Correção:** `NotificacoesService` resolve o `UsuariosService` em tempo de execução
  (`import()` dinâmico + `ModuleRef`), sem import estático.
- **Arquivos:** `apps/api/src/modules/notificacoes/{notificacoes.service,notificacoes.module}.ts`

### BUG-022

**Resíduo entre execuções no teste de mídias órfãs**

- **Severidade:** Baixa — teste.
- A pasta de mídias dos e2e é compartilhada entre execuções; arquivos "envelhecidos" por uma
  execução anterior (sem registro após o `TRUNCATE`) eram removidos na seguinte e o teste contava 1
  arquivo a mais.
- **Correção:** o teste esvazia a pasta antes de começar.
- **Arquivos:** `apps/api/test/formatos-e-aplicacao.e2e-spec.ts`

### BUG-023

**Testes de infraestrutura saíam sem fazer nada**

- **Severidade:** Alta (para a bateria) — encontrado ao rodar pela primeira vez o novo
  `testar-scripts.sh`; afetava também `testar-backup`, `testar-https` e `testar-monitor` (escritos
  no lote 6, mas ainda não executados).
- **Causa:** a última linha do `testes/lib.sh` era `[[ "$URL_HTTPS" == … ]] && URL_HTTPS=…`; com a
  condição falsa o `source` devolvia 1 e, com `set -e`, o script terminava em silêncio, com erro.
- **Correção:** `if … then … fi` e `true` no fim do arquivo (comentado). Depois disso
  `testar-scripts`, `testar-monitor` e `testar-backup` passaram.
- **Arquivos:** `testes/lib.sh`

### BUG-024

**Alerta do monitor não aparecia no receptor de teste**

- **Severidade:** Média (teste) — o monitor enviava o alerta corretamente (conferido com `curl`).
- **Causas:** (1) o receptor `nc` respondia e fechava antes de ler o corpo do POST; (2) o log do
  Docker retém a última linha sem quebra de linha.
- **Correção:** o receptor espera 1 s antes de responder e imprime uma quebra de linha após cada
  requisição.
- **Arquivos:** `testes/infra/testar-monitor.sh`

### BUG-025

**Impressão revelaria o gabarito da ordenação**

- **Severidade:** Alta (vazamento de gabarito) — encontrado na revisão, antes de chegar à stack.
- **Causa:** a ordenação guarda os itens **na ordem correta** (é o gabarito). A primeira versão do
  componente de exibição listava os itens na ordem salva quando não havia resposta nem gabarito — o
  caso da prova impressa "sem gabarito".
- **Correção:** sem resposta e sem gabarito, a lista sai em **ordem alfabética** (e a associação
  mostra a coluna B em ordem alfabética). Teste: `QuestaoEstruturada.test.tsx`.
- **Arquivos:** `apps/web/src/componentes/QuestaoEstruturada.tsx`

### BUG-026

**Certificado do Let's Encrypt ilegível para o Nginx sem root**

- **Severidade:** Crítica. Com `TLS_MODO=letsencrypt`, o site subia em **HTTP** (fallback do ADR-0029) em vez de HTTPS. Foi encontrado na primeira emissão real (ADR-0056); antes, o fluxo nunca tinha sido testado por falta de domínio.
- **Causa:** o certbot grava `/etc/letsencrypt/live` e `archive` com permissão `700` e a chave privada com `600`, todos de root. O Nginx roda como uid/gid 101 (ADR-0029) e não conseguia ler nem a pasta. O log dizia "certificado não encontrado", e o verificador acusaria HTTPS desligado.
- **Correção:** depois da emissão (`ativar-letsencrypt.sh`) e depois de **cada renovação** (laço do serviço `certbot`), o grupo passa a ser 101, as pastas ficam `750` e `privkey*.pem` fica `640`. A chave continua inacessível para os demais usuários.
- **Verificação:** emissão real para `203-0-113-10.sslip.io`, Nginx em `modo efetivo: letsencrypt`, `curl` sem `-k` com resposta 200 e `certbot renew --dry-run` bem-sucedido.
- **Arquivos:** `docker-compose.yml` (serviço `certbot`), `infra/tls/ativar-letsencrypt.sh`

### BUG-028

**Editar uma prova em rascunho sempre falhava com 400**

- **Severidade:** Crítica — o passo 1 do assistente ("Editar informações e regras") não salvava; só a criação funcionava. Encontrado na auditoria do 09c (2026-10-24).
- **Causa:** `EditarProva` passava a `ProvaDetalhe` inteira ao `FormParametros`, que a reenviava no `PUT /provas/:id`. A API usa `forbidNonWhitelisted` e recusava `id`, `status`, `itens`, `secoes`, `somaPesos`…
- **Correção:** `somenteParametros()` (`provas/padroes.ts`) envia só os campos do `SalvarProvaDto`, inclusive `correcaoDupla`/`limiarDivergencia`, que não têm campo no formulário e voltariam ao padrão. Teste: `padroes.test.ts`.
- **Arquivos:** `apps/web/src/paginas/profissional/provas/{padroes.ts,FormParametros.tsx,AssistenteProva.tsx}`, `apps/web/src/api/tipos.ts`

### BUG-029

**Correção manual começava com a nota máxima**

- **Severidade:** Alta (nota indevida). Numa questão ainda não corrigida, o percentual começava em 100% e cada critério da rubrica no máximo; clicar em "Salvar correção" sem mexer dava nota cheia.
- **Correção:** os campos começam vazios e o botão só habilita com tudo preenchido. O percentual é arredondado para inteiro, porque a API exige `@IsInt`. Teste: `PainelCorrecao.test.tsx`.
- **Arquivos:** `apps/web/src/paginas/profissional/correcao/TelaCorrecao.tsx`

### BUG-030

**Logout não revogava a sessão quando o access token já tinha vencido**

- **Severidade:** Alta (segurança/UC10 do doc 001). `sair()` chamava `/auth/logout` com `semRenovacao`. Depois de 15 min parado, a API respondia 401, a sessão continuava válida e o cookie de refresh ficava; ao recarregar a página, o usuário voltava logado.
- **Correção:** o logout usa a renovação normal: em 401 renova o token e repete. Se a renovação falhar, a sessão já não vale. Teste: `ProvedorAuth.test.tsx`.
- **Arquivos:** `apps/web/src/auth/ProvedorAuth.tsx`

### BUG-031

**"Limpar período" mantinha a data inicial**

- **Severidade:** Média. Duas chamadas seguidas de `setSearchParams` partem da URL do mesmo render, então a segunda (`ate`) desfazia a primeira (`de`).
- **Correção:** `definir()` recebe os dois campos e faz uma única navegação. Teste: passo no `e2e/ciclo-completo.spec.ts`.
- **Arquivos:** `apps/web/src/paginas/profissional/relatorios/Relatorios.tsx`

### BUG-032

**Permissões delegadas só valiam na interface após novo login**

- **Severidade:** Média. `usuario.permissoes` só era lido no login ou ao abrir o app. A API já respeitava a delegação, mas menus e botões (por exemplo, "Reabrir") não apareciam.
- **Correção:** `ProvedorAuth` relê `/auth/me` a cada 30 s e ao voltar para a aba (só no ambiente profissional). A função `atualizarUsuario()` ficou exposta no contexto.
- **Arquivos:** `apps/web/src/auth/{ProvedorAuth.tsx,contexto.ts}`

### BUG-033

**Delegação expirada sumia da ficha**

- **Severidade:** Média (caso 4 do doc 030). O front descartava as linhas com `expirada`, e a permissão voltava a mostrar só "Conceder".
- **Correção:** a permissão vencida aparece com o selo "expirada", quem concedeu e quando venceu; continua possível conceder de novo.
- **Arquivos:** `apps/web/src/paginas/profissional/DetalheUsuario.tsx`

### BUG-034

**Interruptor de avisos por e-mail voltava ao valor antigo**

- **Severidade:** Média. O cartão lia o valor inicial do usuário da sessão, que não era atualizado depois do `PATCH`; como a aba é desmontada ao trocar, voltava ligado.
- **Correção:** após salvar, `atualizarUsuario()` relê `/auth/me`.
- **Arquivos:** `apps/web/src/paginas/ContaSeguranca.tsx`

### BUG-035

**Montagem da prova limitada às 100 primeiras questões**

- **Severidade:** Média. O seletor pedia `tamanho=100` sem paginação, e o contador mostrava o tamanho da página, não o total.
- **Correção:** a busca agora é paginada (50 por página, com a paginação do `DataTable`), o contador mostra `total`, e mudar a busca ou a disciplina volta à página 1. o botão passou a se chamar "Adicionar todas desta página".
- **Arquivos:** `apps/web/src/paginas/profissional/provas/ComposicaoSecoes.tsx`

### BUG-036

**Falhas que não apareciam para o usuário**

- **Severidade:** Média. Mutations e consultas sem mensagem de erro na tela, nestes pontos:
  - exportar no relatório da turma;
  - arquivar prova;
  - "Usar as versões mais novas";
  - recusar ou devolver questão (o erro ficava atrás do diálogo);
  - sino (mostrava "Nenhuma notificação");
  - painel (métricas em "…" para sempre);
  - banco de questões da montagem ("Carregando…" para sempre);
  - catálogo e lista de permissões delegadas.
- **Correção:** cada ponto mostra o `AlertBanner` (ou o texto) de erro no lugar visível. Os diálogos limpam o erro anterior ao abrir.
- **Arquivos:** `Relatorios.tsx`, `DetalheProva.tsx`, `AssistenteProva.tsx`, `DetalheQuestao.tsx`, `SinoNotificacoes.tsx`, `Painel.tsx`, `ComposicaoSecoes.tsx`, `DetalheUsuario.tsx`

### BUG-037

**Asserção fraca no e2e do recurso**

- **Severidade:** Baixa (teste). `getByRole('heading', { name: 'Decisão' })` casava por substring com "Decisão do recurso", que já existe no formulário antes de decidir.
- **Correção:** o teste espera "Decidido em" e "Impacto na pontuação", que só aparecem depois da decisão gravada. O e2e passou a cobrir também "Limpar período" e "Marcar todas como lidas".
- **Arquivos:** `apps/web/e2e/ciclo-completo.spec.ts`

### BUG-038

**Ajustes menores do frontend (auditoria do 09c)**

- Recarregar `/mfa` sem pendência mandava sempre para `/login`. Agora o ambiente vai no `state` da navegação e o aluno volta a `/aluno/login`. Teste em `VerificacaoMfa.test.tsx`.
- Acompanhamento do recurso pelo aluno:
  - dizia "encaminhado a outro professor", mas o recurso vai à coordenação. Corrigido;
  - marcava "Em análise" como etapa atual com o pedido ainda `ABERTO`. Corrigido.
- "Encaminhar à coordenação" aparecia para a própria coordenação ou administração. Foi ocultado.
- *Contestações* mostrava como gabarito só as alternativas. Agora inclui o valor numérico e as respostas aceitas.
- O código digitado num diálogo de MFA (gerar códigos, desativar, cadastro) reaparecia no outro. Agora é limpo ao abrir ou cancelar.
- **Arquivos:** `VerificacaoMfa.tsx`, `FormularioLogin.tsx`, `aluno/Resultados.tsx`, `DetalheRecurso.tsx`, `ContaSeguranca.tsx`

### BUG-039

**e2e do ciclo completo desatualizado em relação à montagem por seções**

- **Severidade:** Baixa (teste). Desde o lote 8, a questão entra na montagem com peso 0. O teste esperava "Soma dos pesos: 100%" logo após adicionar e falhava também com o frontend antigo da stack (conferido em 2026-10-24).
- **Correção:** o teste clica em "Distribuir igualmente" antes de conferir a soma.
- **Arquivos:** `apps/web/e2e/ciclo-completo.spec.ts`

### BUG-040

**Problemas achados na revisão das correções (segunda passada da auditoria)**

- **PUT da prova:** voltava `sugestaoIa` e `tempoPorQuestaoSeg` ao padrão, porque os dois não estavam em `somenteParametros`. Agora estão, com teste em `padroes.test.ts`.
- **Edição da turma:** com o responsável desativado, ela falhava ("Professor responsável inválido"). Agora o campo só é enviado quando muda, e o responsável inativo aparece na lista como "(inativo)".
- **Equipe da turma e corretores designados:** com alguém desativado, que fica oculto na lista, o PUT dava 400 para sempre. Agora quem está inativo é mostrado e sai ao salvar.
- **"Nova pontuação" do recurso e "Minutos adicionais" da reabertura:** fora de `<form>`, decimais e valores fora da faixa iam para a API, que respondia com mensagem em inglês. Agora os valores são arredondados e limitados no próprio campo.
- **Delegação para Corretor:** "Reabrir tentativas" não é mais oferecida a Corretor, que não tem tela de aplicações. Se já tiver sido concedida, continua listada para poder ser revogada.
- **Diálogo de arquivar prova:** limpa o erro anterior ao reabrir.
- **Logout:** não lança erro quando a sessão já é inválida no servidor.
- **Banco da montagem:** mantém a página anterior enquanto carrega a próxima. O botão passou a "Adicionar todas desta página".
- **Arquivos:** `padroes.ts`, `tipos.ts`, `DetalheTurma.tsx`, `CampoResponsavel.tsx`, `DetalheProva.tsx`, `DetalheRecurso.tsx`, `AcompanhamentoAplicacao.tsx`, `DetalheUsuario.tsx`, `ProvedorAuth.tsx`, `ComposicaoSecoes.tsx`, `e2e/recursos-avancados.spec.ts`

### BUG-041

**Corretor via aplicações, recursos e relatórios de todas as provas**

- **Severidade:** Média. Foi encontrado na revisão de segurança de 2026-10-26.
- **Causa:** `ProvasService.idsVisiveis` devolvia `null` ("vê todas", o escopo da gestão) também para o papel Corretor. Pelo ADR-0021, o corretor não tem aplicações, recursos nem relatórios. Normalmente as rotas barravam esse acesso por papel. Mas um corretor que recebesse a delegação `REABRIR_TENTATIVAS` podia reabrir **qualquer** tentativa do sistema, descartando a nota e dando mais tempo ao aluno. Isso contraria o ADR-0033 ("o escopo de dados continua o do papel").
- **Correção:** para o Corretor, `idsVisiveis` agora devolve lista vazia. A fila de correção dele não usa esse método e continua igual. Teste de regressão em `fluxo-completo.e2e-spec.ts`: o corretor com a permissão delegada recebe 404 e a nota permanece.
- **Arquivos:** `apps/api/src/modules/provas/provas.service.ts`, `apps/api/test/fluxo-completo.e2e-spec.ts`

### BUG-042

**Gabarito dedutível pelos IDs em associação e ordenação**

- **Severidade:** Alta. Permitia nota máxima sem saber o conteúdo. Foi encontrado na revisão de segurança de 2026-10-26.
- **Causa:** as versões guardam os pares como `I1→O1…` e a ordem correta como `A,B,C…`. A instância embaralhava a apresentação, mas mantinha os IDs entregues pela API (execução e resultado).
- **Correção:** IDs aleatórios por instância e gabarito congelado traduzido para eles ([ADR-0057](adr/0057-ids-opacos-e-arredondamento-da-nota.md)).
- **Testes:** `instancia.spec.ts` verifica IDs sem padrão, IDs diferentes por instância e nota cheia com a resposta certa traduzida. Em `secoes-e-correcao.e2e-spec.ts`, as respostas passaram a ser localizadas pelo texto, como o aluno faz.
- **Arquivos:** `apps/api/src/modules/aplicacao/instancia.ts`, `apps/api/src/modules/aplicacao/dto.ts`

### BUG-043

**Correção e decisão de recurso sem trava**

- **Severidade:** Média.
- **Causa:** cada transação lia a nota sem lock, em READ COMMITTED. Isso causava três problemas:
  - dois corretores fechando questões diferentes viam a do outro como pendente, e a nota podia nunca consolidar;
  - na correção em dupla, o papel era decidido fora da transação, então dois corretores viravam ambos "PRIMEIRA" e um sobrescrevia o outro;
  - o status "consolidada" e o "recurso já decidido" eram checados fora da transação.
- **Correção:**
  - `SELECT … FOR UPDATE` na nota (em ordem de id, para evitar deadlock) em correção, dupla, ajuste e anulação, e na linha do recurso em `decidir`;
  - as checagens de status e a decisão do papel na dupla passaram para dentro da transação, depois da trava.
- **Teste:** `secoes-e-correcao.e2e-spec.ts` tem duas correções simultâneas (`Promise.all`) que consolidam a nota, e uma nova correção depois disso recebe 409.
- **Arquivos:** `apps/api/src/modules/correcao/correcao.service.ts`, `apps/api/src/modules/recursos/recursos.service.ts`

### BUG-044

**Anulação podia estourar o tempo da transação**

- **Severidade:** Média.
- **Causa:** a anulação recalculava cada nota afetada com cerca de 4 consultas, relendo as anulações a cada nota, dentro da transação do recurso com o limite padrão do Prisma (5 s).
- **Correção:**
  - anulações lidas uma vez e notas carregadas em blocos de 200;
  - cálculo em memória, com uma atualização por nota;
  - transação com `timeout` de 60 s.
- **Arquivos:** `apps/api/src/modules/correcao/correcao.service.ts`, `apps/api/src/modules/recursos/recursos.service.ts`

### BUG-045

**Arredondamento binário da nota**

- **Severidade:** Baixa.
- **Causa:** `Math.round(0,5025 × 1000)` em double dá 502, e a nota ficava 5,02 em vez de 5,03.
- **Correção:** `arredondar()`, meio para cima sem resíduo binário, na nota e nas médias dos relatórios ([ADR-0057](adr/0057-ids-opacos-e-arredondamento-da-nota.md)).
- **Teste:** `calculo.spec.ts`.
- **Arquivos:** `apps/api/src/modules/correcao/calculo.ts`, `apps/api/src/modules/relatorios/`

### BUG-046

**Correção às cegas com atalho para a identidade**

- **Severidade:** Baixa.
- **Causa:** `listar` e `obter` da correção mascaravam nome e e-mail, mas espalhavam a nota inteira na resposta, inclusive `usuarioId` e `tentativaId`. Um corretor que também tivesse a delegação `DESBLOQUEAR_CONTAS` chegava ao nome pela ficha do usuário.
- **Correção:** `semIdentificadores()` devolve esses dois campos como `null` enquanto a correção é às cegas e a nota não consolidou. A fila já devolvia só campos explícitos.
- **Teste:** `secoes-e-correcao.e2e-spec.ts` verifica os IDs nulos antes de consolidar e `usuarioId` de volta depois.
- **Arquivos:** `apps/api/src/modules/correcao/correcao.service.ts`

### BUG-047

**Duas renovações simultâneas derrubavam a sessão**

- **Severidade:** Alta. Um aluno podia ser deslogado no meio da prova.
- **Causa:** a rotação do refresh lia o hash e gravava o novo sem condição. Com duas abas, ou com a renovação automática coincidindo com uma nova tentativa depois de um 401, a requisição que perdia a corrida reapresentava o token já rotacionado, o que era tratado como reuso e **revogava a sessão inteira**.
- **Correção:** rotação condicional ao hash lido, mais uma janela de 30 s em que o refresh anterior ainda vale. Na janela, a resposta traz só o access token e não regrava o cookie. Fora dela, a detecção de reuso continua ([ADR-0006](adr/0006-autenticacao-jwt-sessao.md), revisão de 2026-10-27).
- **Teste:** `auth.e2e-spec.ts` cobre duas renovações simultâneas (ambas 200, só uma grava cookie, sessão ativa) e o reuso fora da janela, que revoga.
- **Arquivos:** `apps/api/src/modules/iam/sessao.service.ts`, `auth.controller.ts`, migration `20261027100000_sessao_rotacao_tolerante`

### BUG-048

**Enumeração de contas pelo bloqueio**

- **Severidade:** Baixa.
- **Causa:** o bloqueio era checado antes da senha e respondia 423 só quando a conta existia.
- **Correção:** a conta bloqueada recebe o mesmo 401 genérico, e a senha é verificada mesmo assim, no mesmo tempo. A mensagem genérica menciona o bloqueio depois de várias tentativas, e o titular continua sendo notificado.
- **Teste:** `auth.e2e-spec.ts` (bloqueada × inexistente com a mesma mensagem, notificação ao titular).
- **Arquivos:** `apps/api/src/modules/iam/auth.service.ts`

### BUG-049

**Importação de CSV lenta**

- **Severidade:** Média.
- **Causa:** cada linha fazia em série o hash Argon2 da senha temporária e o envio do convite. Com centenas de alunos novos, a requisição passava do tempo do Nginx.
- **Correção:** até 5 linhas em paralelo (`emParalelo`), com o relatório na ordem original. Matrícula repetida no arquivo passou a ser barrada antes do processamento. A sincronização pela API de integração usa o mesmo caminho e processa uma vez cada e-mail repetido. Os convites levam link e continuam fora da fila no banco (ADR-0050).
- **Teste:** `fluxo-completo.e2e-spec.ts` (matrícula repetida, CSV de 900 linhas) e `em-paralelo.spec.ts`.
- **Arquivos:** `apps/api/src/modules/turmas/turmas.service.ts`, `apps/api/src/common/lotes/`

### BUG-050

**Fila de e-mail com envio duplicado**

- **Severidade:** Média (hoje inofensivo nesta máquina, sem SMTP).
- **Causa:** o worker de 60 s não impedia rodadas sobrepostas nem reservava os itens. Além disso, o envio imediato do `enfileirar` deixava o item visível ao worker durante a primeira tentativa.
- **Correção:**
  - trava de rodada por processo;
  - reserva atômica (`UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`), que vale também entre réplicas;
  - item criado já reservado.

  Se o processo cair, a reserva de 5 min vence e o item volta para a fila.
- **Teste:** `integracao-e-operacao.e2e-spec.ts` (duas rodadas simultâneas enviam uma vez).
- **Arquivos:** `apps/api/src/infra/email/email.service.ts`

### BUG-051

**Matrícula revelando dados de outras pessoas**

- **Severidade:** Baixa.
- **Causa:** as mensagens diziam "a matrícula X já pertence a fulano@…", "o e-mail pertence a um usuário que não é aluno" e "já possui outra matrícula (número)".
- **Correção:** mensagens que apontam o conflito sem mostrar o e-mail, o papel ou a matrícula de outra pessoa.
- **Teste:** `fluxo-completo.e2e-spec.ts`.
- **Arquivos:** `apps/api/src/modules/usuarios/usuarios.service.ts`

### BUG-052

**Paginação sem máximo**

- **Severidade:** Baixa.
- **Causa:** um valor enorme em `pagina` virava um `OFFSET` caro no banco.
- **Correção:** `@Max(10_000)` nas listagens de usuários, questões e auditoria.

### BUG-053

**Validação em inglês**

- **Severidade:** Baixa.
- **Causa:** cerca de 330 validadores usam a mensagem padrão do class-validator ("x must be a string"), que chegava à tela.
- **Correção:** `exceptionFactory` traduz as mensagens padrão e mantém as personalizadas. O formato da resposta não muda.
- **Teste:** `mensagens.spec.ts`.
- **Arquivos:** `apps/api/src/common/validacao/`, `configurar-app.ts`

### BUG-055

**Relatórios agrupando por e-mail**

- **Severidade:** Alta (números errados).
- **Causa:** "última tentativa de cada participante" usava a chave `prova|e-mail`. Os anonimizados pela LGPD (e-mail vazio) se fundiam numa linha só, e quem trocou de e-mail aparecia duas vezes. O contador de participantes por disciplina e o indício de erros idênticos também usavam o e-mail.
- **Correção:** chave do participante: o aluno (`usuarioId`); para externo, a aplicação + e-mail; nota anonimizada fica sozinha.
- **Teste:** `agregacao.spec.ts`.
- **Arquivos:** `apps/api/src/modules/relatorios/agregacao.ts`

### BUG-056

**Anulação vazando para outra prova no relatório**

- **Severidade:** Média.
- **Causa:** o relatório por disciplina juntava as anulações de várias provas só pela versão da questão. A mesma questão, anulada numa prova, sumia também de outra prova. Além disso, as anulações eram lidas com uma consulta por prova.
- **Correção:** chave `prova|versão` e uma consulta só (`anulacoesDasProvas`). As consultas que não mostram enunciado nem resposta deixaram de carregá-los (`detalhado`).
- **Teste:** `agregacao.spec.ts`.
- **Arquivos:** `apps/api/src/modules/relatorios/`, `apps/api/src/modules/correcao/correcao.service.ts`

### BUG-057

**Períodos em UTC e fusos misturados**

- **Severidade:** Média.
- **Causa:** "AAAA-MM-DD" era lido como meia-noite UTC (21h do dia anterior em Brasília), e as mensagens usavam ora `America/Maceio`, ora `America/Sao_Paulo`.
- **Correção:** `FUSO_HORARIO` (padrão `America/Maceio`) e utilitário único ([ADR-0058](adr/0058-fuso-horario-da-instituicao.md)).
- **Teste:** `fuso.spec.ts` e e2e de auditoria e relatórios.
- **Arquivos:** `apps/api/src/common/fuso/`, `relatorios.controller.ts`, `auditoria.controller.ts`, `aplicacoes.service.ts`, `recursos.service.ts`

### BUG-058

**Diálogo roubando o foco a cada tecla**

- **Severidade:** Alta. Na prática, só dava para digitar uma letra nos campos dentro de diálogos.
- **Causa:** o efeito de foco do `Dialog` dependia de `aoFechar`, e as páginas passam essa função como `() => …`, nova a cada render. Ao digitar, o estado do pai mudava e o efeito rodava de novo: a limpeza devolvia o foco ao botão que abriu o diálogo e o efeito seguinte focava o contêiner. Os testes Playwright não pegavam porque `fill()` grava o valor de uma vez. Além disso, o Tab escapava para a página de fundo.
- **Correção:** `aoFechar` guardado num ref, com o efeito dependendo só de `aberto`, e trava de foco: Tab e Shift+Tab circulam entre os controles do diálogo.
- **Testes:** `Dialog.test.tsx` falha na versão antiga e passa na nova (digitação tecla a tecla, Tab preso, Esc devolve o foco). `telas-gestao.spec.ts` digita o motivo da exclusão com `pressSequentially`.
- **Arquivos:** `apps/web/src/design-system/Dialog.tsx`

### BUG-059

**Erro do sino de notificações invisível**

- **Severidade:** Baixa.
- **Causa:** "marcar como lida" e "marcar todas" não tratavam erro.
- **Correção:** alerta no painel do sino.
- **Teste:** `SinoNotificacoes.test.tsx`.
- **Arquivos:** `apps/web/src/componentes/SinoNotificacoes.tsx`

### BUG-060

**Pacote inicial pesado**

- **Severidade:** Média.
- **Causa:** um único JS de 901 KB, com as 27 telas do ambiente profissional e o KaTeX (259 KB) carregados por qualquer visitante, inclusive o aluno.
- **Correção:**
  - telas profissionais com `React.lazy` (`paginas-sob-demanda.tsx`) e `Suspense` no layout e na raiz;
  - detecção de fórmulas em módulo leve (`formulas-texto.ts`) e KaTeX importado só quando há fórmula (`TextoRico`); enquanto carrega, aparece o próprio LaTeX.

  O pacote inicial caiu para 330 KB, mais 144 KB de componentes compartilhados.
- **Testes:** `TextoRico.test.tsx` e o teste da execução esperam o MathML de forma assíncrona.
- **Arquivos:** `apps/web/src/rotas.tsx`, `paginas-sob-demanda.tsx`, `main.tsx`, `layouts/LayoutProfissional.tsx`, `componentes/TextoRico.tsx`, `util/formulas*.ts`

