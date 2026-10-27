# Guia da coordenação e da administração

Administrador e Coordenador entram por **/login** com **verificação em duas etapas obrigatória**:
no primeiro acesso, escaneie o QR code num app autenticador (Google/Microsoft Authenticator,
Authy) e informe o código. Nos acessos seguintes, só o código de 6 dígitos.

Coordenação e administração veem **todas** as questões, turmas, provas, aplicações, correções,
recursos e relatórios (professores veem só os seus). Ao criar turmas, podem escolher o professor
responsável. Use o [guia do professor](guia-professor.md) para essas telas.

## Usuários (Administrador; Coordenação consulta, desbloqueia e delega)

- *Usuários → Novo usuário*: nome, e-mail, papel (e matrícula para aluno). Aparece uma **senha
  temporária** — entregue por canal seguro; a troca é obrigatória no primeiro acesso.
- Clique no nome para a ficha do usuário:
  - **Desbloquear** (conta bloqueada por tentativas erradas) — também a Coordenação.
  - **Redefinir senha** — nova senha temporária, encerra as sessões.
  - **Resetar MFA** (perdeu o celular; com justificativa) — o próximo login pede novo cadastro.
  - **Desativar / reativar** (com justificativa) — o acesso é cortado em até 30 segundos.
  - **Editar** nome, e-mail, papel, matrícula — mudar papel ou e-mail encerra as sessões.
- Ninguém altera o próprio papel, nem desativa ou reseta o próprio MFA: peça a outro administrador.
  **Mantenha pelo menos dois administradores.**

## Permissões delegadas (Administrador e Coordenação)

Na ficha de um **professor** ou **corretor**, o cartão *Permissões delegadas* libera ações
específicas **sem mudar o papel** (justificativa obrigatória; vale em até 30 s; fica na auditoria):

| Permissão | O que libera |
|---|---|
| Reabrir tentativas | Botão *Reabrir* nas aplicações que a pessoa já acompanha |
| Desbloquear contas | Menu *Usuários* (consulta) e *Desbloquear* — sem editar, desativar ou criar |
| Consultar auditoria | Menu *Auditoria* (com exportação CSV) |

*Revogar* desfaz. **Mudar o papel da pessoa remove todas as delegações.** Ao conceder, informe
*Válida até* para uma delegação temporária (ex.: plantão) — ela vence sozinha.

## Reabrir uma tentativa (Administrador, Coordenação ou quem recebeu a delegação)

Em *Aplicações → (aplicação)*, na linha do aluno: **Reabrir** → justificativa obrigatória +
minutos adicionais. A nota anterior é descartada e recalculada no novo envio; o aluno é avisado.
Fica registrado na auditoria. Não é possível reabrir tentativa que já tenha recurso.

## Auditoria (Administrador)

*Auditoria* mostra quem fez o quê e quando (logins, bloqueios, criação e mudança de contas,
publicação de questões e provas, aprovação de versões de alto risco, envios, correções, recursos,
reaberturas, delegações, LGPD), com o **nome** de quem fez. Filtre por ação e **período**;
**Excel** ou **CSV** baixam até 10 mil eventos do filtro.
A trilha **não pode ser alterada nem apagada** — nem pelo próprio sistema.

## LGPD (Administrador)

- O sino avisa quando chega uma **solicitação de exclusão**. Prazo legal: **15 dias**.
- *LGPD*: veja titular, motivo e prazo.
  - **Anonimizar** — irreversível: nome, e-mail, matrícula, senha e MFA são removidos e a conta
    encerrada; notas e provas permanecem anônimas (registro acadêmico).
  - **Recusar** — escreva o motivo (ex.: obrigação legal de guarda); o titular vê a resposta.
- **Participante de prova pública** (sem conta) que pede por e-mail: em *Participante externo*,
  informe o e-mail e como o pedido chegou.
- Um administrador não atende o próprio pedido; o último administrador ativo não pode ser anonimizado.

## Recursos encaminhados (Coordenação)

Quando o professor encaminha um recurso, o sino avisa a coordenação. Em *Recursos*, ele aparece com o
selo "com a coordenação": só a coordenação/administração decidem.

## Integrações (Administrador)

*Integrações → Nova chave*: nome, escopos (`turmas:escrever`, `turmas:ler`, `notas:ler`) e validade.
A chave aparece **uma vez** — entregue à TI do sistema acadêmico. *Revogar* corta na hora. Guia
técnico: [operacao/integracao.md](../operacao/integracao.md).

## LGPD — correção e retenção

- Pedidos de **correção** aparecem na tela *LGPD* com o dado pedido; *Aplicar correção* atualiza a
  conta e o nome nos resultados.
- **Retenção de externos:** definida pela TI em `RETENCAO_EXTERNOS_DIAS`; *Aplicar agora* executa na hora.

## Questões de alto risco (Coordenação)

Só a coordenação desmarca (ou marca) *alto risco* numa questão já publicada. Alterações nessas
questões ficam **aguardando aprovação** de alguém diferente de quem editou.

## Operação (TI)

Backups (banco **e** imagens/áudios das questões), HTTPS e implantação:
[roteiro de implantação](../operacao/implantacao.md) e `infra/vps/verificar-producao.sh`
(verificação de prontidão).

- **Monitor:** o serviço `monitor` avisa no mesmo webhook do backup (ou em `MONITOR_WEBHOOK`)
  quando API/Nginx param, a API devolve muitos erros (mais de 5% de 5xx) ou fica lenta (p95 > 2 s),
  o certificado está para vencer (< 14 dias), o backup atrasa, o teste mensal de restauração
  vence ou o disco passa de 90% — e avisa de novo quando resolve. Logs: `docker compose logs monitor`.
- **Teste mensal da cópia externa:** `infra/backup/testar-copia-externa.sh --chave <chave privada>`
  restaura o último backup do remoto num banco separado e registra o resultado; se passar de 35
  dias sem teste, o monitor avisa.
- **Logs centralizados (opcional):** com `COMPOSE_FILE=docker-compose.yml:docker-compose.logs.yml`
  no `.env`, os logs de todos os serviços ficam em `logs/<data>/<serviço>.log` (e, se configurado,
  num Loki ou destino HTTP fora do servidor).
- **Atualizações:** o GitHub abre PRs semanais (Dependabot) e roda `npm audit` toda segunda; um
  e-mail de falha do workflow *Segurança* indica vulnerabilidade a corrigir.
- **Testes de tudo:** `testes/testar-tudo.sh --senha …` ([roteiro](../testes/roteiro-de-testes.md)).
- **E-mail (opcional):** preencha `SMTP_*`, `EMAIL_REMETENTE` e `APP_URL` no `.env` e reinicie a API.
  Liga *Esqueci minha senha*, convites e cópia dos avisos por e-mail.
- **Perdeu o celular (MFA):** a pessoa usa um código de recuperação; sem códigos, *Resetar MFA* na ficha.
- **Rotação da chave do MFA:** ver o [roteiro de implantação](../operacao/implantacao.md#rotação-da-chave-do-mfa).
- **Termos de Uso e Política de Privacidade** ([cópia em docs/legal](../legal/README.md)): para mudar o texto, siga o
  [passo a passo](../legal/README.md) (editar `documentos.ts`, trocar a versão nos dois lados, sincronizar e reconstruir
  API e frontend). Todos passam de novo pela página de aceite. Defina `CONTATO_ENCARREGADO` no `.env` (contato do DPO).
