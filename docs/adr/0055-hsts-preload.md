# ADR-0055: HSTS preload — opcional e desligado por padrão

- **Status:** Aceito
- **Data:** 2026-10-19
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF05; pendência da feature 017 ("avaliar HSTS preload")

## Contexto

O Nginx e a API enviam `Strict-Transport-Security: max-age=31536000; includeSubDomains` sempre que o acesso é por HTTPS (ADR-0029). A feature 017 deixou pendente a avaliação de acrescentar `preload`, que inscreve o domínio na lista embutida nos navegadores. Com isso, o navegador nunca tenta HTTP, nem no primeiro acesso.

Três fatos pesam na decisão:

- A lista ([hstspreload.org](https://hstspreload.org)) só aceita **domínios registráveis**, como `instituicao.edu.br`, e não subdomínios como `provas.instituicao.edu.br`. A inscrição vale para **todos** os subdomínios.
- Sair da lista leva meses, porque depende de novas versões dos navegadores.
- O mais provável é que o Quizzer seja publicado num subdomínio da instituição.

## Decisão

- **Padrão: sem `preload`.** Num subdomínio, o `preload` do Quizzer não tem efeito. A decisão cabe à TI da instituição, para o domínio principal, junto com todos os outros sistemas dela.
- **Opção `HSTS_PRELOAD=true`** para o caso de o Quizzer ter domínio próprio registrável. Ela acrescenta `; preload` ao cabeçalho do Nginx e ao da API (helmet). Os dois precisam ser iguais, porque o navegador guarda o último cabeçalho que recebeu.
- **Critérios para ligar:** domínio próprio, HTTPS estável há pelo menos um mês, nenhum subdomínio servido só em HTTP e decisão registrada da instituição. A inscrição em hstspreload.org é feita à parte, por quem administra o domínio.
- O verificador de produção mostra ⚠️ quando `HSTS_PRELOAD=true`, para lembrar a conferência.

## Consequências

- A pendência da feature 017 fica fechada como decisão: não se aplica ao cenário provável, e há um mecanismo pronto para o caso de domínio próprio.
- Nenhuma mudança de comportamento com a configuração padrão.
