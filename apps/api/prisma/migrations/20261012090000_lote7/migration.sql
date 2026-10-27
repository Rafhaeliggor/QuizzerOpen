-- AlterEnum


ALTER TYPE "questoes"."FormatoQuestao" ADD VALUE 'MULTIPLA_RESPOSTA';
ALTER TYPE "questoes"."FormatoQuestao" ADD VALUE 'RESPOSTA_NUMERICA';

-- AlterTable
ALTER TABLE "correcao"."correcoes_questao" ADD COLUMN     "midias" JSONB;

-- AlterTable
ALTER TABLE "iam"."permissoes_delegadas" ADD COLUMN     "expira_em" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "iam"."usuarios" ADD COLUMN     "mfa_codigos_recuperacao" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "notificacoes_por_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "politica_aceita_em" TIMESTAMPTZ(3),
ADD COLUMN     "politica_versao" TEXT;

-- CreateTable
CREATE TABLE "iam"."redefinicoes_senha" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "usado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redefinicoes_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacao"."aplicacao_alunos" (
    "id" UUID NOT NULL,
    "aplicacao_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,

    CONSTRAINT "aplicacao_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redefinicoes_senha_token_hash_key" ON "iam"."redefinicoes_senha"("token_hash");

-- CreateIndex
CREATE INDEX "redefinicoes_senha_usuario_id_idx" ON "iam"."redefinicoes_senha"("usuario_id");

-- CreateIndex
CREATE INDEX "aplicacao_alunos_aluno_id_idx" ON "aplicacao"."aplicacao_alunos"("aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "aplicacao_alunos_aplicacao_id_aluno_id_key" ON "aplicacao"."aplicacao_alunos"("aplicacao_id", "aluno_id");

-- AddForeignKey
ALTER TABLE "iam"."redefinicoes_senha" ADD CONSTRAINT "redefinicoes_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "iam"."usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacao"."aplicacao_alunos" ADD CONSTRAINT "aplicacao_alunos_aplicacao_id_fkey" FOREIGN KEY ("aplicacao_id") REFERENCES "aplicacao"."aplicacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

