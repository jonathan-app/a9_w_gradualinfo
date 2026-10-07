# MCP (Model Context Protocol) no boilerplate

> O que é: servidores que dão ao agente (Claude Code, Cursor, Codex, etc.)
> ferramentas reais — dirigir o browser, ler o dev server do Next, buscar
> URLs. Sem MCP, o agente só lê arquivos e escreve código; com MCP, ele pode
> testar a app rodando de verdade.

## Separação importante

### MCP de engenharia (P0/P1)

- **Playwright MCP**: automação e E2E quando necessário.
- **Next DevTools MCP**: inspeção local do App Router.
- **Supabase MCP**: uso restrito a ambiente de desenvolvimento.
- **Fetch MCP**: requisições HTTP externas quando necessário.

### MCP do produto (futuro)

- **GradualInfo MCP**: só quando capacidades como `search_articles`, `get_article`, `find_sources` existirem.

## O que o boilerplate traz

- `.agents/mcp.json` — configuração com 4 servidores de engenharia (copie para o
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
| `@supabase/mcp-server`               | Operações Supabase em desenvolvimento           | Quando necessário         |
| `@modelcontextprotocol/server-fetch` | Ler docs/URLs públicas                          | Consultar documentação    |

## Segurança

- MCP servers rodam com as permissões do seu usuário: só ative servidores de
  fonte confiável (os oficiais `@modelcontextprotocol/*`, `@playwright/*`,
  `@supabase/mcp-server`).
- Nunca coloque segredos no `mcp.json` — use variáveis de ambiente.
- O `fetch` server lê URLs públicas; não use para endpoints com credenciais.

### Supabase MCP: restrição obrigatória

O Supabase MCP oficial alerta para riscos de conectar um agente diretamente ao
projeto. Use apenas em desenvolvimento:

```
agente → MCP Supabase → ambiente de desenvolvimento
```

Nunca:

```
agente → produção → database
```

## O que NÃO trazer do repositório de origem

O `scripts/mcp-rag-server.mjs` de origem é específico do motor de conhecimento
(RAG) daquele produto — um boilerplate não nasce com busca semântica sobre o
conteúdo de um site. Se precisar, crie o servidor no produto, não aqui.

## Futuro

Mais tarde, quando as capacidades existirem, podemos criar o **GradualInfo MCP**
com ferramentas como:

- `search_articles`
- `get_article`
- `find_sources`
- `compare_articles`
- `get_price_history`
