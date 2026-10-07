# VS Code no GradualInfo

Atualização: 2026-10-07. Referência analisada: `/home/jonathan/Workspace/Projetos_Ativos/.vscode/`. As adaptações vivem na `.vscode/` deste projeto; os arquivos compartilhados da pasta pai não foram alterados.

## O que mudou

- `settings.json`: mantém Prettier, ESLint, TypeScript local e Tailwind 4; acrescenta LF, indentação de 2 espaços, exclusão de saídas geradas de busca/watchers e Emmet apenas em TSX. Prettier é o formatador; ESLint aplica correções. Preferências visuais, fontes, temas e shell da pasta pai não foram impostas ao projeto.
- `extensions.json`: preserva o núcleo recomendado anteriormente. O suporte de depuração Node/Chrome já vem no VS Code; não é necessário copiar todas as recomendações da pasta pai. Vitest e Playwright continuam recomendados explicitamente.
- `tasks.json`: 20 tarefas, todas correspondentes a scripts existentes do package.json. Usa execução `process`, com `cwd` do workspace. Build padrão = `build:next`; teste padrão = `test:run`. Comandos de deploy não foram adicionados. Tarefas não iniciam automaticamente.
- `launch.json`: Next em Turbopack ou webpack, servidor com Chrome, produção local na porta 3212, Vitest com arquivos em série, Playwright `--debug` e Storybook. O padrão de prontidão do Next usa `- Local:` conforme a documentação instalada. Os entrypoints são arquivos JS locais, não shims de shell do pnpm.
- `gradualinfo.code-snippets`: componentes, GET e teste Vitest; JSX apenas em `typescriptreact`; classe condicional com `cn`; estado usado no componente interativo; GET não ecoa payload sem validação. Autoria Aqua9 e tags JSDoc não padronizadas não foram propagadas.
- `gradualinfo-jsdoc.code-snippets`: documentação do porquê e dos contratos, sem autoria fictícia nem obrigação de header em todo arquivo.
- `mcp.json`: Next DevTools e Playwright adaptados da referência com `type: stdio`, diretório do workspace e Playwright isolado. Não copia tokens, RAG Aqua9, memória compartilhada, GitHub ou fetch. Os comandos de aquisição de pacotes foram mantidos da referência; versões não estão pinadas e a disponibilidade desses servidores não foi verificada nesta execução. Não equivale à configuração do Codex; `.agents/mcp.json` é um arquivo separado.
- `.gitignore`: permite versionar tarefas, launch, MCP sem segredos e os snippets GradualInfo; perfis locais continuam ignorados.

## Problemas encontrados na referência

Tarefas chamavam scripts ausentes neste projeto: `format:fix`, `check:fast`, `test:native`, `test:unit`, `test:watch`, `validate:boilerplate`, `create:aqua9`. A depuração full stack esperava a saída antiga do Next. Snippets permitiam JSX em `.ts`, geravam estado não usado e atribuíam autoria Aqua9. A configuração MCP não declarava `type`; o formato atual do VS Code exige esse campo para servidores stdio.

## Uso

Abra a pasta **a9_w_gradualinfo** como workspace. Use **Tasks: Run Task** para comandos e **Run and Debug** para depuração. Antes do perfil de produção local, execute `pnpm: build:next` e confirme sucesso; o perfil não compila automaticamente. Se abrir apenas a pasta pai, a configuração compartilhada é a usada naquele workspace; os arquivos locais não substituem automaticamente aquele workspace.

## Validação e limites

PASS: sete arquivos de configuração parseados como JSON/JSONC, vinte tarefas confrontadas com o package.json, entrypoints de launch existentes, snippets JSX com escopo TSX, MCP sem env/credenciais e formato stdio, Prettier em todos os sete arquivos. Perfis temporários de browser continuam ignorados; arquivos compartilháveis são rastreáveis.

Não executados: F5 no VS Code, inicialização MCP, instalação/ativação de extensões, build ou testes de produto. Esta manutenção não altera os 12 cenários UNVERIFIABLE de produção local/axe e não autoriza merge/deploy.

Referências: [MCP do VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration), [debugging do Vitest](https://main.vitest.dev/guide/learn/debugging-tests), e `node_modules/next/dist/docs/01-app/02-guides/debugging.md` da versão instalada.
