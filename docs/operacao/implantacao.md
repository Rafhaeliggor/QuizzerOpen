# Roteiro de implantação em produção

Passo a passo para colocar o Quizzer no ar para uso real. Execute na ordem; cada etapa tem uma
verificação. Ao final, `infra/vps/verificar-producao.sh` precisa terminar **sem ❌**.

> Ambiente de homologação (com o seed e as contas `@quizzer.local`) **não** deve virar produção.
> Comece de um servidor/volume limpo.

## 1. Servidor

```bash
# Como root, numa sessão SSH que você NÃO vai fechar até validar o novo acesso:
cat ~/.ssh/id_ed25519.pub   # chave da equipe → /home/quizzer/.ssh/authorized_keys no VPS
sudo DEPLOY_USER=quizzer HTTP_PORT=80 bash infra/vps/provisionar.sh
sudo ufw allow 443/tcp comment 'Quizzer HTTPS'
```

Verifique: novo login `ssh quizzer@<IP>` funciona por chave; `sudo ufw status` ativo.

## 2. Código e configuração

```bash
git clone <repositório> /opt/quizzer && cd /opt/quizzer
cp .env.example .env && chmod 600 .env
# Preencha POSTGRES_PASSWORD, REDIS_PASSWORD (openssl rand -hex 32),
# JWT_ACCESS_SECRET (openssl rand -base64 48), MFA_ENCRYPTION_KEY (openssl rand -base64 32).
```

## 3. Subir a aplicação (ainda em HTTP)

```bash
docker compose up -d --build
docker compose ps            # todos healthy
curl -s http://localhost/api/v1/health
```

## 4. HTTPS

- **Com domínio** (recomendado): DNS do domínio apontando para o IP do VPS, então
  `infra/tls/ativar-letsencrypt.sh <dominio> <email> --staging` (ensaio) e depois sem `--staging`.
  Use `--sem-email` no lugar do e-mail para não registrar e-mail na conta ACME. Sem domínio ainda,
  `<ip-com-hífens>.sslip.io` dá um certificado válido provisório ([ADR-0056](../adr/0056-dominio-sslip-sem-dominio-proprio.md)).
- **Sem domínio ainda:** `infra/tls/gerar-autoassinado.sh <IP>` (cifrado, com aviso no navegador).

Verifique: `curl -I http://<host>` responde 301 para https; a página abre com cadeado.
Detalhes: [feature 017](../features/017-https.md).

## 5. Primeiro administrador

```bash
docker compose run --rm migrate npx tsx prisma/criar-admin.ts --nome "Nome" --email admin@instituicao.edu.br
```

Entre em `/login`, troque a senha e cadastre o app autenticador. Crie um **segundo administrador**
pela tela *Usuários* (um atende o outro em reset de MFA e LGPD).

## 6. Backups fora do servidor

```bash
infra/backup/gerar-chave.sh ~/quizzer-backup.key   # chave privada → cofre da TI, fora do VPS
docker run --rm -it -v "$PWD/infra/backup/rclone:/config/rclone" rclone/rclone config   # remoto "offsite"
# .env: BACKUP_AGE_DESTINATARIO, BACKUP_RCLONE_DESTINO=offsite:<bucket>, BACKUP_WEBHOOK_FALHA
docker compose up -d --build backup
docker compose run --rm --entrypoint sh backup /scripts/backup.sh
```

Cada rodada gera **dois arquivos**: o banco (`quizzer-<data>.dump.age`) e as imagens/áudios das
questões (`midias-<data>.tar.gz.age`, volume `midias`). Ambos vão para a cópia externa.

Faça uma **restauração de teste a partir da cópia externa** — e repita todo mês (o monitor cobra
depois de 35 dias). Traga a chave privada só para o teste e apague em seguida:

```bash
scp chave-do-cofre.key vps:/tmp/qz.key
sudo infra/backup/testar-copia-externa.sh --chave /tmp/qz.key && shred -u /tmp/qz.key
```

O script baixa o último backup do remoto, restaura em `quizzer_restaurado` (o banco em uso não é
tocado), confere as contagens e as mídias, apaga o banco de conferência e grava o resultado em
`backups/.restauracao.json` ([feature 038](../features/038-metricas-logs-e-teste-de-restauracao.md)).
Restauração de um arquivo local: `infra/backup/restaurar.sh <arquivo> --chave <chave>`.
Mídias (desastre): `infra/backup/restaurar.sh backups/midias-<data>.tar.gz.age --chave <chave>`
(pede confirmação; acrescenta/substitui arquivos no volume).
Detalhes: [feature 018](../features/018-backup-externo.md).

### Monitor e alertas

Com `BACKUP_WEBHOOK_FALHA` (ou `MONITOR_WEBHOOK`) preenchido, o serviço `monitor` avisa no canal da
equipe quando API/Nginx param, a API devolve mais de 5% de erros 5xx ou fica lenta (p95 > 2 s), o
certificado vence em < 14 dias, o backup atrasa, o teste de restauração vence ou o disco passa de
90% — e avisa quando resolve ([feature 026](../features/026-monitoramento-e-manutencao.md),
[038](../features/038-metricas-logs-e-teste-de-restauracao.md)). Limites ajustáveis no `.env`
(`MONITOR_5XX_PCT`, `MONITOR_P95_MS`, `MONITOR_RESTAURACAO_DIAS`).
Ligue também o **monitor externo** (variável `URL_PRODUCAO` no GitHub — seção *GitHub Actions*
abaixo): se o VPS inteiro cair, o monitor interno cai junto.

### Logs centralizados (opcional)

```bash
# .env
COMPOSE_FILE=docker-compose.yml:docker-compose.logs.yml
LOGS_LOKI_URL=https://loki.instituicao.edu.br        # ou LOGS_ENCAMINHAR_HTTP (+ LOGS_ENCAMINHAR_TOKEN)
docker compose up -d                                  # recria os serviços com o novo driver de log
ls logs/$(date -u +%F)/                               # api.log, nginx.log, postgres.log…
```

Sem destino externo, os logs ficam em `logs/` por 30 dias (`LOGS_RETENCAO_DIAS`); com destino, uma
cópia sai do VPS. `docker compose logs` continua funcionando ([ADR-0054](../adr/0054-metricas-logs-centralizados-e-teste-de-restauracao.md)).

### E-mail (opcional)

Para *Esqueci minha senha*, convites e cópia das notificações: preencha no `.env` `SMTP_HOST`,
`SMTP_PORTA` (587 com STARTTLS ou 465 com `SMTP_SEGURO=true`), `SMTP_USUARIO`, `SMTP_SENHA`,
`EMAIL_REMETENTE` (domínio com SPF/DKIM da instituição) e `APP_URL=https://<dominio>`; depois
`docker compose up -d api`. A API sai para o SMTP pela rede `egress-net` ([ADR-0041](../adr/0041-email-opcional-e-recuperacao-de-senha.md)).

## 7. Privacidade (LGPD)

Revise com o encarregado de dados (DPO) o texto de `apps/web/src/paginas/Privacidade.tsx`,
preencha os campos `[entre colchetes]`, reconstrua (`docker compose up -d --build nginx`).

## 8. Verificação final

```bash
sudo bash infra/vps/verificar-producao.sh
```

Resolva todos os ❌. Os ⚠️ devem ter justificativa registrada.

### Teste de carga antes de liberar

Rode **de outra máquina** (o gerador no próprio VPS disputaria CPU com a API), antes de abrir para
os alunos:

1. Como administrador, crie um professor de teste (ex.: `carga.professor@<dominio-da-instituição>`)
   e, com ele, uma prova curta publicada (ex.: "Prova de carga", 5 questões objetivas). Professor
   não exige MFA, e o script não faz MFA.
2. Na máquina de teste (Node 24+, com o repositório):
   ```bash
   npm run test:carga -- --base https://<dominio> --professor carga.professor@… --senha '…' \
     --prova "Prova de carga" --alunos 40
   ```
   Critérios: zero erros e p95 de cada etapa abaixo de 2 s (o relatório imprime por etapa). Durante
   o teste, o `monitor` registra `metricas … p95=…` no log — confira que não alertou 5xx. Com
   certificado autoassinado, acrescente `NODE_TLS_REJECT_UNAUTHORIZED=0` antes do comando.
3. No VPS: `testes/carga/limpar-dados-carga.sh` (remove turma e alunos `carga.*@quizzer.local`),
   desative o professor de teste e a prova, e rode de novo o verificador — ele acusa ❌ se
   sobrar conta `@quizzer.local`.

## Operação contínua

| Tarefa | Frequência | Como |
|---|---|---|
| Conferir saúde dos serviços | contínua (alerta) / semanal (olhar) | webhook do `monitor`; `docker compose ps` |
| PRs do Dependabot e e-mail do workflow *Segurança* | semanal | revisar, CI verde, merge, `docker compose up -d --build` |
| Bateria de testes completa | antes de cada atualização | `testes/testar-tudo.sh` em homologação |
| Restauração de teste | mensal (o monitor cobra após 35 dias) | `infra/backup/testar-copia-externa.sh --chave …` |
| Logs (se centralizados) | sob demanda | `logs/<data>/<serviço>.log` ou o destino externo |
| Atualizações de segurança | automática (SO) / mensal (imagens) | `unattended-upgrades`; `docker compose pull && up -d --build` |
| Solicitações LGPD | até 15 dias | tela *LGPD* (o sino avisa) |
| Auditoria | sob demanda | tela *Auditoria* |

## Rotação da chave do MFA

```bash
NOVA=$(openssl rand -base64 32)        # guarde no cofre da TI
docker compose run --rm -e MFA_ENCRYPTION_KEY_NOVA="$NOVA" migrate npx tsx prisma/rotacionar-chave-mfa.ts --simular
docker compose stop api
docker compose run --rm -e MFA_ENCRYPTION_KEY_NOVA="$NOVA" migrate npx tsx prisma/rotacionar-chave-mfa.ts
# .env: MFA_ENCRYPTION_KEY=$NOVA  →  docker compose up -d
```

Nada é gravado se algum segredo não abrir com a chave atual ([ADR-0042](../adr/0042-codigos-de-recuperacao-e-rotacao-da-chave-mfa.md)).

## GitHub Actions: uptime externo e deploy

- **Uptime:** em *Settings → Variables*, crie `URL_PRODUCAO=https://<dominio>`. O workflow *Uptime*
  verifica a cada 15 min e falha (e-mail do GitHub) se o sistema ou o certificado tiver problema.
- **Deploy:** crie o *environment* `producao` (com aprovação obrigatória, se quiser) e os segredos
  `VPS_HOST`, `VPS_USUARIO`, `VPS_CHAVE_SSH` (chave dedicada) e `VPS_HOST_FINGERPRINT`
  (`ssh-keyscan <host>`, conferido pessoalmente); variável `VPS_PASTA` se não for `/opt/quizzer`.
  Depois: *Actions → Deploy → Run workflow → DEPLOY*. O deploy só roda da `main` com CI verde
  ([ADR-0046](../adr/0046-uptime-externo-e-deploy-manual.md)).

## Integração com o sistema acadêmico

Veja o [guia de integração](integracao.md). Crie a chave em *Integrações* (Administrador) e entregue
à TI do sistema acadêmico por canal seguro.

## Retenção de dados de externos (LGPD)

Com a definição do DPO, configure `RETENCAO_EXTERNOS_DIAS` no `.env` (ex.: `365`) e reinicie a API.
A anonimização roda uma vez por dia ([ADR-0052](../adr/0052-lgpd-correcao-e-retencao.md)).
