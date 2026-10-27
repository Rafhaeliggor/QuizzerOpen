-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "aplicacao";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "correcao";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "iam";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "provas";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "questoes";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "turmas";

-- CreateEnum
CREATE TYPE "iam"."Papel" AS ENUM ('ADMINISTRADOR', 'COORDENADOR', 'PROFESSOR', 'CORRETOR', 'ALUNO');

-- CreateEnum
CREATE TYPE "iam"."Ambiente" AS ENUM ('PROFISSIONAL', 'ALUNO');

-- CreateEnum
CREATE TYPE "questoes"."Dificuldade" AS ENUM ('FACIL', 'MEDIO', 'DIFICIL');

-- CreateEnum
CREATE TYPE "questoes"."NaturezaQuestao" AS ENUM ('FECHADA', 'ABERTA');

-- CreateEnum
CREATE TYPE "questoes"."StatusQuestao" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'PUBLICADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "questoes"."TipoMidia" AS ENUM ('IMAGEM', 'AUDIO', 'FORMULA');

-- CreateEnum
CREATE TYPE "provas"."Visibilidade" AS ENUM ('PUBLICA', 'PRIVADA');

-- CreateEnum
CREATE TYPE "provas"."ModoNavegacao" AS ENUM ('SEQUENCIAL', 'LIVRE');

-- CreateEnum
CREATE TYPE "provas"."OrdemQuestoes" AS ENUM ('FIXA', 'RANDOMIZADA');

-- CreateEnum
CREATE TYPE "provas"."StatusProva" AS ENUM ('RASCUNHO', 'PUBLICADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "aplicacao"."DestinoTipo" AS ENUM ('TURMA', 'SUBGRUPO', 'ALUNO_AVULSO', 'PUBLICO');

-- CreateEnum
CREATE TYPE "aplicacao"."StatusTentativa" AS ENUM ('EM_ANDAMENTO', 'ENVIADA', 'EXPIRADA', 'REABERTA', 'INVALIDADA');

-- CreateEnum
CREATE TYPE "correcao"."StatusNota" AS ENUM ('PENDENTE_CORRECAO_MANUAL', 'CONSOLIDADA');

-- CreateEnum
CREATE TYPE "correcao"."StatusAprovacao" AS ENUM ('APROVADO', 'REPROVADO', 'SEM_CRITERIO');

-- CreateTable
CREATE TABLE "iam"."usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "matricula" TEXT,
    "senha_hash" TEXT NOT NULL,
    "papel" "iam"."Papel" NOT NULL,
    "trocar_senha" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "mfa_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "mfa_segredo_cifrado" TEXT,
    "mfa_ultimo_passo" BIGINT,
    "tentativas_login_falha" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_ate" TIMESTAMPTZ(3),
    "ultimo_login_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."sessoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "ambiente" "iam"."Ambiente" NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "revogada_em" TIMESTAMPTZ(3),
    "ip" TEXT,
    "user_agent" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_uso_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."permissoes_delegadas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "concedido_por_id" UUID NOT NULL,
    "permissao" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_delegadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas"."turmas" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "periodo_inicio" DATE NOT NULL,
    "periodo_fim" DATE NOT NULL,
    "professor_responsavel_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas"."matriculas" (
    "id" UUID NOT NULL,
    "turma_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "data_vinculo" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_desvinculo" TIMESTAMPTZ(3),

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questoes"."topicos" (
    "id" UUID NOT NULL,
    "disciplina" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "pai_id" UUID,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questoes"."questoes" (
    "id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "disciplina" TEXT NOT NULL,
    "topico_id" UUID,
    "dificuldade" "questoes"."Dificuldade" NOT NULL,
    "natureza" "questoes"."NaturezaQuestao" NOT NULL,
    "status_atual" "questoes"."StatusQuestao" NOT NULL DEFAULT 'RASCUNHO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "questoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questoes"."versoes_questao" (
    "id" UUID NOT NULL,
    "questao_id" UUID NOT NULL,
    "numero_versao" INTEGER NOT NULL,
    "enunciado" TEXT NOT NULL,
    "alternativas" JSONB,
    "gabarito" JSONB,
    "rubrica" JSONB,
    "criado_por_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versoes_questao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questoes"."midias" (
    "id" UUID NOT NULL,
    "versao_questao_id" UUID NOT NULL,
    "tipo" "questoes"."TipoMidia" NOT NULL,
    "url" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "midias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provas"."provas" (
    "id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "provas"."StatusProva" NOT NULL DEFAULT 'RASCUNHO',
    "visibilidade" "provas"."Visibilidade" NOT NULL DEFAULT 'PRIVADA',
    "criterio_aprovacao" JSONB NOT NULL,
    "tempo_limite_min" INTEGER,
    "tentativas_permitidas" INTEGER NOT NULL DEFAULT 1,
    "modo_navegacao" "provas"."ModoNavegacao" NOT NULL DEFAULT 'LIVRE',
    "ordem_questoes" "provas"."OrdemQuestoes" NOT NULL DEFAULT 'FIXA',
    "publicada_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "provas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provas"."prova_questoes" (
    "id" UUID NOT NULL,
    "prova_id" UUID NOT NULL,
    "versao_questao_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "peso" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "prova_questoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacao"."aplicacoes" (
    "id" UUID NOT NULL,
    "prova_id" UUID NOT NULL,
    "turma_id" UUID,
    "destino_tipo" "aplicacao"."DestinoTipo" NOT NULL,
    "janela_inicio" TIMESTAMPTZ(3) NOT NULL,
    "janela_fim" TIMESTAMPTZ(3) NOT NULL,
    "pin_acesso_hash" TEXT,
    "pin_expira_em" TIMESTAMPTZ(3),
    "criado_por_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aplicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacao"."instancias" (
    "id" UUID NOT NULL,
    "aplicacao_id" UUID NOT NULL,
    "participante_id" UUID,
    "identificacao_minima" JSONB,
    "questoes_fixadas" JSONB NOT NULL,
    "gabarito_congelado" JSONB NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instancias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacao"."tentativas" (
    "id" UUID NOT NULL,
    "instancia_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "aplicacao"."StatusTentativa" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "inicio_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazo_em" TIMESTAMPTZ(3),
    "fim_em" TIMESTAMPTZ(3),

    CONSTRAINT "tentativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacao"."respostas" (
    "id" UUID NOT NULL,
    "tentativa_id" UUID NOT NULL,
    "versao_questao_id" UUID NOT NULL,
    "valor" JSONB NOT NULL,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "respostas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correcao"."notas" (
    "id" UUID NOT NULL,
    "tentativa_id" UUID NOT NULL,
    "status" "correcao"."StatusNota" NOT NULL DEFAULT 'PENDENTE_CORRECAO_MANUAL',
    "nota_provisoria" DECIMAL(6,2),
    "nota_final" DECIMAL(6,2),
    "status_aprovacao" "correcao"."StatusAprovacao",
    "consolidada_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "iam"."usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_matricula_key" ON "iam"."usuarios"("matricula");

-- CreateIndex
CREATE INDEX "sessoes_usuario_id_idx" ON "iam"."sessoes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_delegadas_usuario_id_permissao_key" ON "iam"."permissoes_delegadas"("usuario_id", "permissao");

-- CreateIndex
CREATE INDEX "turmas_professor_responsavel_id_idx" ON "turmas"."turmas"("professor_responsavel_id");

-- CreateIndex
CREATE INDEX "matriculas_turma_id_idx" ON "turmas"."matriculas"("turma_id");

-- CreateIndex
CREATE INDEX "matriculas_aluno_id_idx" ON "turmas"."matriculas"("aluno_id");

-- CreateIndex
CREATE INDEX "questoes_autor_id_idx" ON "questoes"."questoes"("autor_id");

-- CreateIndex
CREATE INDEX "questoes_disciplina_status_atual_idx" ON "questoes"."questoes"("disciplina", "status_atual");

-- CreateIndex
CREATE UNIQUE INDEX "versoes_questao_questao_id_numero_versao_key" ON "questoes"."versoes_questao"("questao_id", "numero_versao");

-- CreateIndex
CREATE INDEX "provas_autor_id_idx" ON "provas"."provas"("autor_id");

-- CreateIndex
CREATE UNIQUE INDEX "prova_questoes_prova_id_versao_questao_id_key" ON "provas"."prova_questoes"("prova_id", "versao_questao_id");

-- CreateIndex
CREATE UNIQUE INDEX "prova_questoes_prova_id_ordem_key" ON "provas"."prova_questoes"("prova_id", "ordem");

-- CreateIndex
CREATE INDEX "aplicacoes_prova_id_idx" ON "aplicacao"."aplicacoes"("prova_id");

-- CreateIndex
CREATE INDEX "aplicacoes_turma_id_idx" ON "aplicacao"."aplicacoes"("turma_id");

-- CreateIndex
CREATE UNIQUE INDEX "instancias_aplicacao_id_participante_id_key" ON "aplicacao"."instancias"("aplicacao_id", "participante_id");

-- CreateIndex
CREATE UNIQUE INDEX "tentativas_instancia_id_numero_key" ON "aplicacao"."tentativas"("instancia_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "respostas_tentativa_id_versao_questao_id_key" ON "aplicacao"."respostas"("tentativa_id", "versao_questao_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_tentativa_id_key" ON "correcao"."notas"("tentativa_id");

-- AddForeignKey
ALTER TABLE "iam"."sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "iam"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."permissoes_delegadas" ADD CONSTRAINT "permissoes_delegadas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "iam"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."permissoes_delegadas" ADD CONSTRAINT "permissoes_delegadas_concedido_por_id_fkey" FOREIGN KEY ("concedido_por_id") REFERENCES "iam"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas"."matriculas" ADD CONSTRAINT "matriculas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"."turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes"."topicos" ADD CONSTRAINT "topicos_pai_id_fkey" FOREIGN KEY ("pai_id") REFERENCES "questoes"."topicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes"."questoes" ADD CONSTRAINT "questoes_topico_id_fkey" FOREIGN KEY ("topico_id") REFERENCES "questoes"."topicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes"."versoes_questao" ADD CONSTRAINT "versoes_questao_questao_id_fkey" FOREIGN KEY ("questao_id") REFERENCES "questoes"."questoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes"."midias" ADD CONSTRAINT "midias_versao_questao_id_fkey" FOREIGN KEY ("versao_questao_id") REFERENCES "questoes"."versoes_questao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provas"."prova_questoes" ADD CONSTRAINT "prova_questoes_prova_id_fkey" FOREIGN KEY ("prova_id") REFERENCES "provas"."provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacao"."instancias" ADD CONSTRAINT "instancias_aplicacao_id_fkey" FOREIGN KEY ("aplicacao_id") REFERENCES "aplicacao"."aplicacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacao"."tentativas" ADD CONSTRAINT "tentativas_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "aplicacao"."instancias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacao"."respostas" ADD CONSTRAINT "respostas_tentativa_id_fkey" FOREIGN KEY ("tentativa_id") REFERENCES "aplicacao"."tentativas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
