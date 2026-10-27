# ADR-0060: Termos de Uso, Política de Privacidade e aceite obrigatório

- **Status:** Aceito
- **Data:** 2026-10-27
- **Responsável:** Dev A, Dev C
- **Requisitos relacionados:** RNF05 (LGPD); substitui em parte o [ADR-0043](0043-ciencia-da-politica-de-privacidade.md)

## Contexto

Até aqui havia só uma política de privacidade curta, com campos `[entre colchetes]`, e um aviso pós-login que podia ser adiado ("Agora não"). O usuário pediu duas coisas:

- **Termos de Uso** e **Política de Privacidade** com base na legislação brasileira vigente;
- uma **página de consentimento** obrigatória no primeiro acesso de quem ainda não aceitou.

Ele também pediu uma **cópia em `docs/` que acompanhe sempre o texto exibido**.

## Decisão

- **Textos com base em:**
  - LGPD (Lei 13.709/2018): arts. 7º, 9º, 14, 16, 18, 33, 46 e 48;
  - Marco Civil da Internet (Lei 12.965/2014): arts. 7º e 15, além do Decreto 8.771/2016;
  - Código Civil, Lei de Direitos Autorais (9.610/1998), CDC (8.078/1990, quando houver relação de consumo) e ECA (8.069/1990).

  Os textos descrevem o que o sistema faz de fato: dados coletados, retenções configuradas, cookie `HttpOnly` de sessão, `localStorage`, criptografia e trilha de auditoria.
- **Base legal ≠ consentimento.** O tratamento acadêmico se apoia em execução de contrato, obrigação legal, exercício regular de direitos e legítimo interesse (art. 7º, II, V, VI e IX). Por isso, a página pede **aceite dos Termos de Uso** e **ciência da Política** (art. 9º), em duas caixas de marcação separadas. A política explica essa diferença. Tratar o aceite como "consentimento" (art. 7º, I) seria frágil: o consentimento pode ser revogado a qualquer momento e travaria o registro acadêmico.
- **Fonte única no app:** `apps/web/src/legal/documentos.ts` (estrutura tipada, sem HTML). `docs/legal/*.md` é **gerado** dali (`npm run legal:sincronizar -w @quizzer/web`). O teste `src/legal/documentos.test.ts` falha se:
  - a cópia em `docs/legal/` divergir do texto exibido;
  - `POLITICA_VERSAO` (API `env.ts`, `docker-compose.yml`, `.env.example` e seed) for diferente de `VERSAO_DOCUMENTOS_LEGAIS`.
- **Aceite bloqueante:** `LayoutProfissional` e `LayoutAluno` desviam para `/app/aceite-termos` ou `/aluno/aceite-termos` enquanto `politicaPendente` for verdadeiro, guardando a rota de origem. A página mostra os dois textos e só libera "Aceitar e continuar" com as duas marcações. "Sair sem aceitar" encerra a sessão. A **execução da prova continua fora dos layouts** e nunca é interrompida por uma troca de versão no meio da prova.
- **API:** `POST /minha-conta/politica/aceitar` recebe `{ versao }`, a versão que o usuário leu. Se ela não for a vigente, a API responde **409** e não registra. Assim, um frontend em cache não grava aceite de texto antigo. O registro continua em `politicaAceitaEm`/`politicaVersao` e na auditoria (`POLITICA_ACEITA`), sem migração.
- **Provas públicas:** o formulário do PIN informa que, ao iniciar, o participante aceita os Termos e declara ciência da Política, com links.
- **Personalização:** `{instituicao}` vem de `NOME_INSTITUICAO`. `{contatoEncarregado}` vem do novo `CONTATO_ENCARREGADO`, embutido no build do frontend. Sem ele, o texto remete aos canais oficiais da instituição.

## Consequências

- Mudar um tópico exige três passos: editar `documentos.ts`, trocar a versão nos dois lados e rodar a sincronização. O teste unitário impede publicar com a cópia ou a versão divergentes.
- Uma versão nova leva todos os usuários de volta à página de aceite no próximo acesso. As contas de demonstração são remarcadas pelo seed, que `testar-tudo.sh` reaplica.
- Os textos são uma base técnica fiel ao sistema, **não um parecer jurídico**: devem ser revisados pelo DPO e pelo jurídico da instituição antes do uso real. Prazos de guarda do acervo acadêmico e fornecedores (hospedagem, e-mail) dependem de contratos da instituição.
