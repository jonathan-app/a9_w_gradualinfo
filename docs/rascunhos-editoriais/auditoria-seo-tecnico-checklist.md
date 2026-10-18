---
title: 'Auditoria SEO técnica: 21 verificações que podem revelar problemas invisíveis'
slug: 'auditoria-seo-tecnico-checklist'
editoria: 'Performance & SEO'
excerpt: 'Problemas invisíveis de SEO técnico não exibem telas de erro para o leitor comum, mas destroem o tráfego orgânico silenciosamente. Um checklist reprodutível em 21 passos cobrindo rastreabilidade, renderização, performance e dados estruturados.'
cover_image: '/artigos/auditoria-seo-tecnico-checklist.jpeg'
author: 'Redação GradualInfo'
published_at: null
status: 'rascunho'
fontes_citadas:
  - titulo: 'Google Search Central: SEO Starter Guide and Technical Audit'
    url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide'
  - titulo: 'W3C: HTML5 Specification and Head Metadata Rules'
    url: 'https://www.w3.org/TR/html52/'
  - titulo: 'Schema.org: Structured Data Schemas for Articles'
    url: 'https://schema.org/NewsArticle'
---

# Auditoria SEO técnica: 21 verificações que revelam problemas invisíveis

Muitas equipes de produto passam meses produzindo conteúdo de alta qualidade e investindo em design sem perceber que mecanismos de busca simplesmente não conseguem rastrear, interpretar ou indexar suas páginas de maneira correta.

Problemas invisíveis de SEO técnico não exibem telas de erro para o leitor comum, mas destroem o tráfego orgânico silenciosamente. Este checklist reúne 21 verificações fundamentais organizadas em quatro pilares técnicos.

---

## Pilar 1: Rastreabilidade e Indexação (Crawlability)

1. **Status HTTP 200 real vs Soft 404**  
   Páginas com conteúdo ausente ou removido devem responder explicitamente com código HTTP 404 ou 410. Responder HTTP 200 com um texto dizendo "Página não encontrada" gera um _Soft 404_, desperdiçando orçamento de rastreamento (_crawl budget_).

2. **Diretiva de Cabeçalho `X-Robots-Tag`**  
   Verifique se respostas com extensões dinâmicas ou arquivos servidos pela borda não estão injetando `noindex, nofollow` em rotas públicas.

3. **Arquivo `robots.txt` sem bloqueios a assets essenciais**  
   O Googlebot precisa renderizar a página como um navegador real. Bloquear diretórios de CSS, JavaScript ou imagens no `robots.txt` impede o rastreador de entender o layout e a responsividade móvel.

4. **Sitemap XML limpo e sincronizado**  
   O arquivo `sitemap.xml` deve conter **apenas** URLs com status HTTP 200, com barra final padronizada e sem parâmetros de consulta não canônicos.

5. **Páginas Órfãs**  
   Todas as páginas publicadas devem possuir ao menos um link interno originado de uma seção navegável do site (categoria, artigo relacionado ou menu).

---

## Pilar 2: Canonicidade e Duplicação de Conteúdo

6. **Tag `link rel="canonical"` autônoma e absoluta**  
   Toda página deve conter a tag canonical apontando para sua própria URL absoluta oficial (incluindo protocolo HTTPS e domínio exato).

7. **Consistência de Apex Domain vs Subdomínio `www`**  
   O tráfego de `www.exemplo.com.br` e `exemplo.com.br` deve convergir para uma única versão canônica via redirecionamento HTTP 301 permanente na borda.

8. **Padronização de Barra Final (`trailingSlash`)**  
   Decida se suas URLs utilizam ou não barra ao final (`/artigo` vs `/artigo/`). O servidor deve redirecionar consistentemente a versão não padrão para a padrão, evitando duplicidade de páginas.

9. **Tratamento de Maiúsculas e Minúsculas**  
   URLs na web diferenciam maiúsculas de minúsculas em caminhos Unix. Assegure que rotas em caixa alta sejam redirecionadas automaticamente para caixa baixa.

10. **Parâmetros de Campanha (UTM e GCLID)**  
    Requisições que chegam com parâmetros de marketing (`?utm_source=...`) devem apontar a tag canonical estritamente para a URL limpa sem query string.

---

## Pilar 3: Metadados Estruturados e Renderização

11. **Hierarquia Semântica de Títulos (`H1` a `H3`)**  
    Cada página deve possuir exatamente uma tag `<h1>` representativa do tema principal. Subtítulos devem respeitar a ordem lógica sem pular níveis hierárquicos.

12. **Meta Title Único e Informativo**  
    O título deve ter entre 45 e 60 caracteres, comunicar o benefício da página e posicionar o termo principal sem acúmulo artificial de palavras-chave (_keyword stuffing_).

13. **Meta Description Persuasiva**  
    Descrições com 120 a 155 caracteres focadas na intenção de busca, atuando como o copy de anúncio orgânico nos resultados do Google.

14. **Dados Estruturados em JSON-LD (`schema.org`)**  
    Artigos editoriais devem incorporar o schema `Article` ou `NewsArticle` com atributos válidos de autor, data de publicação, modificação e imagem destacada.

15. **Open Graph e Twitter Card Tags**  
    Metadados sociais (`og:title`, `og:image`, `og:url`) configurados para assegurar que compartilhamentos em redes e mensageiros exibam cartões ricos.

16. **Atributos `alt` em Imagens**  
    Imagens editoriais devem conter texto alternativo descritivo para acessibilidade e rastreamento de imagens.

---

## Pilar 4: Performance e Headers de Segurança

17. **Largest Contentful Paint (LCP) abaixo de 2,5 segundos**  
    O maior elemento de conteúdo acima da dobra (geralmente imagem de capa ou título principal) deve ser priorizado com pré-carregamento (`priority` ou `preload`).

18. **Cumulative Layout Shift (CLS) inferior a 0,1**  
    Imagens, banners e fontes devem possuir largura e altura explícitas para evitar saltos visuais durante a renderização.

19. **Cabeçalho `Strict-Transport-Security` (HSTS)**  
    Forçar conexões HTTPS em todas as requisições futuras com `max-age=31536000; includeSubDomains; preload`.

20. **Política de Segurança de Conteúdo (`Content-Security-Policy`)**  
    Evitar scripts inline não autorizados e restringir origens de conexão, prevenindo injeções maliciosas que descaracterizem a página.

21. **Cabeçalho `X-Content-Type-Options: nosniff`**  
    Impedir navegadores de tentar adivinhar tipos MIME divergentes, garantindo integridade no carregamento de folhas de estilo e scripts.
