---
title: 'Construindo o GradualInfo: decisões reais, testes e aprendizados de um projeto digital'
slug: 'construindo-gradualinfo-estudo-de-caso'
editoria: 'Engenharia de Software'
excerpt: 'Por trás da arquitetura do GradualInfo: Next.js 16 no Cloudflare Workers, transição editorial para headless CMS, autenticação resiliente com Supabase e as lições aprendidas ao unir edge computing, tipagem estrita e rigor de qualidade.'
cover_image: '/artigos/construindo-gradualinfo-estudo-de-caso.jpeg'
author: 'Equipe de Engenharia GradualInfo'
published_at: null
status: 'rascunho'
fontes_citadas:
  - titulo: 'Next.js 16 Documentation: App Router Architecture'
    url: 'https://nextjs.org/docs'
  - titulo: 'Cloudflare Workers & OpenNext: Next.js on the Edge'
    url: 'https://opennext.js.org/cloudflare'
  - titulo: 'Supabase Architecture and Row Level Security'
    url: 'https://supabase.com/docs/guides/database/postgres/row-level-security'
  - titulo: 'Sanity.io Content Lake: Structured Content Specification'
    url: 'https://www.sanity.io/docs/content-lake'
---

Criar uma plataforma editorial moderna hoje envolve muito mais do que subir um CMS tradicional ou um template estático pré-configurado. O ecossistema exige carregamento instantâneo em escala global, segurança rigorosa contra abusos e scraping malicioso, infraestrutura escalável sem custo proibitivo e integridade de conteúdo entre redação e produção.

O **GradualInfo** nasceu com esse objetivo: não apenas como um portal de informação técnica, mas como um laboratório vivo de engenharia de software onde as decisões de arquitetura, testes de estresse e transições tecnológicas são documentados de forma transparente.

Neste estudo de caso, compartilhamos os bastidores da engenharia da plataforma: os motivos das escolhas técnicas, os desafios de rodar o Next.js 16 no edge e o que aprendemos durante o processo.

---

## 1. A Arquitetura em Três Pilares: Borda, Aplicação e Conteúdo

Ao desenhar a infraestrutura, estabelecemos o princípio de separação clara de responsabilidades:

1. **A Borda (Edge Computing com Cloudflare Workers e OpenNext):** Em vez de manter servidores Node.js tradicionais rodando 24 horas por dia em containers, a aplicação é compilada e executada diretamente na rede global da Cloudflare através do OpenNext. Isso assegura latência mínima próxima ao leitor, proteção nativa contra DDoS e execução distribuída.
2. **A Camada de Aplicação e Autenticação (Supabase):** O Supabase gerencia o controle de acesso, dados estruturados da aplicação e autenticação com suporte a MFA (Multi-Factor Authentication / AAL2) e Row Level Security (RLS) estrita no PostgreSQL.
3. **A Fonte Editorial Primária (Sanity CMS):** Para o fluxo da redação, o Sanity atua como repositório de conteúdo estruturado via GROQ, desacoplando o ciclo de vida editorial dos deploys de código.

---

## 2. Next.js 16 no Edge: Desafios e Ajustes Críticos

Executar a versão mais recente do Next.js (16.4 com React 19) no ambiente sem servidor (_serverless/edge_) da Cloudflare trouxe aprendizados técnicos imediatos:

### O Fim do `middleware.ts` e a Chegada do `proxy.ts`

No Next.js 16, a convenção histórica do `middleware.ts` foi substituída pelo `proxy.ts`. No Cloudflare Workers, a camada de proxy atua como guardiã da requisição: renova sessões de autenticação de forma segura, aplica barreiras _fail-closed_ contra acesso não autorizado e gerencia headers de cache de acordo com o contexto da rota.

### Isolamento de Runtime e Compatibilidade com Node.js

O ambiente de Workers opera sobre o motor V8 isolado, não sobre o Node.js completo. Para garantir que bibliotecas de criptografia, manipulação de cookies e clientes de banco funcionassem sem falhas em tempo de execução, foi necessário adotar as _compatibility flags_ adequadas (`nodejs_compat`, `global_fetch_strictly_public`) e validar estaticamente os bundles compilados.

---

## 3. Segurança sem Concessões: Fail-Closed e Proteção de Sessão

Uma premissa inegociável na engenharia do GradualInfo é a arquitetura **fail-closed**:

- **Guards de Administração:** Qualquer tentativa de acesso ao painel administrativo sem comprovação criptográfica de sessão e autenticação de dois fatores resulta imediatamente em rejeição HTTP 403, sem expor metadados internos ou stacks de erro.
- **Rate Limiting Distribuído com Durable Objects:** Em vez de depender de caches voláteis em memória (que não sincronizam entre diferentes datacenters da borda), mecanismos de limitação de taxa e controle de sessão utilizam Cloudflare Durable Objects, garantindo consistência atômica e proteção contra ataques de força bruta.
- **Sessões de Preview Seguras:** Autores e revisores têm acesso a previews em tempo real via tokens criptográficos validados em Durable Objects dedicados, assegurando que rascunhos nunca vazem antes da aprovação final.

---

## 4. Rigor de Testes e Engenharia Baseada em Evidências

O mantra adotado pelo time é simples: **"Sem evidência reproduzível, não há conclusão técnica."**

É fundamental distinguir a **comprovação de implementação e configuração** da **comprovação de runtime em produção**:

- **Implementação e Configuração Locais:** Arquivos de infraestrutura (`open-next.config.ts`, `wrangler.jsonc`, `proxy.ts`, `supabase/migrations/`) e suítes automatizadas locais atestam que os contratos de código, políticas RLS e montagem de rotas estão corretamente desenhados e aprovados estaticamente.
- **Camadas de Verificação Automatizada:**
  1. **Testes Unitários e de Componente (Vitest e jsdom):** Validam funções puras, parsers de Markdown, manipulação de rotas e componentes de interface sob restrições rigorosas de cobertura de código.
  2. **Testes Ponta a Ponta (Playwright):** Simulam o comportamento do leitor real no navegador, inspecionando tempos de resposta, transições de rotas e renderização visual no servidor local.
  3. **Barreiras de Verificação Estática e SAST:** Análise estática contínua com Semgrep e varredura de segredos via Gitleaks em todo o histórico git, impedindo que credenciais de API ou tokens privados cheguem aos repositórios.
- **Funcionamento em Produção (Runtime Remoto):** O funcionamento definitivo da infraestrutura distribuída na borda (comunicação remota com Durable Objects instanciados na Cloudflare, sincronização em tempo real do Sanity Studio e métricas CrUX) constitui uma fronteira de validação distinta, que exige a publicação ativa de artigos e a inspeção empírica direta dos endpoints públicos em produção.

---

## Próximos Passos

A construção do GradualInfo continua ativa. À medida que o dataset de produção for povoado com conteúdo editorial definitivo e as migrações dos Durable Objects forem aplicadas no ambiente distribuído da Cloudflare, publicaremos relatórios detalhados com medições de runtime observáveis e dados reais de campo do Chrome User Experience Report (CrUX), sem atalhos e sem maquiagem estatística.
