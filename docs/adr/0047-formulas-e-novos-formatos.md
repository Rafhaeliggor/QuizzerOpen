# ADR-0047: Fórmulas (LaTeX → MathML), várias corretas e resposta numérica

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A, Dev C
- **Requisitos relacionados:** RF04, RF06, RF07

## Decisão

- **Fórmulas:** LaTeX entre `\( … \)` (na linha) e `\[ … \]` (destaque) em enunciados e
  alternativas. **Não** usamos `$` (conflita com "R$"). O KaTeX (versão fixa, com mais de duas
  semanas) gera **MathML** — sem estilos inline (CSP `style-src 'self'` continua), renderizado pelo
  navegador; `trust: false`, `maxExpand`/`maxSize` baixos. É a **única** marcação injetada no app
  (`dangerouslySetInnerHTML` restrito ao `TextoRico`); o texto ao redor é texto puro do React. O
  editor mostra a pré-visualização. O banco guarda o LaTeX (o snapshot também).
- **Várias corretas** (`MULTIPLA_RESPOSTA`): fração = (corretas marcadas − incorretas marcadas) ÷
  total de corretas, mínimo 0 — marcar tudo não compensa. Alternativas embaralhadas como na
  múltipla escolha.
- **Resposta numérica** (`RESPOSTA_NUMERICA`): valor + tolerância absoluta; a resposta aceita vírgula
  ou ponto ("3,14", "1.234,5"). A mesma leitura de número existe na API e na tela.
- Snapshot da correção passou a guardar as **mídias** (resultado do aluno e tela de correção as exibem).
- **Prova com versão antiga:** o detalhe da prova avisa quando uma questão tem versão mais nova; em
  rascunho, *Usar as versões mais novas* troca mantendo ordem e pesos.
