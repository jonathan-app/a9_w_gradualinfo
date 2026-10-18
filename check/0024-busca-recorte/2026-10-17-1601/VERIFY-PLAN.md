# Plano de verificação da Feature P

Estado: Executado e Aprovado em 2026-10-17. Contrato: `docs/specs/2026-10-17-1547-0024-busca-recorte-editoria.md` (Accepted).
Artefato de resultados: `check/0024-busca-recorte/2026-10-17-1615/results.json` (9 PASS, 0 FAIL, 0 UNVERIFIABLE, veredito APROVADO).
Build executado e verificado por testes unitários e de componente em 2026-10-17 (858 testes em 83 arquivos Vitest) e Playwright e2e (7 testes no Chromium real).

- busca/AC-01: Acessar `/busca?q=programacao&editoria=Tecnologia&page=1` no servidor local. Esperado: a página lê os parâmetros sem erros, sanitiza e exibe resultados filtrados.
- busca/AC-02: Buscar termos com e sem acentuação (exemplo: "inteligencia" e "inteligência", "programacao" e "programação"). Esperado: normalização de caracteres avalia correspondências equivalentes em títulos, resumos, editorias e corpo.
- busca/AC-03: Buscar termos com pequenos erros de digitação (exemplo: "artifisial", "prograamacao"). Esperado: algoritmo de distância Levenshtein Damerau aceita até 1 edição para termos entre 5 e 8 caracteres e até 2 edições para termos acima de 8 caracteres, enquanto termos curtos de até 4 caracteres exigem correspondência estrita ou prefixo.
- busca/AC-04: Informar parâmetro `editoria` válido na URL (exemplo: `editoria=Tecnologia`). Esperado: lista exibe apenas artigos da editoria escolhida. Informar `editoria=todas` ou editoria inexistente. Esperado: exibe artigos de todas as categorias sem falhas.
- busca/AC-05: Avaliar ordenação dos resultados encontrados. Esperado: prioriza título exato (peso 4), depois título com erro (peso 3), resumo (pesos 2 e 1.5) e corpo (pesos 1 e 0.5), com desempate pela data de publicação mais recente.
- busca/AC-06: Em buscas com mais de 20 resultados, observar a renderização da paginação. Esperado: limita a exibição a 20 artigos por página e provê links para página anterior e próxima preservando os parâmetros `q` e `editoria` ativos na URL.
- busca/AC-07: Inspecionar a interface de `/busca`. Esperado: exibe pílulas clicáveis para cada editoria disponível e uma opção para Todas, destacando visualmente a opção ativa via `aria-current="page"` e `data-active="true"`.
- busca/AC-08: Buscar termo inexistente com filtro de editoria ativo. Esperado: exibe mensagem de estado vazio amigável com atalho para limpar o recorte de editoria mantendo a busca textual e links para explorar as editorias públicas.
- busca/AC-09: Inspecionar os metadados da página `/busca`. Esperado: metatag robots com valor `noindex, follow` para evitar indexação externa da busca interna.
- Regressão: `pnpm test:run` verde com 858 testes em 83 suítes, `pnpm typecheck` exit 0 e conformidade com Prettier e ESLint.

O plano não é evidência de execução ou aceite de entrega.
