# 003 — Controle de acesso por papel e ambiente

- **Status:** Concluída (MVP)
- **Sprint:** 1 · **Responsável:** Dev A (API), Dev C (rotas)
- **Requisitos:** RF01 (token com contexto de ambiente e papel), RF02 (hierarquia), RNF05 (isolamento entre ambientes, menor privilégio)
- **ADRs:** [0006](../adr/0006-autenticacao-jwt-sessao.md), [0009](../adr/0009-frontend-spa-unico.md)

## Objetivo

Garantir que cada requisição só acesse o que o papel e o ambiente do usuário permitem,
com **negação por padrão**.

## Papéis e ambientes

| Papel | Ambiente | MFA |
|---|---|---|
| ADMINISTRADOR | PROFISSIONAL | obrigatório |
| COORDENADOR | PROFISSIONAL | obrigatório |
| PROFESSOR | PROFISSIONAL | opcional (pendente) |
| CORRETOR | PROFISSIONAL | opcional (pendente) |
| ALUNO | ALUNO | opcional (pendente) |

## Funcionamento (API)

`AuthGuard` global (`apps/api/src/common/auth/auth.guard.ts`), nesta ordem:

1. `@Publico()` → libera.
2. Exige `Authorization: Bearer <access token>` válido (assinatura, expiração, `iss`, `aud=quizzer-api`).
3. Rejeita token cujo `amb` não corresponde ao papel (defesa em profundidade).
4. Se `trs=true` (troca de senha pendente) e a rota não tem `@PermiteSenhaPendente()` → `403 TROCA_SENHA_OBRIGATORIA`.
5. `@AmbienteRequerido(x)` → `403` se o token for de outro ambiente.
6. `@Papeis(...)` → `403` se o papel não estiver na lista.

Uso típico:

```ts
@Controller('usuarios')
@AmbienteRequerido('PROFISSIONAL')
export class UsuariosController {
  @Post() @Papeis('ADMINISTRADOR') criar(...) {}
  @Get()  @Papeis('ADMINISTRADOR', 'COORDENADOR') listar(...) {}
}
```

## Funcionamento (frontend)

`RotaProtegida` (`apps/web/src/auth/RotaProtegida.tsx`) — apenas experiência; a API decide:

- sessão sendo restaurada → spinner;
- anônimo → login do ambiente (guarda a rota de origem para voltar depois);
- usuário do outro ambiente → área dele (`/app` ou `/aluno`);
- troca de senha pendente → `/trocar-senha`;
- papel fora da lista → `/acesso-negado`.

Menu lateral do ambiente profissional é filtrado por papel.

## Casos de uso

| # | Cenário | Resultado |
|---|---|---|
| UC1 | Aluno chama `GET /api/v1/usuarios` | `403` |
| UC2 | Professor chama `POST /api/v1/usuarios` | `403` |
| UC3 | Token MFA usado como access token | `401` |
| UC4 | Aluno abre `/app` no navegador | Redirecionado para `/aluno` |
| UC5 | Corretor abre `/app/usuarios` | `/acesso-negado` |

## Testes

- `apps/api/src/common/auth/auth.guard.spec.ts` — todos os passos do guard.
- `apps/api/test/auth.e2e-spec.ts`, `usuarios.e2e-spec.ts` — UC1–UC3 com a aplicação real.
- `apps/web/src/auth/RotaProtegida.test.tsx` — UC4, UC5 e demais redirecionamentos.

## Pendências e limitações

- [x] **Permissões delegadas** (RF02 — alternativa): `@Delegavel` no guard + catálogo inicial —
      lote 6, [022](022-delegacao-e-co-professores.md) e ADR-0033. Ampliar o catálogo com as RNs.
- [x] ~~Escopo por dono do recurso~~ — aplicado nos serviços de cada módulo (matriz no [ADR-0021](../adr/0021-escopo-de-acesso-por-papel.md)).
- [ ] Hierarquia de cargos completa (Coordenador gerenciando professores da sua área) — aguarda RNs.

## Arquivos principais

- `apps/api/src/common/auth/{auth.guard,decorators,tipos}.ts`
- `apps/web/src/auth/RotaProtegida.tsx`, `apps/web/src/layouts/LayoutProfissional.tsx`
