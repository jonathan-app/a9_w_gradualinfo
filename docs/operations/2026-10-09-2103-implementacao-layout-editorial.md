# Implementação local do layout editorial 0010

Spec Accepted por escolha explícita do proprietário: `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`.

Home mantém a consulta de dez publicados, distribui capa, dois secundários e até sete recentes sem repetição. Novos componentes EditorialStory e EditorialCover apresentam os campos contratados, com fallback neutro e capa decorativa. O helper nullable compartilha a validação existente; coverImageUrl mantém o contrato de SEO. A largura pública usa marcador e CSS no ancestral main somente da home; estrutura administrativa e header preservados.

Artigo apresenta Início, editoria, título, resumo, autor e data antes da capa. Corpo máximo 720 px, tamanho 18 px e entrelinha 1,7; links sublinhados, tabelas e código com overflow interno. Fontes permanecem após o corpo. Nenhuma ativação editorial, consulta nova, alteração de segurança, merge ou deploy.

## Verificação

Typecheck e lint dos arquivos da feature PASS. Prettier da feature PASS. Suíte normal: 308 PASS, 18 testes gates bloqueados por spawnSync git EPERM. Servidor porta 3012 bloqueado por listen EPERM. Reexecuções ampliadas solicitadas para gates e servidor, sem resultado disponível neste registro. Provas visuais nas cinco larguras, teclado, dois temas e comparação administrativa pendentes; não declarar ACs aprovados por testes unitários.

Bloqueio independente da home sob falha editorial permanece conforme relatório de 20:29 e workflow/STATE.md. Implementação não converte erros em vazio ou notFound.

## Arquivos e hashes da implementação

- `app/page.tsx`: `d4491503d349aa07bc015fb95d2837c1ea887dc7bca8aabb57096936c1044b23`
- `app/artigos/[slug]/page.tsx`: `e0cc303a8ebcdaf701b06556febbaab48815a6de62c8156c5dc8e434f1f327e0`
- `app/globals.css`: `c2342ed52380d75fd20590d115a8d81ffdd856d880c3db3105ac2392ca6d753c`
- `lib/editorial-images.ts`: `61f6309112a1a5ce94a6bce1ab69869e84d2837071d819f82dcedc03deac060e`
- `components/shared/editorial-cover.tsx`: `35c8cdb65394327b074fde8e01068e86111bbbcc8fe0316dd9846078982466f9`
- `components/shared/editorial-story.tsx`: `6d54d5cde8f9f860bd34025b006e77a8a5a4e8b4f07b9514be5e90aab3328793`

Próxima etapa: /check verify da spec 0010, com evidências datadas em docs/reviews/. Há trabalho local não commitado de outras sessões; preservar e verificar árvore exata antes do gate.
