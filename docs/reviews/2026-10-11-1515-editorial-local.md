# GradualInfo — primeira versão editorial local

Autorização: “Sinal Verde!”, após a orientação do proprietário de desenvolver e avaliar layout e mecânica dos posts na própria máquina. Esta entrega não aprova produção, merge, publicação editorial ou os critérios remotos das specs 0006/0011.

## O que mudou

- `pnpm dev:editorial` inicia Next em `127.0.0.1:3000`, sem precisar de Sanity, Supabase, tokens ou Wrangler para as páginas editoriais.
- O catálogo deriva dos seis Markdown existentes em `docs/rascunhos-editoriais/`. O início do servidor sincroniza campos e corpo, verifica capas e codifica os nomes dos arquivos (incluindo `?`). Não cria os outros dez artigos nem modifica documentos remotos.
- O modo exige `NODE_ENV=development`, `EDITORIAL_LOCAL=1` e origem loopback. O servidor escuta somente em loopback. O atalho do proxy limita-se à home e aos artigos; as guardas de admin e APIs de preview permanecem no fluxo existente.
- Banner de prévia, `noindex` e ausência de analytics distinguem o ambiente. Os registros continuam como rascunhos, sem data pública inventada ou JSON-LD de publicação.
- Página com hierarquia editorial, capa responsiva e fallback, texto até 720 px, sumário extraído da mesma árvore Markdown, âncoras únicas, tempo aproximado de leitura, compartilhamento com alternativa manual e outras leituras (mesma editoria primeiro; depois ordem da listagem).
- Tabelas e código possuem áreas de rolagem por teclado; o sumário é recolhível. A regra de fonte de sistema recebeu fallback CSS válido, sem download de fontes.
- `.next-editorial` separa o cache da prévia do build regular. O site regular continua usando os serviços existentes.

## Verificação realizada

| Verificação                              | Resultado desta cópia                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                               | PASS                                                                                                                               |
| ESLint global                            | PASS                                                                                                                               |
| Vitest                                   | 568/568, 53 suítes; inclui 16 novos casos editoriais                                                                               |
| Formatação dos arquivos autorais tocados | PASS                                                                                                                               |
| Formatação global                        | Falha: oito arquivos preexistentes e preservados têm avisos                                                                        |
| Next 16.4 / Webpack, produção            | PASS, exit 0                                                                                                                       |
| HTTP local                               | Home e seis artigos 200; seis capas 200; títulos e âncoras conferidos; slug inexistente 404; `noindex` nos artigos                 |
| Chunks de cliente do build               | 45 arquivos JS inspecionados; os seis títulos do catálogo local não foram encontrados. Isto não é uma auditoria geral de segredos. |
| Playwright desktop/celular               | 14 cenários descobertos; execução em navegador e inspeção visual pendentes                                                         |
| Adaptação OpenNext `--skipNextBuild`     | FAIL: ausência de `.next/server/instrumentation.js.nft.json` ao adaptar o build Webpack                                            |

A instalação do Chromium falhou: o download fornecido não era um ZIP válido. Nenhuma aprovação visual, de contraste, ausência de overflow no navegador, funcionamento do clipboard real ou comportamento mobile é afirmada. Os testes com DOM simulado não substituem essas verificações.

O OpenNext foi tentado sobre a saída Webpack aprovada, sem recompilar e sem publicar. A falha de adaptação não foi investigada como defeito novo do layout. O comando padrão `pnpm build` com instalação limpa e Turbopack continua pendente nesta rodada; não há novo Worker aprovado.

Os oito avisos de Prettier são nos seis Markdown de rascunho, no relatório `2026-10-11-0655-verify-0006-transicao-editorial-sanity.md` e em `resultado.json`. Esses arquivos não foram formatados para não alterar silenciosamente a redação ou os hashes dos relatórios anteriores. Logo, não se afirma que `pnpm check:all` passou integralmente nesta cópia.

## Proveniência e limites

Fonte: ZIP `20261011-11:01 - a9_w_gradualinfo.zip`. Cópia extraída isolada, sem `.git`, dependências, ambientes locais ou bundles de servidor. Não há SHA Git novo. A entrega contém manifesto de hashes das entradas originais e das saídas autorais para aplicação seletiva.

Node 24.19.0; Next 16.4.0. Foi reutilizada uma árvore de dependências já instalada de outra extração; não houve instalação nova com `--frozen-lockfile`. Os resultados não substituem validação com o lockfile na máquina do proprietário.

A sequência final TypeScript → ESLint → Vitest foi acompanhada de manifestos antes/depois de **153 arquivos de aplicação, testes e configuração**, sem diferenças nesse conjunto. Em `docs/reviews/evidence/2026-10-11-1515-editorial-local/`: `source-before.json`, `source-after.json`, `checks.json` e logs completos dos três comandos; `next-webpack.log` registra separadamente o build final e `format-touched.log` a formatação autoral. Isso não equivale a um checkout Git limpo ou a uma instalação congelada.

Evidência HTTP: `docs/reviews/evidence/2026-10-11-1515-editorial-local/http-local.json`. O relatório não atribui nenhuma requisição ao Cloudflare nem ao runtime publicado. Sanity, Access, MFA, Durable Objects, revogação e os gates anteriores continuam com seus próprios estados pendentes.

## Revisão local pelo proprietário

1. Aplicar a atualização seletiva, com verificação dos hashes e backup.
2. Com dependências instaladas, executar `pnpm dev:editorial` e abrir `http://127.0.0.1:3000`.
3. Conferir especialmente `/artigos/diagnosticar-erro-500-503-site`: desktop, celular, tema escuro, sumário, tabelas, código, capas e compartilhamento.
4. Para regressão em navegador: instalar o Chromium pelo Playwright do projeto e executar `pnpm test:editorial` (sem outro servidor na porta 3200).
5. Aprovar a direção visual ou pedir ajustes. Nenhuma publicação ocorre nessa etapa.
