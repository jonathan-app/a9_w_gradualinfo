# MCP (Model Context Protocol) no boilerplate

> O que é: servidores que dão ao agente (Claude Code, Cursor, Codex, etc.)
> ferramentas reais — dirigir o browser, ler o dev server do Next, buscar
> URLs. Sem MCP, o agente só lê arquivos e escreve código; com MCP, ele pode
> testar a app rodando de verdade.

## O que o boilerplate traz

- `.agents/mcp.json` — configuração de exemplo com 3 servidores (copie para o
  caminho da sua ferramenta: `mcp.json` raiz, `.claude/`, `.cursor/mcp.json`).
- **Nenhuma dependência nova.** Os servidores rodam por `npx` na primeira
  chamada. Isso é deliberado: `@playwright/mcp` puxa `playwright@1.64.0-alpha`
  para dentro da árvore, e aí `@axe-core/playwright` e `@percy/playwright`
  passam a resolver contra um `playwright-core` **alpha** em vez do `1.63.0`
  que o `@playwright/test` fixa. Um boilerplate não clona alpha para o agente
  conseguir navegar. Se você quiser a versão pinada, instale por conta própria e
  coloque um `overrides` no `pnpm-workspace.yaml` para o `playwright-core`.

## Servidores recomendados

| Servidor                             | Para que serve                                  | Quando ativar             |
| ------------------------------------ | ----------------------------------------------- | ------------------------- |
| `@playwright/mcp`                    | Agente navega/clica/inspeciona a app no browser | Sempre que desenvolver UI |
| `next-devtools-mcp`                  | Métricas, rotas e cache do Next dev server      | Debugar build/rotas       |
| `@modelcontextprotocol/server-fetch` | Ler docs/URLs públicas                          | Consultar documentação    |

## O que NÃO trazer do repositório de origem

O `scripts/mcp-rag-server.mjs` de origem é específico do motor de conhecimento
(RAG) daquele produto — um boilerplate não nasce com busca semântica sobre o
conteúdo de um site. Se precisar, crie o servidor no produto, não aqui.

## Segurança

- MCP servers rodam com as permissões do seu usuário: só ative servidores de
  fonte confiável (os oficiais `@modelcontextprotocol/*` e `@playwright/*`).
- Nunca coloque segredos no `mcp.json` — use variáveis de ambiente.
- O `fetch` server lê URLs públicas; não use para endpoints com credenciais.
