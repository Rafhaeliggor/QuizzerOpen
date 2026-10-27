# ADR-0041: E-mail opcional, recuperação de senha e convite de primeiro acesso

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A (API), Dev B (infra), Dev C (telas)
- **Requisitos relacionados:** RF01, RF02 ("sistema envia credenciais"), RF10 (canal e-mail)

## Contexto

O plano deixou e-mail fora do MVP (sem provedor). Para uso real faltavam "esqueci minha senha" e o
envio de acesso a contas novas. Nem toda instituição terá SMTP no primeiro dia.

## Decisão

- **E-mail é opcional**: com `SMTP_HOST` vazio o sistema funciona como antes (senha temporária
  mostrada a quem cadastrou). Com SMTP (`nodemailer`, versão fixa com mais de duas semanas),
  ligam-se: recuperação de senha, convite de primeiro acesso e cópia das notificações do sino.
  `EMAIL_TRANSPORTE=memoria` existe só para testes.
- **Recuperação:** `POST /auth/senha/esqueci` responde **sempre a mesma mensagem** (não revela se o
  e-mail existe); no máximo 3 pedidos por conta a cada 30 min; token de 256 bits só no link, **hash
  SHA-256 no banco** (`iam.redefinicoes_senha`), validade 30 min, **uso único**, pedido novo invalida
  os anteriores. Redefinir encerra todas as sessões, zera bloqueio e falhas e é auditado.
- **Convite:** conta criada pela administração ou por matrícula/importação recebe link "defina sua
  senha" (mesmo mecanismo, validade 72 h). A senha temporária continua sendo exibida como alternativa.
- **Notificações por e-mail:** cópia em segundo plano (SMTP lento não atrasa a resposta), só texto
  puro, respeitando a preferência `notificacoesPorEmail` (em *Minha conta*).
- **Rede:** a API ganha a rede `egress-net` (não interna) para alcançar o SMTP; as demais continuam
  internas. `APP_URL` define o endereço dos links (o verificador de produção exige `https://`).

## Consequências

- Envio sem fila/retentativa: falha de SMTP só é registrada no log (o link pode ser pedido de novo).
- Sem HTML nos e-mails (evita montar marcação com dados do usuário).
