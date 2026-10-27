# ADR-0056: Certificado válido sem domínio próprio (sslip.io + Let's Encrypt)

- **Status:** Aceito
- **Data:** 2026-10-20
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF05 (criptografia em trânsito); feature 017

## Contexto

O servidor de homologação passou a ser acessado publicamente pelo IP público do servidor (nos exemplos, `203.0.113.10`). Com o certificado autoassinado (ADR-0029), todo navegador mostra "conexão não segura". A instituição ainda não tem um domínio para o sistema, e o Let's Encrypt não emite, pelo fluxo usado no projeto (certbot com webroot), certificado para IP.

## Decisão

- Usar o nome **`203-0-113-10.sslip.io`**. O sslip.io é um DNS público e gratuito que responde com o próprio IP escrito no nome, sem cadastro. O certificado é do **Let's Encrypt**, emitido pelo mesmo `ativar-letsencrypt.sh` usado em produção.
- O HTTP e o HTTPS passam para as portas padrão **80/443**. O desafio HTTP-01 do Let's Encrypt só usa a 80.
- Com `TLS_MODO=letsencrypt`, o HTTP redireciona sempre para o domínio do certificado. Quem digita o IP chega ao nome certo, em vez de cair no aviso.
- O `ativar-letsencrypt.sh` ganhou `--sem-email`: a conta ACME é criada sem e-mail, e nenhum e-mail pessoal vai para terceiros. O Let's Encrypt já não envia avisos de vencimento, e esses avisos ficam com o monitor (ADR-0036) e com o `uptime.yml` (ADR-0046).
- **É solução para homologação ou até haver domínio.** Em produção vale o domínio da instituição. Para trocar, basta rodar o mesmo script com o novo nome.

## Consequências

- O navegador mostra o cadeado sem aviso em `https://203-0-113-10.sslip.io`. Os cookies continuam `Secure` e o HSTS vale para esse nome.
- O sistema passa a depender da disponibilidade do sslip.io para resolver o nome. Se ele cair, o acesso pelo nome para, e pelo IP o navegador alerta. É aceitável para homologação, não para produção.
- Se o IP mudar, o nome muda junto, e é preciso emitir de novo.
- A primeira emissão real expôs o BUG-026: o Nginx sem root não conseguia ler os arquivos do certbot.
