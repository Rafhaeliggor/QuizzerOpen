# 027 — Bateria de testes consolidada

- **Status:** Concluída (MVP)
- **Sprint:** 7 · **Responsável:** Dev B
- **ADRs:** [0040](../adr/0040-bateria-de-testes-consolidada.md)

## Como usar

```bash
testes/testar-tudo.sh --senha '<senha do seed>'        # tudo (≈ 10–15 min)
testes/testar-tudo.sh --rapido                              # estáticos + unitários + e2e da API
testes/testar-tudo.sh --etapas navegador,monitor --senha …  # só algumas etapas
npm run test:tudo -- --senha …  /  npm run test:rapido
```

Resultado em `testes/resultados/<data-hora>/resumo.md` (+ um `.log` por etapa). Roteiro manual e
lista do que cada etapa cobre: [docs/testes/roteiro-de-testes.md](../testes/roteiro-de-testes.md).

## Arquivos

`testes/testar-tudo.sh`, `testes/lib.sh`, `testes/infra/{testar-backup,testar-https,testar-monitor,testar-scripts,testar-logs}.sh`,
`testes/carga/{turma-simultanea.mjs,limpar-dados-carga.sh}`.
