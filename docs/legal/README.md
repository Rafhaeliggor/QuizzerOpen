# Termos de Uso e Política de Privacidade — cópia sincronizada

Estes arquivos são a **cópia em documentação** dos textos exibidos no sistema (ADR-0060):

- [termos-de-uso.md](termos-de-uso.md), exibido em `/termos`;
- [politica-de-privacidade.md](politica-de-privacidade.md), exibido em `/privacidade` e na página de aceite.

**Não edite estes `.md` à mão.** A fonte é `apps/web/src/legal/documentos.ts`. O teste
`apps/web/src/legal/documentos.test.ts` falha se esta pasta ficar diferente do que o sistema exibe.

## Como mudar um tópico

1. Edite `apps/web/src/legal/documentos.ts`.
2. Troque `VERSAO_DOCUMENTOS_LEGAIS` (data da nova versão) **e** `POLITICA_VERSAO` com o mesmo valor em
   `apps/api/src/config/env.ts`, `docker-compose.yml`, `.env.example`, `apps/api/prisma/seed.ts` e no `.env` do servidor.
3. Rode `npm run legal:sincronizar -w @quizzer/web` para regravar esta pasta.
4. Reconstrua a API e o frontend. No próximo acesso, todos passam de novo pela página de aceite.

Os marcadores `{instituicao}` e `{contatoEncarregado}` são preenchidos no build (`NOME_INSTITUICAO` e
`CONTATO_ENCARREGADO` no `.env`).

> Os textos foram redigidos com base na legislação brasileira vigente (LGPD, Marco Civil da Internet e
> seu decreto, Código Civil, Lei de Direitos Autorais, CDC e ECA) e no funcionamento real do sistema.
> **Não são um parecer jurídico.** Antes do uso real, o DPO e o jurídico da instituição devem revisá-los,
> em especial os prazos de guarda do acervo acadêmico, os fornecedores (hospedagem e e-mail) e o foro.
