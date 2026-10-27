# Guia do professor e do corretor

Entre por **/login**. O menu lateral mostra só o que o seu perfil pode usar. No topo, a trilha
(ex.: *Unima / Provas / Biologia*) mostra onde você está, e o sino traz as notificações. O
**Dashboard** resume o que está pendente (questões cadastradas e aguardando revisão, correções,
recursos, aplicações recentes) e mostra o desempenho por turma. Para sair, clique no seu nome no
canto superior direito.

## 1. Banco de questões

- A lista filtra por disciplina, natureza, **tipo** (formato) e **dificuldade**; os filtros ativos
  aparecem como etiquetas que um clique remove.

- *Banco de questões → Nova questão*: disciplina, tópico, dificuldade e **formato**:
  - **Múltipla escolha**: 2 a 10 alternativas, marque a correta. Correção automática.
  - **Verdadeiro ou falso**: escreva a afirmação e marque se é verdadeira ou falsa. Correção automática.
  - **Resposta curta**: liste as **respostas aceitas**, uma por linha (ex.: "Pacífico" e "Oceano
    Pacífico"). A comparação ignora acentos, maiúsculas e espaços extras. Correção automática.
  - **Dissertativa**: escreva a **rubrica** (critérios) — só quem corrige vê. Correção manual.
  - **Várias corretas**: marque todas as certas. Nota parcial: (certas marcadas − erradas marcadas) ÷
    total de certas, nunca negativa.
  - **Resposta numérica**: valor esperado e tolerância (± — ex.: 3,14 ± 0,01).
  - **Associação de colunas**: pares certos (coluna A → coluna B) e, se quiser, opções extras que não
    combinam com nada. O aluno escolhe a opção de cada item; nota parcial por item certo.
  - **Ordenação**: escreva os itens **na ordem certa**; o aluno recebe embaralhado e reordena. Nota
    parcial pelos pares que ficaram na ordem certa.
- **Dissertativa com critérios**: em *Critérios com pontos*, liste o que se espera e quanto vale cada
  item (ex.: "cita a função do ATP — 2 pts"). Quem corrige marca os pontos de cada critério.
- **Fórmulas:** escreva em LaTeX entre `\(` e `\)` na linha (ex.: `\(x^2 + 1\)`) ou entre `\[` e
  `\]` em destaque (ex.: `\[\frac{a}{b}\]`). O editor mostra a pré-visualização. "R$" não atrapalha.
- **Imagens e áudios**: *Adicionar imagem ou áudio* (PNG, JPEG, GIF, WebP, MP3, OGG, WAV; até 5 MB;
  SVG não é aceito). Aparecem para o aluno na prova e na impressão.
- **Alto risco / certificação**: marque a caixa para questões sensíveis. Depois de publicada, cada
  edição vira uma **versão aguardando aprovação** de outra pessoa; até lá as provas usam a versão
  vigente. Quem aprova vê o aviso no detalhe da questão (e na aba *Aguardando minha revisão*):
  *Aprovar nova versão* ou *Recusar nova versão* (com comentário).
- A questão nasce como **Rascunho**. Clique **Enviar para revisão**.
  - Se existir questão muito parecida na disciplina, o sistema mostra quais são e pede confirmação.
- **Outro professor** (nunca o autor) revisa na aba *Aguardando minha revisão*: **Aprovar e
  publicar** ou **Devolver para ajustes** com comentário (você vê o comentário e pode corrigir).
- Só questões **Publicadas** entram em provas. Editar uma questão publicada cria uma **nova
  versão**; provas antigas continuam com a versão que usaram. O formato não muda depois de publicada.
- *Arquivar* tira a questão das listas.

## 2. Turmas

- *Turmas → Nova turma* (nome e período).
- Na turma: **Adicionar aluno** (nome, e-mail, matrícula). Se o e-mail já for de um aluno, ele só é
  vinculado; se não, a conta é criada e aparece uma **senha temporária** (anote e entregue ao aluno).
- **Importar CSV** com colunas `nome,email,matricula` (vírgula ou ponto e vírgula). Há
  pré-visualização. O relatório mostra linhas com erro (e o motivo), quem já estava na turma e as
  contas novas — baixe o arquivo de **credenciais** na hora (não é exibido de novo).
- **Remover** um aluno só encerra o vínculo; notas e tentativas continuam no histórico.
- **Transferir** muda o aluno de turma (encerra o vínculo aqui e matricula na outra).
- Com e-mail configurado, alunos novos recebem um **convite** para criar a senha (a senha temporária
  continua aparecendo para você, como alternativa).
- **Professores** (aba da turma): o professor responsável adiciona **co-professores**. Eles veem a
  turma, matriculam alunos, aplicam as próprias provas a ela e veem os relatórios. Só o responsável
  (ou a coordenação) muda a equipe e os dados da turma.

## 3. Provas

*Provas → Nova prova* abre o assistente em 3 passos:

1. **Dados e parâmetros**: título, instruções, visibilidade (privada = turmas com login; pública =
   código/link), critério (nota mínima de 0 a 10 ou sem critério), tempo limite, tentativas,
   navegação (livre ou sequencial) e ordem (fixa ou embaralhada por aluno). Também:
   - **Gabarito para o aluno**: nunca, quando o resultado for publicado, ou depois que a aplicação encerrar;
   - **Prazo para recurso** (dias após o resultado) ou sem prazo;
   - **Exigir verificação em duas etapas** (só prova privada): o aluno precisa ter o MFA ativo para iniciar;
   - **Correção às cegas**: quem corrige não vê o nome do aluno até o resultado sair.
2. **Questões e pesos**: busque questões publicadas, *Adicionar*, ajuste pesos (%), reordene.
   *Distribuir igualmente* divide 100%. **A soma precisa ser 100%** para publicar.
   - **Seções** (*+ Nova seção*): agrupam a prova. Em **Sorteio de N questões**, cada aluno recebe N
     questões sorteadas do conjunto da seção (provas diferentes para vizinhos de carteira); informe o
     peso da seção. Para montar o conjunto, filtre o banco por disciplina e use *Adicionar todas desta
     lista*. **Nota mínima na seção** (opcional): além da nota geral, o aluno precisa atingir esse
     mínimo na seção para ser aprovado.
3. **Revisar e publicar**. Depois de publicada, a prova não muda mais.

Nota = soma de (peso × acerto), em escala de 0 a 10.

Na prova pronta: **Imprimir / PDF** (com ou sem gabarito — use *Salvar como PDF* no diálogo de
impressão) e **Duplicar** (cria um rascunho igual para ajustar e reaplicar).

**Questão com versão mais nova?** O detalhe da prova avisa. Em rascunho, o passo 3 oferece *Usar as
versões mais novas* (mantém ordem e pesos); prova publicada não muda — duplique para usar a nova.

## 4. Aplicar e acompanhar

- Na prova publicada: **Aplicar prova** → destino **Turma** (alunos recebem aviso no sino),
  **Alunos escolhidos** (segunda chamada, recuperação, adaptação — marque os alunos das suas turmas)
  ou **Público** (gera **código PIN** e **link** para enviar), e a janela de datas.
- *Aplicações → (aplicação)*: lista de participantes (inclusive quem não começou), situação de
  cada tentativa e nota; atualiza sozinha a cada 15 s. Se aparecer "aberta em outro dispositivo N×",
  o aluno trocou de computador/aba durante a prova. "**saiu da prova N×**" indica quantas vezes a aba
  da prova ficou oculta (clique para ver os horários) — é só contexto, não prova de fraude.
- **Encerrar agora** fecha a janela e envia as provas em andamento com o que estava salvo.
- Reabrir a tentativa de um aluno (ex.: queda de energia) é feito pela **coordenação** — ou por você,
  se a coordenação tiver delegado essa permissão.

## 5. Correção

- *Correções* lista provas com questões dissertativas aguardando nota.
- Em cada questão: rubrica, resposta do aluno, pontuação (0–100% — atalhos 0/50/100) e feedback.
- **Salvar e avançar** grava a nota e leva à próxima questão pendente da mesma tentativa; quando
  não há mais nenhuma, abre a próxima tentativa da fila (ou volta à lista, se a fila acabou).
- Quando a última questão é corrigida, a nota é **publicada** e o aluno é avisado. Depois disso,
  mudanças só por recurso.
- **Corretor** vê a fila de todas as provas; o professor, das provas dele. Na página da prova,
  **Corretores designados** restringe quem corrige aquela prova (corretores ou outros professores).
- Questões com **critérios** mostram um campo de pontos por critério em vez do percentual.

## 6. Recursos

- *Recursos* (o sino avisa quando chega um). Abra, leia a justificativa, veja a questão e a resposta.
- *Marcar em análise* (opcional) e **Decidir**:
  - **Indeferir** (mantém a nota),
  - **Deferir — ajustar a pontuação deste aluno**,
  - **Deferir — anular a questão** para *todos*: pontuar a todos ou remover do total. As notas de
    todos os participantes são recalculadas e eles recebem aviso.
- A justificativa da decisão é enviada ao aluno.
- **Encaminhar à coordenação** (com motivo): para casos sensíveis ou conflito de interesse — a
  coordenação é avisada e passa a decidir.

## 7. Relatórios

- *Relatórios*: por prova (média, mediana, aprovação, tempo médio, **distribuição das notas**,
  **acerto por questão**, participantes), **por disciplina** (acerto médio) e por turma (aluno ×
  prova). Considera a última tentativa de cada participante. **Exportar CSV** abre direto no Excel.
- **Período**: escolha *De/até* no topo — vale para todas as visões (pela data de envio).
- **Excel**, **CSV** e **Imprimir / PDF** nos relatórios de prova e de turma.
- **Indícios para revisão** (relatório da prova): envio muito rápido, várias saídas da aba, troca de
  dispositivo e erros idênticos entre dois alunos. São só sinais para você conferir — **não são prova
  de fraude**.
- **Por aluno**: no relatório da turma (ou na lista de alunos da turma), clique no nome do aluno —
  média, evolução das notas, provas e desempenho por disciplina.

## Termos de Uso e privacidade

No primeiro acesso, e sempre que os textos mudarem, você passa pela página de aceite dos **Termos
de Uso** e da **Política de Privacidade**. Os Termos pedem sigilo sobre notas, respostas e dados dos
alunos e o uso desses dados só para a atividade acadêmica.

## Configurações (minha conta)

Item **Configurações** no menu lateral (ou clique no seu nome → *Configurações da conta*). Na aba
*Segurança*: trocar senha, **verificação em duas etapas** (opcional para professor e
corretor), **sessões abertas** (encerrar as que não reconhecer), baixar seus dados, solicitar
exclusão (LGPD). Na aba *Aparência*: tema **Padrão do sistema** (acompanha o modo claro/escuro do
aparelho), **Claro** ou **Escuro**. A escolha vale para o navegador em uso.
