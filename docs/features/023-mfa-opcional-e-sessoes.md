# 023 — Verificação em duas etapas opcional, MFA exigido por prova e sessões abertas

- **Status:** Concluída (MVP)
- **Sprint:** 7 (lote 6) · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF01, RF05, RNF05 · **ADRs:** [0034](../adr/0034-mfa-opcional-e-sessoes.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Aluno/Professor | *Minha conta → Ativar* → lê o QR code → digita o código | MFA ativo; outras sessões encerradas; próximo login pede o código |
| 2 | Aluno | Inicia prova com *Exigir verificação em duas etapas* sem MFA | 409 com orientação para ativar em *Minha conta* |
| 3 | Aluno | Desativa com senha + código | MFA desligado (auditado `MFA_DESATIVADO`) |
| 4 | Admin/Coord. | Tenta desativar | 409 — obrigatório para o papel |
| 5 | Qualquer | *Minha conta → Sessões abertas* → Encerrar | A sessão perde o acesso em até 30 s |
| 6 | Qualquer | *Encerrar as outras N sessões* | Só a atual continua |

## Interface

`GET /minha-conta/mfa`, `POST /minha-conta/mfa/iniciar|confirmar|desativar`, `GET /minha-conta/sessoes`,
`DELETE /minha-conta/sessoes/:id`, `POST /minha-conta/sessoes/encerrar-outras`. Confirmar/desativar
usam o limite de credenciais (10/min por IP+identificador). Prova: campo `exigeMfa` (só privada).

## Funcionamento adicional

Limpeza automática a cada 6 h de sessões expiradas/revogadas há mais de 30 dias.

## Testes

`test/acesso-e-conta.e2e-spec.ts` (MFA opcional + prova com `exigeMfa` + desativação; sessões),
`e2e/recursos-avancados.spec.ts` (cartões em *Minha conta*).

## Pendências e limitações

- [ ] Step-up (pedir o código de novo no início da prova).
- [x] Códigos de recuperação do MFA — lote 7, [029](029-email-e-recuperacao-de-conta.md).
