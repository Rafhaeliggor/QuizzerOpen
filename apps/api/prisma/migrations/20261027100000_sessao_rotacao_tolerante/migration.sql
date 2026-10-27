-- Rotação do refresh tolerante a requisições simultâneas (BUG-047): o hash anterior vale por
-- alguns segundos após a troca.
ALTER TABLE "iam"."sessoes" ADD COLUMN "refresh_anterior_hash" TEXT;
ALTER TABLE "iam"."sessoes" ADD COLUMN "rotacionada_em" TIMESTAMPTZ(3);
