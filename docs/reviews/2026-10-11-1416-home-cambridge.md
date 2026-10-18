# Home Cambridge — entrega local

Implementado: quatro componentes pedidos, CSS Module exclusivo, orquestração da home, spec e testes preparados. Header, globals.css, layout, páginas de artigo, ArticleBody, compartilhamento, capa compartilhada e reading.ts preservados.

A base foi extraída de 20261011-11:01 - a9_w_gradualinfo.zip e recebeu o patch OLD_gradualinfo-editorial-local: aplicador conferiu os hashes e aplicou 36 arquivos. Esta entrega pressupõe esse patch já instalado.

Conferências executadas nesta entrega: manifesto de hashes, aplicação em cópia isolada, reaplicação idempotente e comparação dos oito arquivos protegidos; bloqueio de divergência antes da escrita. Resultado registrado em verificacao.json na raiz do pacote.

Não executados: typecheck, lint, format:check, Vitest, build e Playwright. Tentativa de pnpm install --offline --frozen-lockfile --ignore-scripts bloqueada por ERR_PNPM_UNSUPPORTED_ENGINE: exigido >=12.5.1, disponível 11.25.0. Sem dependências instaladas do projeto. Não há aprovação visual, de acessibilidade, runtime ou implantação desta home.

/check no projeto: pnpm check:all; pnpm test:editorial; pnpm build:next. Conferir desktop, tablet, mobile, claro/escuro, foco, capas e âncoras. A regressão de artigo existente permanece intacta. O teste unitário antigo de home foi adaptado para componentes reais e inclui baixa quantidade de posts e expansão da editoria.

O limite da consulta mudou de 10 para 60 conforme esta composição; “Ver todos” expande somente os posts carregados. Não há paginação global nem rotas fictícias. Nenhum conteúdo, autor, data de publicação ou newsletter foi inventado. Categorias do catálogo atual, sem reclassificação de conteúdo.

Próxima etapa: /check verify. Sem push, merge, deploy ou publicação de rascunhos.
