# 0016. Revisão editorial dos dez novos rascunhos

**Date**: 2026-10-12  
**Status**: Accepted  
**Decision source**: o proprietário aprovou explicitamente a spec 0016 em 2026-10-12 após receber o texto proposto, confirmando a revisão local dos dez rascunhos com evidência por afirmação e preservação dos seis já revisados.

## Summary

Revisar os dez artigos importados do arquivo `gradualinfo-16-artigos.md` antes de qualquer publicação. O trabalho produz Markdown local com fatos verificados, fontes rastreáveis, metadados consistentes e uma ordem editorial recomendada para os 16 artigos. Os seis textos aprovados na spec 0015 servem de referência e permanecem preservados.

## Context

A importação local registrou dez novos arquivos com `revisao_editorial: 'pendente'`. Eles ainda têm listas de fontes vazias, cinco ocorrências de `[fonte a confirmar]` e seções que começam em `h3` logo após o título. O documento de origem os classifica como rascunhos e pede validação antes de publicar. O catálogo local e as capas já existem; esta decisão trata do conteúdo editorial, sem mudar a aplicação.

## Requirements

- **editorial-ten/AC-01**: Os dez arquivos identificados em `## Corpus` são revisados individualmente. Os seis arquivos cobertos pela spec 0015 conservam seu conteúdo e seus metadados. Qualquer necessidade de correção nesses seis vira apontamento separado.
- **editorial-ten/AC-02**: Cada afirmação técnica, numérica, comercial ou sobre capacidades do GradualInfo tem evidência verificável. A matriz editorial registra afirmação, fonte primária ou evidência do repositório, data da consulta, resultado (`Confirmado`, `Desatualizado`, `Incorreto` ou `Não verificado`) e ação textual. Valores sujeitos a mudança, como preços, limites, versões e status de beta, são verificados na data da revisão.
- **editorial-ten/AC-03**: Nenhum marcador `[fonte a confirmar]` ou referência opaca `[web:n]` permanece nos dez textos aprovados. `fontes_citadas` contém título e URL primária válida para as afirmações apoiadas externamente. Afirmações sem prova suficiente são removidas, reformuladas como hipótese claramente identificada ou deixam o artigo pendente; uma URL genérica não conta como confirmação de uma afirmação específica.
- **editorial-ten/AC-04**: Cada artigo é útil para estudantes de programação e desenvolvedores em evolução: explica os termos necessários, evita promessas e resultados inventados e entrega ao menos um procedimento, checklist ou critério de decisão que o leitor possa aplicar. Comandos e exemplos técnicos são executados ou conferidos contra documentação oficial, com versão e condições anotadas na matriz.
- **editorial-ten/AC-05**: Cada frontmatter mantém `status: 'rascunho'` e contém `title`, `slug` único, `editoria` válida, `excerpt` de 140 a 160 caracteres, `cover_image` existente em `public/`, `author` padronizado e `fontes_citadas` com título e URL. O slug só muda se houver conflito ou erro material documentado; qualquer mudança é refletida no catálogo e nos links internos.
- **editorial-ten/AC-06**: O corpo tem um único `h1` e seções em `h2`, com `h3` apenas dentro de uma seção `h2`. Tabelas e blocos de código são legíveis no leitor local. A capa mantém `alt=""` quando decorativa ou redundante; informação única da imagem é reproduzida em texto no artigo. O contrato visual aprovado na spec 0013 é preservado.
- **editorial-ten/AC-07**: Um relatório datado em `docs/reviews/` registra a matriz factual, o resultado editorial por artigo e uma ordem recomendada dos 16 textos, justificando dependências entre temas e distinguindo os dez em revisão dos seis aprovados. A ordem não atribui datas nem publica conteúdo.
- **editorial-ten/AC-08**: Após revisão, `scripts/sync-editorial.mjs` gera um catálogo local com 16 slugs únicos e capas existentes. A paridade entre cada Markdown e seu registro é verificada, e as 16 rotas locais são conferidas quanto a corpo, headings, tabelas, código e capa. Nenhum envio ao Sanity ou deploy ocorre nesta etapa.
- **editorial-ten/AC-09**: Um artigo só sai de `revisao_editorial: 'pendente'` após cumprir AC-02 a AC-06. O valor aprovado é registrado como `revisao_editorial: 'aprovada'`. Se faltarem fontes ou testes, ele permanece pendente e o relatório aponta o bloqueio. `status: 'rascunho'` permanece em todos os casos.

## Corpus

| Tema                      | Slug                                              |
| ------------------------- | ------------------------------------------------- |
| Performance visual        | `otimizar-velocidade-site-sem-perder-design`      |
| Next.js e Cloudflare      | `nextjs-cloudflare-workers-producao`              |
| Observabilidade           | `logs-metricas-traces-diagnostico`                |
| Segurança antes do deploy | `checklist-seguranca-aplicacao-deploy`            |
| IA e produtividade        | `usar-ia-produtividade-com-controle-de-qualidade` |
| Produtividade sustentável | `sistema-produtividade-digital-sustentavel`       |
| IA gratuita e paga        | `ferramentas-ia-gratuitas-vs-pagas`               |
| Site como ativo digital   | `transformar-site-conteudo-ativo-digital`         |
| SEO e conversão           | `seo-palavras-chave-conversoes`                   |
| Arquitetura de conteúdo   | `arquitetura-conteudo-seo-clusters`               |

## Decision

**Chosen option**: revisar os Markdown locais um artigo por vez, usando a spec 0015 e `diagnosticar-erro-500-503-site.md` como padrão editorial. Uma matriz de evidências mantém cada afirmação ligada à fonte e ao ajuste. O estado de revisão fica no frontmatter; o estado de publicação continua `rascunho`.

**Implementation skills**: `/develop` para revisar conteúdo e sincronizar o catálogo, `/check verify` para comprovar os critérios, `/check review` para auditar o resultado e `/sync` para atualizar o contexto durável após os gates.

## Feature design

**Fonte de dados**: os dez Markdown em `docs/rascunhos-editoriais/`, a documentação oficial pertinente e, para afirmações sobre o GradualInfo, arquivos e evidências do próprio repositório. A matriz factual é produzida em `docs/reviews/YYYY-MM-DD-HHmm-*.md`.

**Estados**: `pendente` passa a `aprovada` somente por revisão concluída. Uma correção posterior reabre a revisão como `pendente`. `status: 'rascunho'` não muda por causa de aprovação editorial.

**Falha de verificação**: se a fonte oficial estiver indisponível, a afirmação e o artigo permanecem pendentes. Se um comando depender de credenciais ou ambiente remoto indisponível, o texto não deve prometer que foi executado; a matriz registra o limite e o artigo só é aprovado se a redação puder ser sustentada sem essa execução.

**Integridade**: preservar os seis arquivos da spec 0015 e os componentes do leitor. Registrar hashes antes e depois; sincronizar `lib/editorial/local-posts.json` somente a partir dos Markdown. O relatório separa aprovação editorial de publicação.

## Options considered

- **Revisão local com matriz por afirmação**, recomendada: mantém proveniência e permite validar um texto de cada vez sem alterar a fonte publicada.
- **Importação direta no Sanity**: encurta o caminho operacional, mas mistura rascunho não verificado com a fonte editorial ativa.
- **Correção apenas dos marcadores de fonte**: resolve sinais visíveis de incompletude, mas deixa comandos, dados variáveis, hierarquia e alegações do projeto sem prova.

## Rationale

O mesmo padrão aplicado aos seis primeiros artigos evita dois níveis de qualidade no catálogo. A revisão por artigo limita retrabalho quando uma fonte falha e deixa claro quais textos estão prontos. A matriz distingue documentação consultada de teste realmente executado, especialmente nos artigos sobre Cloudflare, ferramentas de IA e o próprio GradualInfo.

## Build plan

1. **/develop, primeira fatia**: registrar hashes dos seis artigos protegidos, revisar um dos dez novos do início ao fim, criar a matriz factual e conferir seu resultado no leitor local. Essa fatia fixa o formato de evidência para os demais. Atende AC-01 a AC-06 e AC-09.
2. **/develop, demais artigos**: revisar os outros nove com o mesmo contrato, conferir dados variáveis na data da revisão, resolver marcadores de fonte e ajustar headings, exemplos e metadados. Atende AC-02 a AC-06 e AC-09.
3. **/develop, catálogo e ordem**: sincronizar o catálogo, verificar paridade e 16 rotas locais, registrar uma ordem conjunta dos 16 e os bloqueios remanescentes no relatório datado. Atende AC-07 e AC-08.
4. **/check verify e /check review**: testar os nove critérios com evidência, conferir hashes dos seis preservados e auditar as matrizes. Qualquer artigo pendente permanece indicado como tal. Depois, `/sync` atualiza o escopo e o bastão.

## Consequences

A revisão fica rastreável e pode ser feita por partes. A consulta a fontes oficiais e a execução de exemplos demandam tempo; alguns textos podem continuar pendentes. A aprovação editorial não concede autorização para publicação.

## Follow-up

- Obter aceite explícito do proprietário para esta spec antes de `/develop`.
- Após os gates editoriais, decidir separadamente se e quando cada artigo será publicado no Sanity.
