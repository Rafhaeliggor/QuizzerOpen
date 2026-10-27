-- CreateEnum
CREATE TYPE "questoes"."FormatoQuestao" AS ENUM ('MULTIPLA_ESCOLHA', 'VERDADEIRO_FALSO', 'RESPOSTA_CURTA', 'DISSERTATIVA');

-- CreateEnum
CREATE TYPE "provas"."ExibicaoGabarito" AS ENUM ('NUNCA', 'APOS_CORRECAO', 'APOS_ENCERRAMENTO');

-- CreateEnum
CREATE TYPE "aplicacao"."TipoEventoTentativa" AS ENUM ('SAIU_DA_PROVA', 'VOLTOU_A_PROVA');

-- DropForeignKey
ALTER TABLE "questoes"."midias" DROP CONSTRAINT "midias_versao_questao_id_fkey";

-- AlterTable
ALTER TABLE "aplicacao"."tentativas" ADD COLUMN     "saidas_de_foco" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "correcao"."correcoes_questao" ADD COLUMN     "disciplina" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "formato" TEXT NOT NULL DEFAULT 'MULTIPLA_ESCOLHA';

-- AlterTable
ALTER TABLE "correcao"."notas" ADD COLUMN     "exibir_gabarito" TEXT NOT NULL DEFAULT 'NUNCA',
ADD COLUMN     "janela_fim" TIMESTAMPTZ(3),
ADD COLUMN     "prazo_recurso_dias" INTEGER;

-- AlterTable
ALTER TABLE "provas"."provas" ADD COLUMN     "exibir_gabarito" "provas"."ExibicaoGabarito" NOT NULL DEFAULT 'NUNCA',
ADD COLUMN     "exige_mfa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prazo_recurso_dias" INTEGER;

-- AlterTable
ALTER TABLE "questoes"."midias" DROP COLUMN "url",
ADD COLUMN     "arquivo" TEXT NOT NULL,
ADD COLUMN     "enviado_por_id" UUID NOT NULL,
ADD COLUMN     "mime" TEXT NOT NULL,
ADD COLUMN     "nome_original" TEXT NOT NULL,
ADD COLUMN     "tamanho" INTEGER NOT NULL,
ALTER COLUMN "versao_questao_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "questoes"."questoes" ADD COLUMN     "alto_risco" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formato" "questoes"."FormatoQuestao" NOT NULL DEFAULT 'MULTIPLA_ESCOLHA';

-- AlterTable
ALTER TABLE "questoes"."versoes_questao" ADD COLUMN     "pendente" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "turmas"."turma_professores" (
    "id" UUID NOT NULL,
    "turma_id" UUID NOT NULL,
    "professor_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turma_professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacao"."eventos_tentativa" (
    "id" UUID NOT NULL,
    "tentativa_id" UUID NOT NULL,
    "tipo" "aplicacao"."TipoEventoTentativa" NOT NULL,
    "ocorrido_em" TIMESTAMPTZ(3) NOT NULL,
    "recebido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_tentativa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "turma_professores_professor_id_idx" ON "turmas"."turma_professores"("professor_id");

-- CreateIndex
CREATE UNIQUE INDEX "turma_professores_turma_id_professor_id_key" ON "turmas"."turma_professores"("turma_id", "professor_id");

-- CreateIndex
CREATE INDEX "eventos_tentativa_tentativa_id_ocorrido_em_idx" ON "aplicacao"."eventos_tentativa"("tentativa_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "midias_versao_questao_id_idx" ON "questoes"."midias"("versao_questao_id");

-- CreateIndex
CREATE INDEX "midias_arquivo_idx" ON "questoes"."midias"("arquivo");

-- AddForeignKey
ALTER TABLE "turmas"."turma_professores" ADD CONSTRAINT "turma_professores_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"."turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes"."midias" ADD CONSTRAINT "midias_versao_questao_id_fkey" FOREIGN KEY ("versao_questao_id") REFERENCES "questoes"."versoes_questao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacao"."eventos_tentativa" ADD CONSTRAINT "eventos_tentativa_tentativa_id_fkey" FOREIGN KEY ("tentativa_id") REFERENCES "aplicacao"."tentativas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Dados existentes: questões abertas são dissertativas (o padrão da coluna é múltipla escolha).
UPDATE "questoes"."questoes" SET "formato" = 'DISSERTATIVA' WHERE "natureza" = 'ABERTA';
UPDATE "correcao"."correcoes_questao" SET "formato" = 'DISSERTATIVA' WHERE "natureza" = 'ABERTA';
