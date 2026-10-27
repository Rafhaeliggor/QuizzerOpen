-- CreateEnum
CREATE TYPE "iam"."TipoSolicitacaoLgpd" AS ENUM ('EXCLUSAO', 'CORRECAO');

-- CreateEnum
CREATE TYPE "provas"."ModoSecao" AS ENUM ('FIXA', 'SORTEIO');

-- AlterEnum


ALTER TYPE "questoes"."FormatoQuestao" ADD VALUE 'ASSOCIACAO';
ALTER TYPE "questoes"."FormatoQuestao" ADD VALUE 'ORDENACAO';

-- AlterTable
ALTER TABLE "correcao"."correcoes_questao" ADD COLUMN     "avaliacao_itens" JSONB,
ADD COLUMN     "secao_id" TEXT;

-- AlterTable
ALTER TABLE "correcao"."notas" ADD COLUMN     "correcao_as_cegas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notas_secao" JSONB,
ADD COLUMN     "secoes" JSONB;

-- AlterTable
ALTER TABLE "iam"."solicitacoes_lgpd" ADD COLUMN     "dados_corrigidos" JSONB,
ADD COLUMN     "tipo" "iam"."TipoSolicitacaoLgpd" NOT NULL DEFAULT 'EXCLUSAO';

-- AlterTable
ALTER TABLE "provas"."prova_questoes" ADD COLUMN     "secao_id" UUID;

-- AlterTable
ALTER TABLE "provas"."provas" ADD COLUMN     "correcao_as_cegas" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "recursos"."recursos" ADD COLUMN     "encaminhado_em" TIMESTAMPTZ(3),
ADD COLUMN     "encaminhado_por_id" UUID,
ADD COLUMN     "motivo_encaminhamento" TEXT;

-- AlterTable
ALTER TABLE "turmas"."turmas" ADD COLUMN     "codigo_externo" TEXT;

-- CreateTable
CREATE TABLE "iam"."chaves_integracao" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "segredo_hash" TEXT NOT NULL,
    "escopos" TEXT[],
    "criado_por_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMPTZ(3),
    "ultimo_uso_em" TIMESTAMPTZ(3),
    "revogada_em" TIMESTAMPTZ(3),

    CONSTRAINT "chaves_integracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provas"."secoes" (
    "id" UUID NOT NULL,
    "prova_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "modo" "provas"."ModoSecao" NOT NULL DEFAULT 'FIXA',
    "sortear" INTEGER,
    "peso" DECIMAL(6,2),
    "nota_minima" DECIMAL(4,2),

    CONSTRAINT "secoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provas"."prova_corretores" (
    "id" UUID NOT NULL,
    "prova_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,

    CONSTRAINT "prova_corretores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes"."emails_pendentes" (
    "id" UUID NOT NULL,
    "para" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_tentativa_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_erro" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pendentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chaves_integracao_prefixo_key" ON "iam"."chaves_integracao"("prefixo");

-- CreateIndex
CREATE UNIQUE INDEX "secoes_prova_id_ordem_key" ON "provas"."secoes"("prova_id", "ordem");

-- CreateIndex
CREATE INDEX "prova_corretores_usuario_id_idx" ON "provas"."prova_corretores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "prova_corretores_prova_id_usuario_id_key" ON "provas"."prova_corretores"("prova_id", "usuario_id");

-- CreateIndex
CREATE INDEX "emails_pendentes_proxima_tentativa_em_idx" ON "notificacoes"."emails_pendentes"("proxima_tentativa_em");

-- CreateIndex
CREATE UNIQUE INDEX "turmas_codigo_externo_key" ON "turmas"."turmas"("codigo_externo");

-- AddForeignKey
ALTER TABLE "provas"."secoes" ADD CONSTRAINT "secoes_prova_id_fkey" FOREIGN KEY ("prova_id") REFERENCES "provas"."provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provas"."prova_corretores" ADD CONSTRAINT "prova_corretores_prova_id_fkey" FOREIGN KEY ("prova_id") REFERENCES "provas"."provas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provas"."prova_questoes" ADD CONSTRAINT "prova_questoes_secao_id_fkey" FOREIGN KEY ("secao_id") REFERENCES "provas"."secoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

