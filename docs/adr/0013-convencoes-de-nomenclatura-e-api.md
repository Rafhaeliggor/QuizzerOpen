# ADR-0013: Convenções de nomenclatura, idioma e formato da API

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Equipe
- **Requisitos relacionados:** plano, Seção 7 (inconsistência entre código gerado por pessoas diferentes)

## Decisão

**Idioma**
- **Domínio em português**, como nos requisitos: entidades, campos, serviços e variáveis de
  negócio (`Usuario`, `Turma`, `papel`, `tentativasLoginFalha`, `AuthService.trocarSenha`).
- **Termos técnicos de framework em inglês** onde são convenção (`Controller`, `Service`,
  `Module`, `Guard`, `dto`, `spec`).
- Componentes do design system mantêm os nomes do RNF04 (`DataTable`, `StatusBadge`,
  `AlertBanner`, `Timer`, `Stepper`) e seus pares (`Button`, `TextField`, `Card`, `Spinner`).
- Banco em snake_case português (ADR-0005). Mensagens ao usuário em pt-BR.

**API REST**
- Prefixo `/api`, versionamento por URI (`/api/v1/...`).
- Recursos no plural em português (`/usuarios`, futuramente `/turmas`, `/questoes`, `/provas`).
- DTOs validados com `class-validator`; `ValidationPipe` global com `whitelist` e
  `forbidNonWhitelisted` (campo desconhecido → `400`).
- Erros no formato padrão do Nest `{ statusCode, message, error }`, acrescidos de `codigo`
  estável quando o frontend precisa reagir (`CONTA_BLOQUEADA`, `TROCA_SENHA_OBRIGATORIA`,
  `MFA_TOKEN_INVALIDO`, `MFA_CODIGO_INVALIDO`, `SESSAO_INVALIDA`).
- Listagens paginadas: `?pagina=1&tamanho=20` → `{ total, pagina, tamanho, itens }` (máx. 100).
- Nunca devolver `senhaHash`, segredos ou hashes; serializar via função explícita
  (ex.: `paraUsuarioPublico`).

## Consequências

- Agentes de IA devem receber este ADR no prompt-base compartilhado pela equipe.
