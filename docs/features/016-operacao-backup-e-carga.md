# 016 — Operação: backup, restauração e teste de carga

- **Status:** Concluída com pendências
- **Sprint:** 5 (fechamento do plano) · **Responsável:** Dev B
- **Requisitos:** RNF03, RNF05 · **ADRs:** [0025](../adr/0025-backup-automatizado.md), [0023](../adr/0023-parametros-argon2-owasp.md), [0026](../adr/0026-testes-de-navegador-carga-e-supply-chain.md)

## Backup

Serviço `backup` do Compose: um `pg_dump` ao subir e a cada 24 h, verificado e com retenção de 7 dias.

| Variável (`.env`) | Padrão | |
|---|---|---|
| `BACKUP_DIR` | `./backups` | pasta no host (permissão 700/600) |
| `BACKUP_INTERVALO_HORAS` | 24 | |
| `BACKUP_RETENCAO_DIAS` | 7 | |

```bash
docker compose logs backup                       # {"level":"info","msg":"backup concluído: quizzer-…dump (60K)"}
docker compose run --rm backup sh /scripts/backup.sh   # backup sob demanda
```

## Restauração

```bash
# Conferência (padrão, não toca no banco em uso): restaura em quizzer_restaurado
infra/backup/restaurar.sh backups/quizzer-20261010T185629Z.dump

# Desastre: substitui o banco em uso
docker compose stop api nginx
infra/backup/restaurar.sh backups/<arquivo>.dump --sobrescrever   # pede para digitar RESTAURAR
docker compose up -d
```

Testado: contagens de usuários, questões, provas, tentativas, notas e eventos de auditoria
idênticas à origem; trigger de imutabilidade da auditoria preservado.

## Teste de carga

```bash
node testes/carga/turma-simultanea.mjs --base http://127.0.0.1:8080 --senha '<senha do seed>' --alunos 40
```

Cria uma turma com N alunos (CSV), aplica a prova do seed e dispara todos ao mesmo tempo, do
mesmo IP: login → troca da senha temporária → listar → iniciar → carregar → abrir sessão →
8 autosaves → enviar. Roda no CI (40 alunos) e falha se algum aluno falhar.

**Resultados** (VPS de desenvolvimento: 2 vCPUs, 7,7 GB; gerador de carga na mesma máquina, o que infla as latências):

| Cenário | Concluíram | Tempo total | Vazão | Login p95 | Troca senha p95 | Autosave p95 | Envio p95 |
|---|---|---|---|---|---|---|---|
| 40 alunos — Argon2 padrão (antes) | 40/40 | 15,1 s | 40 req/s | 11,8 s | 7,7 s | 643 ms | 1,3 s |
| 40 alunos — Argon2 OWASP (depois) | 40/40 | 5,9 s | 101 req/s | 2,8 s | 1,6 s | 268 ms | 778 ms |
| 100 alunos — Argon2 OWASP | 100/100 | 12,1 s | 124 req/s | 2,8 s | 5,2 s | 490 ms | 1,2 s |

Memória da API no pico do cenário de 100 alunos: ~250 MB. O gargalo restante é CPU no hash de
senha (login/troca), que só ocorre no início; durante a prova as operações ficam abaixo de 0,5 s (p95).
Após os testes, os dados criados foram removidos do banco de demonstração.

## Pendências

- [x] ~~Cópia externa, criptografia e alerta de falha~~ — [feature 018](018-backup-externo.md).
- [x] Monitor interno (lote 6) e externo pelo GitHub Actions (lote 7).
- [x] Centralização de logs — lote 9, [038](038-metricas-logs-e-teste-de-restauracao.md).
- [ ] Repetir o teste de carga no VPS de produção, com o gerador em outra máquina — procedimento pronto em [operacao/implantacao.md](../operacao/implantacao.md) (passo "Teste de carga antes de liberar"); execução depende do VPS.
- [x] Limpeza automática dos dados do teste de carga (`testes/carga/limpar-dados-carga.sh`, chamada pela bateria — [027](027-bateria-de-testes.md)).
