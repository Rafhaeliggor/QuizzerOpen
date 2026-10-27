-- CreateEnum
CREATE TYPE "correcao"."PapelAvaliacao" AS ENUM ('PRIMEIRA', 'SEGUNDA', 'ARBITRAGEM');

-- AlterTable
ALTER TABLE "aplicacao"."aplicacoes" ADD COLUMN     "grupo_id" UUID;

-- AlterTable
ALTER TABLE "aplicacao"."tentativas" ADD COLUMN     "indice_atual" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questao_desde" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "correcao"."correcoes_questao" ADD COLUMN     "aguarda_arbitragem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "correcao"."notas" ADD COLUMN     "correcao_dupla" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limiar_divergencia" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "provas"."provas" ADD COLUMN     "correcao_dupla" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limiar_divergencia" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "sugestao_ia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tempo_por_questao_seg" INTEGER;

-- AlterTable
ALTER TABLE "provas"."secoes" ADD COLUMN     "por_dificuldade" JSONB;

-- CreateTable
CREATE TABLE "turmas"."grupos" (
    "id" UUID NOT NULL,
    "turma_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas"."grupo_membros" (
    "id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,

    CONSTRAINT "grupo_membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correcao"."avaliacoes" (
    "id" UUID NOT NULL,
    "correcao_questao_id" UUID NOT NULL,
    "papel" "correcao"."PapelAvaliacao" NOT NULL,
    "corretor_id" UUID NOT NULL,
    "fracao" DECIMAL(5,4) NOT NULL,
    "feedback" TEXT,
    "avaliacao_itens" JSONB,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grupos_turma_id_nome_key" ON "turmas"."grupos"("turma_id", "nome");

-- CreateIndex
CREATE INDEX "grupo_membros_aluno_id_idx" ON "turmas"."grupo_membros"("aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_membros_grupo_id_aluno_id_key" ON "turmas"."grupo_membros"("grupo_id", "aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_correcao_questao_id_papel_key" ON "correcao"."avaliacoes"("correcao_questao_id", "papel");

-- AddForeignKey
ALTER TABLE "turmas"."grupos" ADD CONSTRAINT "grupos_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"."turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas"."grupo_membros" ADD CONSTRAINT "grupo_membros_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "turmas"."grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correcao"."avaliacoes" ADD CONSTRAINT "avaliacoes_correcao_questao_id_fkey" FOREIGN KEY ("correcao_questao_id") REFERENCES "correcao"."correcoes_questao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

