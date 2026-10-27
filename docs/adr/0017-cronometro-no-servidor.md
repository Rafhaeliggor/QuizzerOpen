# ADR-0017: Cronômetro com prazo persistido no PostgreSQL (e não no Redis)

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A / Dev B
- **Requisitos relacionados:** RF06, RNF03, RN-40; plano Dev B Sprint 3 ("cronômetro server-side via Redis")

## Contexto

O plano previa o cronômetro "via Redis". O requisito real (RNF03) é: tempo calculado no
servidor, sem pausa em desconexão, envio automático das respostas salvas ao expirar e
reabertura apenas administrativa.

## Decisão

- Ao iniciar a tentativa, o servidor grava **`prazo_em = min(início + tempo limite, fim da janela)`**
  em `aplicacao.tentativas`. Esse campo é a **única fonte da verdade** do tempo.
- O cliente recebe `prazoEm` e o horário do servidor (`agora`) e só **exibe** a contagem,
  corrigindo a diferença de relógio. Nada que o cliente envie altera o prazo.
- Toda escrita (autosave, envio) é validada contra `prazo_em` com **tolerância de 10 s**
  para latência de rede. Após isso, a resposta é `409 TENTATIVA_ENCERRADA`.
- **Expiração**: (1) preguiçosa — qualquer leitura/escrita de uma tentativa vencida a finaliza
  como `EXPIRADA`; (2) **varredura a cada 30 s** (`ExecucaoService.finalizarExpiradas`) para que
  notas e relatórios não dependam de o aluno voltar. A finalização é idempotente
  (`UPDATE ... WHERE status IN (EM_ANDAMENTO, REABERTA)`), então varredura, envio manual e
  duplo clique nunca geram dois registros.
- **Reabertura** (Admin/Coordenador, justificativa obrigatória e auditada): status `REABERTA`,
  novo prazo = agora + N minutos, resultado anterior descartado.
- O **Redis não é usado** para o cronômetro.

## Alternativas consideradas

- **Prazo no Redis com TTL** — mais rápido de consultar, mas volátil: um restart do Redis
  apagaria prazos em andamento, e o PostgreSQL já é consultado em toda operação da tentativa.
  Pode voltar como cache se a carga exigir (teste de carga, Sprint 4).

## Consequências

- Resiliente a queda de conexão e a reinício da API (a varredura retoma de onde parou).
- A varredura roda em cada instância da API; com mais de uma réplica, a idempotência evita
  duplicidade, mas o trabalho é repetido — aceitável no MVP.
