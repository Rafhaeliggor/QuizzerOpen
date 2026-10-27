-- CreateEnum
CREATE TYPE "iam"."StatusSolicitacaoLgpd" AS ENUM ('PENDENTE', 'CONCLUIDA', 'RECUSADA');

-- AlterTable
ALTER TABLE "iam"."usuarios" ADD COLUMN     "anonimizado_em" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "iam"."solicitacoes_lgpd" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "status" "iam"."StatusSolicitacaoLgpd" NOT NULL DEFAULT 'PENDENTE',
    "justificativa" TEXT,
    "resposta" TEXT,
    "atendido_por_id" UUID,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluida_em" TIMESTAMPTZ(3),

    CONSTRAINT "solicitacoes_lgpd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitacoes_lgpd_status_criado_em_idx" ON "iam"."solicitacoes_lgpd"("status", "criado_em");

-- CreateIndex
CREATE INDEX "solicitacoes_lgpd_usuario_id_idx" ON "iam"."solicitacoes_lgpd"("usuario_id");

-- AddForeignKey
ALTER TABLE "iam"."solicitacoes_lgpd" ADD CONSTRAINT "solicitacoes_lgpd_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "iam"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

