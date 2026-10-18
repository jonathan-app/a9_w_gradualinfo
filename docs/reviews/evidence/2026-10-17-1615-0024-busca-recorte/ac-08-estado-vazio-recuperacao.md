# Evidência de verificação busca/AC-08

- Critério: Em consultas sem resultados, a página apresenta mensagem de estado vazio honesto com botão ou atalho para limpar o recorte de editoria ativo e links navegáveis para as editorias públicas.
- Spec de referência: docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md
- Commit avaliado: b14dd5191590f0df3b9bd3835ca13f646d09d14f
- Execução: 2026-10-17

## 1. Comprovação do estado vazio sem filtro de editoria

A suíte e2e/search-flow.spec.ts navega para /busca?q=termoinexistenteparaoteste123:
- Exibe o texto amigável e honesto: "Nenhum artigo encontrado. Tente outro termo ou explore as editorias."
- Link "editorias" aponta para /#editorias.

## 2. Comprovação do estado vazio com recorte por editoria ativo

A suíte __tests__/unit/app-busca.test.tsx valida quando o termo não tem resultados na editoria escolhida:
- Exibe a mensagem: "Nenhum artigo encontrado em Segurança para “TypeScript”."
- Renderiza link "Limpar filtro de editoria" com href="/busca?q=TypeScript", preservando a consulta textual sem a restrição de categoria.

Veredito: PASS
