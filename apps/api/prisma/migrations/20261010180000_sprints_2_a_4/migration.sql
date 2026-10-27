-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auditoria";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notificacoes";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "recursos";

-- CreateEnum
CREATE TYPE "correcao"."PoliticaAnulacao" AS ENUM ('PONTUAR_TODOS', 'REMOVER_DO_TOTAL');

-- CreateEnum
CREATE TYPE "recursos"."StatusRecurso" AS ENUM ('ABERTO', 'EM_ANALISE', 'DEFERIDO', 'INDEFERIDO');

-- DropForeignKey
ALTER TABLE "questoes"."questoes" DROP CONSTRAINT "questoes_topico_id_fkey";

-- DropForeignKey
ALTER TABLE "questoes"."topicos" DROP CONSTRAINT "topicos_pai_id_fkey";

-- DropIndex
DROP INDEX "aplicacao"."instancias_aplicacao_id_participante_id_key";

-- DropIndex
DROP INDEX "provas"."prova_questoes_prova_id_ordem_key";

-- AlterTable
ALTER TABLE "aplicacao"."aplicacoes" DROP COLUMN "pin_acesso_hash",
DROP COLUMN "pin_expira_em",
ADD COLUMN     "pin_acesso" TEXT;

-- AlterTable
ALTER TABLE "aplicacao"."instancias" ADD COLUMN     "participante_chave" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "aplicacao"."tentativas" ADD COLUMN     "comprovante_codigo" TEXT,
ALTER COLUMN "prazo_em" SET NOT NULL;

-- AlterTable
ALTER TABLE "correcao"."notas" ADD COLUMN     "aplicacao_id" UUID NOT NULL,
ADD COLUMN     "certificado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "criterio_aprovacao" JSONB NOT NULL,
ADD COLUMN     "fim_em" TIMESTAMPTZ(3) NOT NULL,
ADD COLUMN     "inicio_em" TIMESTAMPTZ(3) NOT NULL,
ADD COLUMN     "participante_email" TEXT NOT NULL,
ADD COLUMN     "participante_nome" TEXT NOT NULL,
ADD COLUMN     "prova_id" UUID NOT NULL,
ADD COLUMN     "prova_titulo" TEXT NOT NULL,
ADD COLUMN     "tentativa_numero" INTEGER NOT NULL,
ADD COLUMN     "turma_id" UUID,
ADD COLUMN     "usuario_id" UUID;

-- AlterTable
ALTER TABLE "questoes"."questoes" DROP COLUMN "topico_id",
ADD COLUMN     "comentario_revisao" TEXT,
ADD COLUMN     "publicada_em" TIMESTAMPTZ(3),
ADD COLUMN     "revisado_por_id" UUID,
ADD COLUMN     "topico" TEXT;

-- DropTable
DROP TABLE "questoes"."topicos";

-- CreateTable
CREATE TABLE "correcao"."correcoes_questao" (
    "id" UUID NOT NULL,
    "nota_id" UUID NOT NULL,
    "versao_questao_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "natureza" TEXT NOT NULL,
    "peso" DECIMAL(6,2) NOT NULL,
    "enunciado" TEXT NOT NULL,
    "alternativas" JSONB,
    "gabarito" JSONB,
    "rubrica" JSONB,
    "resposta" JSONB,
    "fracao" DECIMAL(5,4),
    "automatica" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "corrigido_por_id" UUID,
    "corrigido_em" TIMESTAMPTZ(3),

    CONSTRAINT "correcoes_questao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correcao"."anulacoes" (
    "id" UUID NOT NULL,
    "prova_id" UUID NOT NULL,
    "versao_questao_id" UUID NOT NULL,
    "politica" "correcao"."PoliticaAnulacao" NOT NULL,
    "justificativa" TEXT NOT NULL,
    "criado_por_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anulacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recursos"."recursos" (
    "id" UUID NOT NULL,
    "nota_id" UUID NOT NULL,
    "prova_id" UUID NOT NULL,
    "versao_questao_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "justificativa" TEXT NOT NULL,
    "status" "recursos"."StatusRecurso" NOT NULL DEFAULT 'ABERTO',
    "decisao" TEXT,
    "efeito" TEXT,
    "decidido_por_id" UUID,
    "decidido_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes"."notificacoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria"."eventos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "acao" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recurso_id" TEXT,
    "justificativa" TEXT,
    "dados" JSONB,
    "ip" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "correcoes_questao_versao_questao_id_idx" ON "correcao"."correcoes_questao"("versao_questao_id");

-- CreateIndex
CREATE UNIQUE INDEX "correcoes_questao_nota_id_versao_questao_id_key" ON "correcao"."correcoes_questao"("nota_id", "versao_questao_id");

-- CreateIndex
CREATE UNIQUE INDEX "anulacoes_prova_id_versao_questao_id_key" ON "correcao"."anulacoes"("prova_id", "versao_questao_id");

-- CreateIndex
CREATE INDEX "recursos_prova_id_status_idx" ON "recursos"."recursos"("prova_id", "status");

-- CreateIndex
CREATE INDEX "recursos_aluno_id_idx" ON "recursos"."recursos"("aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "recursos_nota_id_versao_questao_id_key" ON "recursos"."recursos"("nota_id", "versao_questao_id");

-- CreateIndex
CREATE INDEX "notificacoes_usuario_id_lida_criado_em_idx" ON "notificacoes"."notificacoes"("usuario_id", "lida", "criado_em");

-- CreateIndex
CREATE INDEX "eventos_criado_em_idx" ON "auditoria"."eventos"("criado_em");

-- CreateIndex
CREATE INDEX "eventos_recurso_recurso_id_idx" ON "auditoria"."eventos"("recurso", "recurso_id");

-- CreateIndex
CREATE INDEX "eventos_usuario_id_idx" ON "auditoria"."eventos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "aplicacoes_pin_acesso_key" ON "aplicacao"."aplicacoes"("pin_acesso");

-- CreateIndex
CREATE INDEX "instancias_participante_id_idx" ON "aplicacao"."instancias"("participante_id");

-- CreateIndex
CREATE UNIQUE INDEX "instancias_aplicacao_id_participante_chave_key" ON "aplicacao"."instancias"("aplicacao_id", "participante_chave");

-- CreateIndex
CREATE INDEX "tentativas_status_prazo_em_idx" ON "aplicacao"."tentativas"("status", "prazo_em");

-- CreateIndex
CREATE INDEX "notas_prova_id_idx" ON "correcao"."notas"("prova_id");

-- CreateIndex
CREATE INDEX "notas_aplicacao_id_idx" ON "correcao"."notas"("aplicacao_id");

-- CreateIndex
CREATE INDEX "notas_usuario_id_idx" ON "correcao"."notas"("usuario_id");

-- CreateIndex
CREATE INDEX "notas_turma_id_idx" ON "correcao"."notas"("turma_id");

-- AddForeignKey
ALTER TABLE "correcao"."correcoes_questao" ADD CONSTRAINT "correcoes_questao_nota_id_fkey" FOREIGN KEY ("nota_id") REFERENCES "correcao"."notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Auditoria imutável (RF11): a trilha aceita apenas INSERT.
CREATE FUNCTION "auditoria"."bloquear_alteracao"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'auditoria.eventos é somente inserção (RF11)';
END;
$$;

CREATE TRIGGER "eventos_imutaveis"
BEFORE UPDATE OR DELETE ON "auditoria"."eventos"
FOR EACH ROW EXECUTE FUNCTION "auditoria"."bloquear_alteracao"();

CREATE TRIGGER "eventos_sem_truncate"
BEFORE TRUNCATE ON "auditoria"."eventos"
FOR EACH STATEMENT EXECUTE FUNCTION "auditoria"."bloquear_alteracao"();
