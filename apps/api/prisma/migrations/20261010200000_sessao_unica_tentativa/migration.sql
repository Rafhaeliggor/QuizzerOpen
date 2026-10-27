-- AlterTable
ALTER TABLE "aplicacao"."tentativas" ADD COLUMN     "sessao_execucao" TEXT,
ADD COLUMN     "trocas_sessao" INTEGER NOT NULL DEFAULT 0;

