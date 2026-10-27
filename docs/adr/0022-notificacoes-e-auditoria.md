# ADR-0022: Notificações in-app e auditoria imutável

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A / Dev B
- **Requisitos relacionados:** RF10, RF11, RF01 (notificar titular no bloqueio)

## Decisão

**Notificações (RF10)** — schema `notificacoes`, tabela única por usuário (tipo, título,
mensagem, link, lida). Eventos: prova disponível (aplicação criada para a turma), resultado
publicado (nota consolidada), recurso aberto (para o autor da prova), recurso decidido, nota
reprocessada (anulação), conta bloqueada (titular), tentativa reaberta. O frontend consulta a
cada 60 s (sino na barra superior). Falha ao notificar **nunca** desfaz a operação de negócio.
E-mail/push continuam fora do MVP.

**Auditoria (RF11)** — schema `auditoria`, tabela `eventos` (quem, ação, recurso, id,
justificativa, dados, IP, quando). **Imutável no banco**: triggers `BEFORE UPDATE OR DELETE` e
`BEFORE TRUNCATE` levantam exceção — nem a própria aplicação consegue alterar. Eventos
registrados: login, falha de login, bloqueio, MFA ativado, troca de senha, usuário criado,
questão publicada/rejeitada/arquivada/nova versão, turma criada, matrícula/desvínculo,
importação CSV, prova publicada/arquivada, aplicação criada/encerrada, tentativa
iniciada/enviada/expirada/reaberta, correção manual, recurso aberto/deferido/indeferido.
Consulta só para Administrador (`/app/auditoria`).

## Consequências

- Os testes e2e não truncam `auditoria.eventos` (o trigger impede); os testes não dependem dela vazia.
- PENDENTE: retenção/arquivamento da trilha e exportação; assinatura encadeada (hash) se for
  exigida prova de integridade para terceiros.
