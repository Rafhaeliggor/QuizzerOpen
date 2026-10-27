# 040 — Termos de Uso, Política de Privacidade e aceite obrigatório

- **Status:** Concluída (revisão jurídica pendente)
- **Sprint:** além do plano (2026-10-27) · **Responsável:** Dev A, Dev C
- **Requisitos:** RNF05 (LGPD) · **ADRs:** [ADR-0060](../adr/0060-termos-de-uso-e-aceite-obrigatorio.md) (substitui em parte o ADR-0043)

## Objetivo

Publicar os Termos de Uso e a Política de Privacidade com base na legislação brasileira vigente e exigir o aceite de quem ainda não aceitou a versão atual, já no primeiro login. Manter em `docs/legal/` uma cópia sempre igual ao texto exibido.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Aluno ou profissional | Primeiro login (ou primeiro acesso após uma versão nova) | Vai para a página de aceite antes de qualquer tela; depois de aceitar, volta para a página que tentava abrir |
| 2 | Usuário | Tenta aceitar sem marcar as duas opções | "Aceitar e continuar" fica desabilitado |
| 3 | Usuário | Não quer aceitar | "Sair sem aceitar" encerra a sessão |
| 4 | Aluno | A versão muda durante uma prova | A prova continua; o aceite é pedido ao voltar ao painel |
| 5 | Usuário | Aba antiga envia o aceite de uma versão anterior | A API recusa com 409 e pede para recarregar |
| 6 | Participante de prova pública | Informa nome e e-mail | Vê o aviso de que, ao iniciar, aceita os Termos, com links para os dois textos |
| 7 | Qualquer pessoa | Abre `/termos` ou `/privacidade` (rodapé do login) | Lê o texto completo sem login |
| 8 | Implantação | Muda um tópico | Segue o passo a passo de [docs/legal/README.md](../legal/README.md); o teste impede cópia ou versão divergente |

## Funcionamento

- **Textos:** `apps/web/src/legal/documentos.ts` (`TERMOS_DE_USO`, `POLITICA_DE_PRIVACIDADE`, `VERSAO_DOCUMENTOS_LEGAIS`), exibidos por `TextoLegal.tsx`. As páginas ficam em `paginas/Legal.tsx`: `PaginaTermos`, `PaginaPrivacidade` e `AceiteTermos`.
- **Cópia:** `docs/legal/*.md`, gerada por `paraMarkdown` com `npm run legal:sincronizar -w @quizzer/web`.
- **Desvio para o aceite:** `useDesvioAceite` (`auth/DesvioAceite.tsx`) nos dois layouts; rotas `/app/aceite-termos` e `/aluno/aceite-termos`.
- **API:** `POST /minha-conta/politica/aceitar` com `{ versao }`. Uma versão diferente de `POLITICA_VERSAO` recebe 409. O aceite fica em `politicaAceitaEm`/`politicaVersao` e é auditado (`POLITICA_ACEITA`).
- **Configuração nova:** `CONTATO_ENCARREGADO` (build do frontend), usado em `{contatoEncarregado}`.
- **Removidos:** o aviso adiável `AvisoPolitica` e a página antiga `Privacidade.tsx` (AJ-118).

## Testes

- Unitários: `src/legal/documentos.test.ts`. Ele verifica se a cópia em `docs/legal` está sincronizada, se as versões são iguais na API, no compose, no `.env.example` e no seed, e se não sobrou marcador desconhecido.
- API e2e: `test/conta-e-recuperacao.e2e-spec.ts`. Ele confere a pendência, a recusa (409) de versão desatualizada e o aceite auditado.
- Navegador: `e2e/recursos-avancados.spec.ts`, teste "termos: …". Ele confere as páginas públicas, o desvio após o login, as abas, as duas marcações e o retorno à rota de origem. A pendência é simulada na resposta de `/auth`, sem alterar o seed.

## Pendências

- **Revisão pelo DPO e pelo jurídico** antes do uso real: prazos de guarda do acervo acadêmico, fornecedores (hospedagem e e-mail), foro e eventual transferência internacional.
- Definir `CONTATO_ENCARREGADO` na implantação.
- A homologação pública só exibe os textos novos depois de reconstruir a API e o frontend. A partir daí, as contas que não forem remarcadas pelo seed passam pela página de aceite.
