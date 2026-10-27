# ADR-0020: Participante externo de prova pública

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A / Dev C
- **Requisitos relacionados:** RF05 (resultado não certificado), RF06 passo 1, RNF05

## Decisão

- Prova pública é acessada por `/p/<PIN>` (ou digitando o PIN em `/p`) com **nome e e-mail**.
  Não há conta: o servidor emite um **token de participante** (JWT, `aud=quizzer-participante`,
  `sub=tentativaId`) válido até 2 h após o prazo, aceito **somente** nas rotas `/publico/tentativas/:id`.
- O token fica no **`sessionStorage`** da aba (exceção consciente à regra "token só em memória"
  do ADR-0006): sem conta e sem cookie de sessão, perder o token num recarregamento faria o
  participante perder a prova. O escopo é uma única tentativa.
- Uma instância por (aplicação, e-mail). Se já há tentativa **em andamento** para o e-mail, um
  novo início é **recusado** (evita que alguém que sabe o e-mail e o PIN "sequestre" a prova);
  o participante deve continuar na aba original.
- Notas de participantes externos ficam com `certificado = false`; o comprovante mostra o
  resultado imediatamente quando a prova só tem questões fechadas.

## Consequências

- Participante que fecha a aba no meio da prova não consegue retomar até o prazo expirar
  (a tentativa é enviada automaticamente com o que foi salvo). Aceitável para provas não certificadas.
- PENDENTE: verificação extra configurável pela instituição para certificar provas públicas (RF05).
