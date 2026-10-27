/**
 * Termos de Uso e Política de Privacidade (ADR-0060) — FONTE ÚNICA dos textos.
 *
 * A cópia em docs/legal/*.md é gerada daqui e um teste falha se as duas divergirem. Ao mudar
 * qualquer tópico:
 *   1. edite este arquivo e troque VERSAO_DOCUMENTOS_LEGAIS (data da nova versão);
 *   2. troque POLITICA_VERSAO da API para o mesmo valor (env.ts, .env.example, docker-compose.yml, seed);
 *   3. rode `npm run legal:sincronizar -w @quizzer/web` para regravar docs/legal/.
 * Com a versão nova, todos os usuários passam de novo pela página de aceite.
 *
 * Marcadores trocados na exibição: {instituicao} (VITE_NOME_INSTITUICAO) e
 * {contatoEncarregado} (VITE_CONTATO_ENCARREGADO).
 */

export const VERSAO_DOCUMENTOS_LEGAIS = '2026-10-27'

/** Parágrafo (texto) ou lista de itens. */
export type Bloco = string | string[]

export interface Secao {
  titulo: string
  blocos: Bloco[]
}

export interface DocumentoLegal {
  slug: 'termos-de-uso' | 'politica-de-privacidade'
  titulo: string
  /** Rota pública onde o texto completo é exibido. */
  rota: string
  resumo: string
  secoes: Secao[]
}

export const TERMOS_DE_USO: DocumentoLegal = {
  slug: 'termos-de-uso',
  titulo: 'Termos de Uso',
  rota: '/termos',
  resumo:
    'Regras de uso do Quizzer: quem pode usar, responsabilidades de cada perfil, conduta nas avaliações, propriedade do conteúdo e limites do serviço.',
  secoes: [
    {
      titulo: '1. Sobre estes termos',
      blocos: [
        'O Quizzer é o sistema de criação, aplicação e correção de avaliações da {instituicao}. Estes Termos de Uso regulam o acesso e o uso do sistema por alunos, professores, corretores, coordenadores, administradores e participantes de provas públicas.',
        'Ao acessar o sistema pela primeira vez (e sempre que estes termos forem atualizados), você deve ler e aceitar estes termos. Sem o aceite, o acesso às áreas logadas fica bloqueado. Participantes de provas públicas aceitam estes termos ao informar seus dados e iniciar a prova.',
        'Estes termos seguem a legislação brasileira, em especial o Marco Civil da Internet (Lei nº 12.965/2014) e seu regulamento (Decreto nº 8.771/2016), a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018), o Código Civil (Lei nº 10.406/2002), a Lei de Direitos Autorais (Lei nº 9.610/1998) e, quando houver relação de consumo, o Código de Defesa do Consumidor (Lei nº 8.078/1990).',
        'O tratamento dos seus dados pessoais é descrito na Política de Privacidade, que faz parte destes termos.',
      ],
    },
    {
      titulo: '2. Quem pode usar',
      blocos: [
        'As contas são criadas pela {instituicao} para alunos matriculados e para a equipe acadêmica. Não há cadastro aberto. Provas públicas podem ser acessadas por quem recebe o código (PIN) da prova, sem conta.',
        'Se você tem menos de 18 anos, use o sistema com o conhecimento do seu responsável legal. O tratamento de dados de crianças e adolescentes segue o melhor interesse deles, conforme o art. 14 da LGPD e o Estatuto da Criança e do Adolescente (Lei nº 8.069/1990).',
      ],
    },
    {
      titulo: '3. Sua conta e sua senha',
      blocos: [
        'A conta é pessoal e intransferível. Você é responsável por:',
        [
          'manter a senha em sigilo e não compartilhá-la com ninguém, nem com colegas ou professores;',
          'guardar os códigos de recuperação da verificação em duas etapas, quando ativada;',
          'encerrar as sessões que não reconhecer (em Minha conta) e avisar a {instituicao} se suspeitar de uso indevido.',
        ],
        'A {instituicao} nunca pede sua senha por e-mail, telefone ou mensagem. Perfis administrativos são obrigados a usar a verificação em duas etapas.',
      ],
    },
    {
      titulo: '4. Conduta nas avaliações',
      blocos: [
        'Durante uma prova, você se compromete a respeitar as regras definidas pelo professor e pela {instituicao}. É proibido:',
        [
          'fazer a prova no lugar de outra pessoa ou permitir que outra pessoa a faça no seu lugar;',
          'copiar, fotografar, gravar ou divulgar questões, gabaritos ou respostas, durante ou depois da prova, sem autorização;',
          'tentar burlar o cronômetro, o limite de tentativas, a sessão única ou qualquer outro controle do sistema;',
          'usar consulta ou ajuda não permitida pelas regras da avaliação.',
        ],
        'O sistema registra sinais de integridade, como saídas da aba da prova, troca de dispositivo e tempo de resposta. Esses registros servem apenas como indício para revisão humana. Nenhuma penalidade é aplicada automaticamente: qualquer medida segue o regimento da {instituicao}, com direito de defesa.',
        'A prova enviada gera um comprovante com código. Guarde-o: ele comprova o envio em caso de dúvida.',
      ],
    },
    {
      titulo: '5. Uso adequado do sistema',
      blocos: [
        'Também é proibido, em qualquer parte do sistema:',
        [
          'acessar ou tentar acessar dados, contas ou áreas sem autorização;',
          'testar vulnerabilidades, sobrecarregar o serviço ou usar robôs e automações não autorizadas;',
          'enviar arquivos com vírus ou conteúdo ilícito, ofensivo, discriminatório ou que viole direitos de terceiros;',
          'usar dados pessoais de alunos e colegas, obtidos pelo sistema, para fins alheios à atividade acadêmica.',
        ],
        'Falhas de segurança encontradas devem ser comunicadas à {instituicao}, sem exploração e sem divulgação pública.',
      ],
    },
    {
      titulo: '6. Responsabilidades da equipe acadêmica',
      blocos: [
        'Professores, corretores, coordenadores e administradores acessam dados de alunos apenas para as finalidades do seu papel (elaborar, aplicar, corrigir e acompanhar avaliações, atender recursos e administrar o sistema). Devem manter sigilo sobre notas, respostas e dados pessoais e seguir o princípio da necessidade da LGPD. As ações desses perfis ficam registradas em trilha de auditoria.',
        'Quem cadastra questões e mídias declara ter o direito de usá-las e é responsável por citar as fontes quando exigido pela Lei de Direitos Autorais.',
      ],
    },
    {
      titulo: '7. Propriedade intelectual',
      blocos: [
        'As questões, provas, gabaritos e demais materiais do sistema pertencem aos seus autores e à {instituicao}, conforme os contratos e normas internas, e são protegidos pela Lei nº 9.610/1998. O uso permitido é apenas o acadêmico, dentro do sistema. As respostas que você escreve continuam sendo suas; você autoriza a {instituicao} a armazená-las e usá-las para correção, recursos, registros acadêmicos e estatísticas sem identificação.',
      ],
    },
    {
      titulo: '8. Notas, recursos e resultados',
      blocos: [
        'A correção automática vale para questões fechadas; as abertas são corrigidas por pessoas. A nota pode ser provisória até a correção ser concluída e pode mudar em razão de recurso ou anulação de questão, sempre com registro. Você pode contestar uma questão pelo próprio sistema, dentro do prazo definido para a prova.',
      ],
    },
    {
      titulo: '9. Disponibilidade e limites do serviço',
      blocos: [
        'A {instituicao} busca manter o sistema disponível e seguro, com cópias de segurança e monitoramento, mas o serviço pode ficar indisponível por manutenção, falhas de conexão ou motivos fora do seu controle. As respostas são salvas automaticamente durante a prova e o cronômetro é controlado pelo servidor. Se uma falha do sistema prejudicar sua prova, a coordenação pode reabrir a tentativa, com registro do motivo.',
        'A {instituicao} não se responsabiliza por falhas no seu dispositivo, navegador ou conexão com a internet, nem por danos causados pelo uso da sua conta por terceiros a quem você tenha dado acesso. Nada nestes termos afasta direitos garantidos por lei, inclusive os do Código de Defesa do Consumidor quando aplicável.',
      ],
    },
    {
      titulo: '10. Suspensão e encerramento',
      blocos: [
        'O descumprimento destes termos pode levar à suspensão do acesso, sem prejuízo das medidas previstas no regimento da {instituicao} e na lei. As contas são desativadas quando termina o vínculo com a instituição. Mesmo depois disso, registros acadêmicos (notas e provas) são mantidos pelo prazo exigido pela regulação educacional, como descrito na Política de Privacidade.',
      ],
    },
    {
      titulo: '11. Alterações destes termos',
      blocos: [
        'Estes termos podem ser atualizados para refletir mudanças no sistema ou na lei. Cada versão tem uma data. Quando houver nova versão, você verá a página de aceite no próximo acesso e só continuará depois de ler e aceitar. O registro do aceite (data e versão) fica na sua conta.',
      ],
    },
    {
      titulo: '12. Contato e foro',
      blocos: [
        'Dúvidas sobre estes termos: {contatoEncarregado}.',
        'Aplica-se a lei brasileira. Fica eleito o foro da comarca da sede da {instituicao}, ressalvado o direito do consumidor de propor ação no foro do seu domicílio.',
      ],
    },
  ],
}

export const POLITICA_DE_PRIVACIDADE: DocumentoLegal = {
  slug: 'politica-de-privacidade',
  titulo: 'Política de Privacidade',
  rota: '/privacidade',
  resumo:
    'Quais dados pessoais o Quizzer trata, para quê, com qual base legal, por quanto tempo, com quem são compartilhados e como exercer seus direitos (LGPD).',
  secoes: [
    {
      titulo: '1. Quem trata seus dados',
      blocos: [
        'O controlador dos dados pessoais tratados no Quizzer é a {instituicao}, que decide como e para quê os dados são usados. O encarregado pelo tratamento de dados pessoais (DPO) é o canal de comunicação com os titulares e com a Autoridade Nacional de Proteção de Dados (ANPD). Contato do encarregado: {contatoEncarregado}.',
        'Esta política atende à Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018), ao Marco Civil da Internet (Lei nº 12.965/2014) e às normas da ANPD.',
      ],
    },
    {
      titulo: '2. Quais dados tratamos',
      blocos: [
        [
          'Cadastro: nome, e-mail, matrícula, perfil de acesso e turmas.',
          'Avaliações: respostas, horários de início e envio, notas, correções, comentários dos corretores e recursos.',
          'Integridade da prova: saídas da aba da prova, troca de dispositivo durante a prova e tempo de resposta.',
          'Segurança e acesso: data, hora e endereço IP de logins e ações relevantes, navegador usado em cada sessão e dados da verificação em duas etapas (guardados cifrados).',
          'Comunicação: notificações do sistema e, se a instituição usar e-mail, a cópia enviada por e-mail.',
          'Provas públicas: nome e e-mail informados pelo participante, além das respostas e do resultado.',
          'Preferências: escolha de tema e avisos por e-mail.',
        ],
        'Não pedimos dados pessoais sensíveis (como origem racial, saúde, religião ou biometria). Não use campos de resposta para informar esse tipo de dado.',
      ],
    },
    {
      titulo: '3. Para que usamos e com qual base legal',
      blocos: [
        [
          'Aplicar, corrigir e registrar avaliações, emitir resultados e atender recursos — execução do contrato de prestação de serviços educacionais (art. 7º, V) e cumprimento de obrigação legal ou regulatória da instituição de ensino (art. 7º, II).',
          'Manter registros de acesso e a trilha de auditoria — cumprimento de obrigação legal (art. 15 do Marco Civil da Internet) e exercício regular de direitos em processo administrativo ou judicial (art. 7º, VI).',
          'Garantir a segurança da conta, prevenir fraudes e preservar a integridade das avaliações — legítimo interesse da instituição e dos próprios alunos (art. 7º, IX), limitado ao necessário.',
          'Enviar avisos sobre provas, resultados e recursos — execução do contrato (art. 7º, V); a cópia por e-mail pode ser desligada em Minha conta.',
          'Gerar relatórios e estatísticas pedagógicas — legítimo interesse (art. 7º, IX), com acesso restrito à equipe acadêmica responsável.',
        ],
        'O tratamento não se baseia no seu consentimento. Por isso, o aceite pedido no primeiro acesso é a sua concordância com os Termos de Uso e o registro de que você foi informado sobre esta política (art. 9º da LGPD), não uma autorização que você precise dar para cada uso. Seus dados não são vendidos nem usados para publicidade, e o sistema não toma decisões automatizadas que afetem você sem revisão humana: indícios de integridade e notas de questões abertas sempre passam por uma pessoa.',
      ],
    },
    {
      titulo: '4. Com quem compartilhamos',
      blocos: [
        'Dentro da instituição, cada pessoa vê apenas o necessário para o seu papel: o professor vê as turmas e provas sob sua responsabilidade; o corretor, as respostas que deve corrigir (de forma anônima, quando a prova usa correção às cegas); a coordenação e a administração, o necessário para gestão e atendimento de recursos e direitos.',
        'Fora da instituição, os dados podem ser tratados por fornecedores que atuam como operadores, sob contrato e apenas conforme as instruções da {instituicao}:',
        [
          'provedor de hospedagem do servidor e das cópias de segurança (cópias cifradas);',
          'provedor de envio de e-mails, quando a instituição usa e-mail;',
          'sistemas acadêmicos da própria instituição integrados ao Quizzer (por exemplo, para importar turmas e exportar notas).',
        ],
        'Também podemos compartilhar dados quando a lei exigir ou por ordem de autoridade competente. Se algum fornecedor armazenar dados fora do Brasil, a transferência seguirá o art. 33 da LGPD e a regulamentação da ANPD.',
      ],
    },
    {
      titulo: '5. Por quanto tempo guardamos',
      blocos: [
        [
          'Registros acadêmicos (provas, respostas e notas): pelo prazo exigido pela regulação educacional e pelas normas de guarda do acervo acadêmico da instituição.',
          'Registros de acesso (data, hora e IP): no mínimo 6 meses, como exige o art. 15 do Marco Civil da Internet. A trilha de auditoria é mantida para segurança e prova de integridade e não guarda nome nem e-mail diretamente.',
          'Sessões de acesso: removidas 30 dias depois de expiradas ou encerradas.',
          'Notificações: removidas automaticamente após o prazo configurado pela instituição (padrão de 180 dias).',
          'Participantes de provas públicas: pelo prazo definido pela instituição, depois anonimizados.',
          'Cópias de segurança: cifradas e substituídas em ciclos curtos (padrão de 7 dias).',
        ],
        'Encerrado o prazo ou atendido um pedido de exclusão, os dados pessoais são eliminados ou anonimizados, salvo quando a lei permitir mantê-los (art. 16 da LGPD).',
      ],
    },
    {
      titulo: '6. Seus direitos',
      blocos: [
        'Como titular, você pode, a qualquer momento e sem custo (art. 18 da LGPD):',
        [
          'confirmar se tratamos seus dados e acessá-los — em Minha conta, "Baixar meus dados" gera um arquivo com tudo o que o sistema guarda sobre você;',
          'pedir a correção de dados incompletos, inexatos ou desatualizados — "Pedir correção de dados";',
          'pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desconformidade com a lei — "Solicitar exclusão dos meus dados";',
          'pedir a portabilidade dos dados, receber informação sobre com quem eles são compartilhados e pedir a revisão de decisões tomadas com base em tratamento automatizado;',
          'opor-se a tratamento feito com base no legítimo interesse, quando houver descumprimento da lei;',
          'apresentar reclamação à ANPD (www.gov.br/anpd).',
        ],
        'Os pedidos feitos no sistema são respondidos em até 15 dias. Se a exclusão for atendida, nome, e-mail e matrícula são removidos e a conta é encerrada; as notas permanecem de forma anônima, porque a instituição é obrigada a mantê-las. Participantes de provas públicas exercem seus direitos pelo contato do encarregado: {contatoEncarregado}.',
      ],
    },
    {
      titulo: '7. Segurança',
      blocos: [
        'Adotamos medidas técnicas e administrativas para proteger os dados (art. 46 da LGPD), entre elas: conexão cifrada (HTTPS), senhas guardadas com Argon2id (nunca em texto), verificação em duas etapas, controle de acesso por perfil, bloqueio após tentativas de login erradas, trilha de auditoria que não pode ser alterada e cópias de segurança cifradas e testadas.',
        'Se ocorrer um incidente de segurança que possa causar risco ou dano relevante, a {instituicao} comunicará a ANPD e os titulares afetados, conforme o art. 48 da LGPD e o regulamento de comunicação de incidentes da ANPD.',
      ],
    },
    {
      titulo: '8. Cookies e armazenamento no navegador',
      blocos: [
        'O Quizzer não usa cookies de publicidade nem de rastreamento. Usamos apenas o estritamente necessário para o funcionamento:',
        [
          'um cookie de sessão protegido (HttpOnly), que mantém você conectado de forma segura e expira em poucos dias;',
          'armazenamento local do navegador para a sua escolha de tema e para as questões que você marcou para revisar durante a prova.',
        ],
        'Como são necessários para o serviço, esses itens não dependem de consentimento. Se você apagar os dados do navegador, só perderá essas preferências.',
      ],
    },
    {
      titulo: '9. Crianças e adolescentes',
      blocos: [
        'Quando o sistema for usado por alunos menores de 18 anos, o tratamento seguirá o melhor interesse deles (art. 14 da LGPD), com os mesmos limites de finalidade e necessidade. Os responsáveis legais podem exercer os direitos do titular pelo contato do encarregado.',
      ],
    },
    {
      titulo: '10. Alterações desta política',
      blocos: [
        'Esta política pode ser atualizada. Cada versão tem uma data. Quando houver mudança, você será informado na página de aceite no próximo acesso. O registro de que você foi informado (data e versão) fica na sua conta.',
      ],
    },
  ],
}

export const DOCUMENTOS_LEGAIS = [TERMOS_DE_USO, POLITICA_DE_PRIVACIDADE] as const

/** Data da versão no formato brasileiro (27/10/2026). */
export function formatarVersao(versao = VERSAO_DOCUMENTOS_LEGAIS) {
  const [ano, mes, dia] = versao.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Troca os marcadores {instituicao} e {contatoEncarregado}. */
export function preencher(texto: string, valores: { instituicao: string; contatoEncarregado: string }) {
  return texto.replaceAll('{instituicao}', valores.instituicao).replaceAll('{contatoEncarregado}', valores.contatoEncarregado)
}

/** Markdown da cópia em docs/legal/ (gerado — ver o topo deste arquivo). */
export function paraMarkdown(doc: DocumentoLegal) {
  const linhas = [
    `<!-- Gerado de apps/web/src/legal/documentos.ts — não edite à mão: rode \`npm run legal:sincronizar -w @quizzer/web\`. -->`,
    '',
    `# ${doc.titulo}`,
    '',
    `**Versão:** ${formatarVersao()} · Exibido em \`${doc.rota}\` · Marcadores: \`{instituicao}\` e \`{contatoEncarregado}\` (configurados no build).`,
    '',
    `> ${doc.resumo}`,
  ]
  for (const secao of doc.secoes) {
    linhas.push('', `## ${secao.titulo}`)
    for (const bloco of secao.blocos) {
      linhas.push('', ...(typeof bloco === 'string' ? [bloco] : bloco.map((item) => `- ${item}`)))
    }
  }
  return linhas.join('\n') + '\n'
}
