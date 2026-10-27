# ADR-0034: MFA opcional para todos, MFA exigido por prova e autoatendimento de sessões

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos relacionados:** RF01, RF05 ("verificação extra para certificar"), RNF05 ("MFA escalonável por criticidade")

## Decisão

- **Qualquer usuário** (inclusive aluno) pode ativar a verificação em duas etapas em *Minha conta*
  (`/minha-conta/mfa/iniciar` → QR code → `/confirmar` com um código). Ao confirmar, as **outras
  sessões são encerradas** (foram abertas sem o segundo fator). Desativar exige **senha + código**;
  papéis com MFA obrigatório (Admin/Coord — ADR-0007) não desativam.
- O login já pedia o código para quem tem `mfaHabilitado` — vale para os dois ambientes.
- **Escalonamento por criticidade:** a prova tem `exigeMfa`. O aluno sem MFA ativo recebe
  `409 MFA_NECESSARIO` ao iniciar. Só em prova **privada** (a pública não tem login).
- **Sessões:** *Minha conta* lista as sessões ativas (navegador/SO aproximados pelo User-Agent, IP,
  início, último uso), encerra uma, ou todas as outras. Efeito em até 30 s (ADR-0027).
- **Limpeza:** a cada 6 h a API apaga sessões expiradas ou revogadas há mais de 30 dias (o histórico
  de login permanece na auditoria).

## Alternativas consideradas

- **Step-up (pedir o código de novo ao iniciar a prova)** — mais forte, porém mais um fluxo de token;
  com MFA no login e sessão curta o ganho é pequeno no MVP. Fica como evolução.
- **SMS/e-mail** — sem provedor no MVP (🚫).
