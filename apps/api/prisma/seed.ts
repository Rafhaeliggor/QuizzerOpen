/**
 * Seed de dados de teste e demonstração. Idempotente — pode ser executado várias vezes.
 *
 * Cria: admin, 2 professores (autora e revisor), 1 corretora, 2 alunos, 1 turma,
 * questões publicadas, uma prova aplicada à turma (aberta por 7 dias) e uma prova
 * pública com PIN.
 *
 * Uso: SEED_SENHA_PADRAO=... npx prisma db seed
 * A senha NUNCA fica no código; vem da variável de ambiente.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import { PrismaClient, type Papel } from '../src/generated/prisma/client.js';

const senha = process.env.SEED_SENHA_PADRAO;
if (!senha || senha.length < 10) {
  console.error('Defina SEED_SENHA_PADRAO (mínimo 10 caracteres) para executar o seed.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && process.env.SEED_PERMITIR_PRODUCAO !== 'true') {
  console.error('Seed bloqueado em produção. Use SEED_PERMITIR_PRODUCAO=true se for intencional.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const usuarios: { chave: string; nome: string; email: string; papel: Papel; matricula?: string }[] = [
  { chave: 'admin', nome: 'Administrador Quizzer', email: 'admin@quizzer.local', papel: 'ADMINISTRADOR' },
  { chave: 'prof', nome: 'Ana Souza', email: 'professor@quizzer.local', papel: 'PROFESSOR' },
  { chave: 'revisor', nome: 'Carlos Mendes', email: 'revisor@quizzer.local', papel: 'PROFESSOR' },
  { chave: 'corretor', nome: 'Diana Rocha', email: 'corretor@quizzer.local', papel: 'CORRETOR' },
  { chave: 'aluno', nome: 'Bruno Lima', email: 'aluno@quizzer.local', papel: 'ALUNO', matricula: '2026000001' },
  { chave: 'aluno2', nome: 'Camila Torres', email: 'aluno2@quizzer.local', papel: 'ALUNO', matricula: '2026000002' },
];

interface QuestaoSeed {
  disciplina: string;
  topico: string;
  dificuldade: 'FACIL' | 'MEDIO' | 'DIFICIL';
  enunciado: string;
  alternativas?: string[];
  correta?: number;
  rubrica?: string;
  /** Verdadeiro/falso: a afirmação é verdadeira? */
  verdadeira?: boolean;
  /** Resposta curta: respostas aceitas. */
  aceitas?: string[];
}

const questoesBiologia: QuestaoSeed[] = [
  {
    disciplina: 'Biologia',
    topico: 'Citologia',
    dificuldade: 'FACIL',
    enunciado: 'Qual organela é responsável pela respiração celular aeróbica?',
    alternativas: ['Ribossomo', 'Mitocôndria', 'Complexo de Golgi', 'Lisossomo'],
    correta: 1,
  },
  {
    disciplina: 'Biologia',
    topico: 'Genética',
    dificuldade: 'MEDIO',
    enunciado: 'No cruzamento Aa × Aa, qual a proporção esperada de descendentes com fenótipo recessivo?',
    alternativas: ['1/4', '1/2', '3/4', '0'],
    correta: 0,
  },
  {
    disciplina: 'Biologia',
    topico: 'Ecologia',
    dificuldade: 'FACIL',
    enunciado: 'Os organismos que produzem o próprio alimento por fotossíntese são chamados de:',
    alternativas: ['Decompositores', 'Consumidores primários', 'Produtores', 'Parasitas'],
    correta: 2,
  },
  {
    disciplina: 'Biologia',
    topico: 'Metabolismo',
    dificuldade: 'DIFICIL',
    enunciado: 'Explique, com suas palavras, o papel do ATP no metabolismo celular.',
    rubrica:
      'Esperado: (1) ATP armazena energia em ligações fosfato; (2) transfere energia para reações; (3) exemplo de processo que consome ATP.',
  },
];

const questoesGerais: QuestaoSeed[] = [
  {
    disciplina: 'Conhecimentos Gerais',
    topico: 'Geografia',
    dificuldade: 'FACIL',
    enunciado: 'Qual é a capital do estado de Alagoas?',
    alternativas: ['Recife', 'Maceió', 'Aracaju', 'João Pessoa'],
    correta: 1,
  },
  {
    disciplina: 'Conhecimentos Gerais',
    topico: 'Ciências',
    dificuldade: 'FACIL',
    enunciado: 'Qual planeta do Sistema Solar é conhecido como "planeta vermelho"?',
    alternativas: ['Vênus', 'Júpiter', 'Marte', 'Saturno'],
    correta: 2,
  },
  {
    disciplina: 'Conhecimentos Gerais',
    topico: 'Matemática',
    dificuldade: 'MEDIO',
    enunciado: 'Quanto é 15% de 200?',
    alternativas: ['15', '20', '30', '35'],
    correta: 2,
  },
];

/** Lote 6: demonstra os formatos verdadeiro/falso e resposta curta. */
const questoesFormatos: QuestaoSeed[] = [
  {
    disciplina: 'Química',
    topico: 'Tabela periódica',
    dificuldade: 'FACIL',
    enunciado: 'A água é formada por dois átomos de hidrogênio e um de oxigênio.',
    verdadeira: true,
  },
  {
    disciplina: 'Química',
    topico: 'Tabela periódica',
    dificuldade: 'FACIL',
    enunciado: 'Qual é o símbolo químico do sódio?',
    aceitas: ['Na'],
  },
  {
    disciplina: 'Biologia',
    topico: 'Citologia',
    dificuldade: 'MEDIO',
    enunciado: 'Toda célula possui núcleo delimitado por membrana.',
    verdadeira: false,
  },
];

const LETRAS = 'ABCDEFGHIJ';

async function main() {
  // Mesmos parâmetros do SenhaService (ADR-0023).
  const senhaHash = await argon2.hash(senha!, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

  const ids: Record<string, string> = {};
  for (const { chave, ...u } of usuarios) {
    // Contas de demonstração já com ciência da política (o aviso apareceria em todo teste).
    const politica = { politicaAceitaEm: new Date(), politicaVersao: process.env.POLITICA_VERSAO ?? '2026-10-27' };
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: politica,
      create: { ...u, senhaHash, ...politica },
    });
    ids[chave] = usuario.id;
    console.log(`usuário   ${u.papel.padEnd(13)} ${u.email}${u.matricula ? ` (matrícula ${u.matricula})` : ''}`);
  }

  // ---- Turma
  const nomeTurma = 'Turma Piloto 2026.2';
  const turma =
    (await prisma.turma.findFirst({ where: { nome: nomeTurma } })) ??
    (await prisma.turma.create({
      data: {
        nome: nomeTurma,
        periodoInicio: new Date('2026-08-01'),
        periodoFim: new Date('2026-12-20'),
        professorResponsavelId: ids.prof!,
      },
    }));
  for (const aluno of ['aluno', 'aluno2']) {
    const ativo = await prisma.matricula.findFirst({
      where: { turmaId: turma.id, alunoId: ids[aluno]!, dataDesvinculo: null },
    });
    if (!ativo) await prisma.matricula.create({ data: { turmaId: turma.id, alunoId: ids[aluno]! } });
  }
  console.log(`turma     ${turma.nome} (2 alunos)`);

  // ---- Questões publicadas (autora: Ana; revisor: Carlos)
  const criarQuestao = async (q: QuestaoSeed) => {
    const existente = await prisma.versaoQuestao.findFirst({ where: { enunciado: q.enunciado } });
    if (existente) return existente.id;
    const formato =
      q.verdadeira !== undefined
        ? 'VERDADEIRO_FALSO'
        : q.aceitas
          ? 'RESPOSTA_CURTA'
          : q.alternativas
            ? 'MULTIPLA_ESCOLHA'
            : 'DISSERTATIVA';
    const conteudo =
      formato === 'MULTIPLA_ESCOLHA'
        ? {
            alternativas: q.alternativas!.map((texto, i) => ({ id: LETRAS[i]!, texto })),
            gabarito: { alternativaId: LETRAS[q.correta!]! },
          }
        : formato === 'VERDADEIRO_FALSO'
          ? {
              alternativas: [
                { id: 'V', texto: 'Verdadeiro' },
                { id: 'F', texto: 'Falso' },
              ],
              gabarito: { alternativaId: q.verdadeira ? 'V' : 'F' },
            }
          : formato === 'RESPOSTA_CURTA'
            ? { gabarito: { respostasAceitas: q.aceitas! } }
            : { rubrica: { criterios: q.rubrica ?? '' } };
    const nova = await prisma.questao.create({
      data: {
        autorId: ids.prof!,
        disciplina: q.disciplina,
        topico: q.topico,
        dificuldade: q.dificuldade,
        natureza: formato === 'DISSERTATIVA' ? 'ABERTA' : 'FECHADA',
        formato,
        statusAtual: 'PUBLICADA',
        revisadoPorId: ids.revisor!,
        publicadaEm: new Date(),
        versoes: {
          create: {
            numeroVersao: 1,
            criadoPorId: ids.prof!,
            enunciado: q.enunciado,
            ...conteudo,
          },
        },
      },
      include: { versoes: true },
    });
    return nova.versoes[0]!.id;
  };
  const versoesBio: string[] = [];
  for (const q of questoesBiologia) versoesBio.push(await criarQuestao(q));
  const versoesGerais: string[] = [];
  for (const q of questoesGerais) versoesGerais.push(await criarQuestao(q));
  const versoesFormatos: string[] = [];
  for (const q of questoesFormatos) versoesFormatos.push(await criarQuestao(q));
  console.log(`questões  ${versoesBio.length + versoesGerais.length + versoesFormatos.length} publicadas`);

  // ---- Provas publicadas
  const provaBio =
    (await prisma.prova.findFirst({ where: { titulo: 'Avaliação Diagnóstica de Biologia' } })) ??
    (await prisma.prova.create({
      data: {
        autorId: ids.prof!,
        titulo: 'Avaliação Diagnóstica de Biologia',
        descricao: 'Três questões objetivas e uma dissertativa. Leia com atenção antes de responder.',
        status: 'PUBLICADA',
        publicadaEm: new Date(),
        visibilidade: 'PRIVADA',
        criterioAprovacao: { tipo: 'NOTA_MINIMA', valor: 6 },
        tempoLimiteMin: 30,
        tentativasPermitidas: 2,
        modoNavegacao: 'LIVRE',
        ordemQuestoes: 'FIXA',
        questoes: {
          create: versoesBio.map((v, i) => ({ versaoQuestaoId: v, ordem: i + 1, peso: [25, 25, 20, 30][i]! })),
        },
      },
    }));
  const provaGeral =
    (await prisma.prova.findFirst({ where: { titulo: 'Quiz de Conhecimentos Gerais' } })) ??
    (await prisma.prova.create({
      data: {
        autorId: ids.prof!,
        titulo: 'Quiz de Conhecimentos Gerais',
        descricao: 'Quiz aberto ao público — resultado não certificado.',
        status: 'PUBLICADA',
        publicadaEm: new Date(),
        visibilidade: 'PUBLICA',
        criterioAprovacao: { tipo: 'NENHUM' },
        tempoLimiteMin: 10,
        tentativasPermitidas: 1,
        modoNavegacao: 'SEQUENCIAL',
        ordemQuestoes: 'RANDOMIZADA',
        questoes: {
          create: versoesGerais.map((v, i) => ({
            versaoQuestaoId: v,
            ordem: i + 1,
            peso: [33.33, 33.33, 33.34][i]!,
          })),
        },
      },
    }));
  const provaFormatos =
    (await prisma.prova.findFirst({ where: { titulo: 'Mini quiz: verdadeiro/falso e resposta curta' } })) ??
    (await prisma.prova.create({
      data: {
        autorId: ids.prof!,
        titulo: 'Mini quiz: verdadeiro/falso e resposta curta',
        descricao: 'Demonstra os novos formatos. O gabarito aparece assim que o resultado sai; recurso em até 7 dias.',
        status: 'PUBLICADA',
        publicadaEm: new Date(),
        visibilidade: 'PRIVADA',
        criterioAprovacao: { tipo: 'NOTA_MINIMA', valor: 6 },
        tempoLimiteMin: 15,
        tentativasPermitidas: 3,
        modoNavegacao: 'LIVRE',
        ordemQuestoes: 'FIXA',
        exibirGabarito: 'APOS_CORRECAO',
        prazoRecursoDias: 7,
        questoes: {
          create: versoesFormatos.map((v, i) => ({ versaoQuestaoId: v, ordem: i + 1, peso: [33.33, 33.33, 33.34][i]! })),
        },
      },
    }));
  console.log(`provas    "${provaBio.titulo}", "${provaGeral.titulo}" e "${provaFormatos.titulo}"`);

  // ---- Aplicações abertas por 7 dias
  const agora = new Date();
  const fim = new Date(agora.getTime() + 7 * 24 * 3600_000);
  const aplicacaoTurma =
    (await prisma.aplicacao.findFirst({ where: { provaId: provaBio.id, janelaFim: { gt: agora } } })) ??
    (await prisma.aplicacao.create({
      data: {
        provaId: provaBio.id,
        turmaId: turma.id,
        destinoTipo: 'TURMA',
        janelaInicio: new Date(agora.getTime() - 60_000),
        janelaFim: fim,
        criadoPorId: ids.prof!,
      },
    }));
  (await prisma.aplicacao.findFirst({ where: { provaId: provaFormatos.id, janelaFim: { gt: agora } } })) ??
    (await prisma.aplicacao.create({
      data: {
        provaId: provaFormatos.id,
        turmaId: turma.id,
        destinoTipo: 'TURMA',
        janelaInicio: new Date(agora.getTime() - 60_000),
        janelaFim: fim,
        criadoPorId: ids.prof!,
      },
    }));
  const aplicacaoPublica =
    (await prisma.aplicacao.findFirst({ where: { provaId: provaGeral.id, janelaFim: { gt: agora } } })) ??
    (await prisma.aplicacao.create({
      data: {
        provaId: provaGeral.id,
        destinoTipo: 'PUBLICO',
        janelaInicio: new Date(agora.getTime() - 60_000),
        janelaFim: fim,
        pinAcesso: gerarPin(),
        criadoPorId: ids.prof!,
      },
    }));

  const jaNotificado = await prisma.notificacao.findFirst({
    where: { usuarioId: ids.aluno!, tipo: 'PROVA_DISPONIVEL' },
  });
  if (!jaNotificado) {
    await prisma.notificacao.createMany({
      data: ['aluno', 'aluno2'].map((a) => ({
        usuarioId: ids[a]!,
        tipo: 'PROVA_DISPONIVEL',
        titulo: 'Nova prova disponível',
        mensagem: `"${provaBio.titulo}" está disponível por 7 dias.`,
        link: '/aluno',
      })),
    });
  }
  console.log(`aplicação turma   aberta até ${aplicacaoTurma.janelaFim.toISOString()}`);
  console.log(`aplicação pública PIN ${aplicacaoPublica.pinAcesso}  →  /p/${aplicacaoPublica.pinAcesso}`);
}

function gerarPin() {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 8; i++) pin += alfabeto[randomInt(alfabeto.length)];
  return pin;
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
