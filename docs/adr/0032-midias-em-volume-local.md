# ADR-0032: Mídias das questões em volume local com URL de capacidade

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A (API), Dev B (infra)
- **Requisitos relacionados:** RF04 (mídia vinculada à versão), RNF03, RNF05

## Contexto

O RF04 pede imagem/áudio na questão. O plano tirou o MinIO do MVP (Seção 6) e a infraestrutura é
um único VPS com Docker. As mídias precisam entrar no backup e não podem virar vetor de ataque
(arquivo enviado executando script no domínio do sistema).

## Decisão

- Arquivos ficam no **volume Docker `midias`** (`/app/dados/midias` na API; `MIDIAS_DIR` fora do
  Docker). Metadados em `questoes.midias` (tipo, mime, tamanho, nome original, quem enviou).
- **Validação pela assinatura do arquivo (magic bytes)**, não pelo nome nem pelo `Content-Type`
  enviado: PNG, JPEG, GIF, WebP, MP3, OGG, WAV. **SVG, HTML, PDF e demais formatos são recusados.**
  Limite `MIDIAS_MAX_MB` (5 MB); o parser corta em 10 MB e o Nginx aceita 6 MB nesta rota.
- Nome no disco = **128 bits aleatórios** (32 hex). `GET /api/v1/midias/<nome>` é **pública por URL
  de capacidade**: quem recebeu a questão (aluno durante a prova, participante de prova pública)
  precisa carregar a imagem sem token; quem não tem a URL não a adivinha. Resposta com
  `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` e o
  `Content-Type` gravado no upload.
- Upload em duas etapas: `POST /midias` (multipart) devolve o id; a questão referencia `midiaIds`.
  Mídia sem versão só pode ser ligada por quem a enviou; nova versão **copia o vínculo** (mesmo
  arquivo) — versões antigas continuam íntegras.
- O snapshot da instância (`questoesFixadas`) guarda as URLs: a prova congelada continua exibindo a
  mesma mídia.
- **Backup:** o serviço `backup` monta o volume só leitura e gera `midias-<data>.tar.gz[.age]` junto
  com o dump (mesma cifra, cópia externa e retenção). `restaurar.sh midias-….tar.gz.age` restaura no
  volume.

## Alternativas consideradas

- **MinIO/S3** — fora do MVP; o volume pode migrar depois sem mudar a API (só o serviço).
- **Servir só para autenticados** — quebraria a prova pública e exigiria token em `<img>`.
- **Guardar no banco (bytea)** — infla o dump e o cache do Postgres.

## Consequências

- Fórmulas (LaTeX/MathML) ficam pendentes: o tipo `FORMULA` existe no enum, mas sem editor.
- Arquivos de mídia removidos de todas as versões não são apagados do disco (sem coleta de lixo).
- A URL de capacidade vaza se o aluno a compartilhar — aceitável para material de prova já exibido.
