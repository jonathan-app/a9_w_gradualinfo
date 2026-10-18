---
title: 'Next.js na Cloudflare Workers: arquitetura, limites e decisões que importam em produção'
slug: 'nextjs-cloudflare-workers-producao'
editoria: 'Desenvolvimento Web'
excerpt: 'Rodar Next.js na Cloudflare Workers viabiliza escala global e baixa latência sob arquitetura adequada, exigindo atenção a limites de CPU e memória.'
cover_image: '/artigos/nextjs-cloudflare-workers-producao.jpeg'
author: 'Redação GradualInfo'
published_at: null
status: 'rascunho'
revisao_editorial: 'aprovada'
fontes_citadas:
  - titulo: 'OpenNext Documentation: Next.js on Cloudflare Workers'
    url: 'https://opennext.js.org/cloudflare'
  - titulo: 'Cloudflare Workers Documentation: Limits and Limitations'
    url: 'https://developers.cloudflare.com/workers/platform/limits/'
  - titulo: 'Cloudflare Workers Documentation: Observability and Tracing'
    url: 'https://developers.cloudflare.com/workers/observability/'
  - titulo: 'Cloudflare Workers Documentation: Known limitations of tracing'
    url: 'https://developers.cloudflare.com/workers/observability/traces/known-limitations/'
  - titulo: 'Wrangler Documentation: Configuration'
    url: 'https://developers.cloudflare.com/workers/wrangler/configuration/'
  - titulo: 'Next.js Documentation: Deploying to Cloudflare'
    url: 'https://nextjs.org/docs/app/building-your-application/deploying/cloudflare'
---

# Next.js na Cloudflare Workers: arquitetura, limites e decisões que importam em produção

Executar Next.js na Cloudflare Workers representa uma mudança fundamental em relação ao modelo clássico de hospedagem em contêineres ou servidores dedicados. Em vez de manter um processo Node.js de longa duração aguardando conexões em uma máquina virtual estática, sua aplicação é compilada em WebAssembly e JavaScript que rodam sob demanda em centenas de data centers ao redor do planeta, executados pelo runtime V8 isolado da Cloudflare (_workerd_).

Essa arquitetura viabiliza baixa latência e elasticidade instantânea sob perfis de tráfego distribuídos quando o cache de borda e as consultas assíncronas são bem estruturados. Contudo, ela impõe contratos estritos de desenvolvimento que não perdoam suposições típicas do ecossistema Node tradicional.

---

## 1. A cadeia de compilação e adaptação arquitetural

O ecossistema oficial do Next.js foi concebido prioritariamente para execução em Node.js ou na infraestrutura da Vercel. Para executá-lo na Cloudflare Workers, a comunidade e a Cloudflare utilizam o adaptador **OpenNext**:

```text
Código Next.js (App Router)
            │
            ▼
Build nativo (next build)
            │
            ▼
Adaptador OpenNext (@opennextjs/cloudflare)
            │
            ▼
Bundle Otimizado para o runtime workerd
            │
            ▼
Deploy e Roteamento Global (Wrangler CLI)
```

O OpenNext analisa a árvore compilada do Next.js, substitui APIs incompatíveis do Node por polyfills e bindings nativos da Cloudflare, separa os assets estáticos para entrega direta na CDN e empacota os Server Components e Route Handlers no worker principal.

---

## 2. Diferenças estruturais entre Node tradicional e Cloudflare Workers

Migrar um projeto existente exige mapear onde a borda se diferencia de um servidor dedicado:

| Dimensão Arquitetural | Servidor Node Dedicado (Express / Docker) | Cloudflare Workers Runtime (_workerd_)       |
| :-------------------- | :---------------------------------------- | :------------------------------------------- |
| **Ciclo de Vida**     | Processo contínuo com memória persistente | Isolate descartável iniciado por evento HTTP |
| **File System**       | Acesso direto via `fs.readFile` local     | Sem disco persistente; leitura via Assets/R2 |
| **Conexões de Banco** | Pools TCP persistentes (ex: `pg.Pool`)    | Conexões HTTP/REST, WebSocket ou Hyperdrive  |
| **Camada de Cache**   | Memória de processo ou Redis externo      | Cache API global, KV e cache de borda nativo |
| **Segredos e Config** | Leitura síncrona de `process.env`         | Bindings de ambiente injetados pelo runtime  |

A ausência de um sistema de arquivos local permanente significa que operações como salvar uploads temporários em disco devem ser redirecionadas para buckets de objetos (Cloudflare R2 ou AWS S3).

---

## 3. Fluxo rigoroso de build e validação de deploy

Um dos erros mais comuns de equipes que chegam à plataforma é assumir que um comando `pnpm build:next` bem-sucedido garante que a aplicação funcionará em produção:

```bash
# 1. Build nativo do Next.js
pnpm build:next

# 2. Adaptação completa OpenNext para Cloudflare
pnpm build

# 3. Publicação segura via Wrangler
pnpm deploy
```

O comando `pnpm build` no repositório executa o empacotamento OpenNext. Se o seu código importar uma biblioteca que dependa de bibliotecas nativas C++ (como versões antigas do `sharp` sem binário wasm) ou utilize APIs de rede não suportadas pelo workerd, o build do Next.js passará em silêncio, mas o empacotamento OpenNext falhará ou lançará exceções no primeiro request.

---

## 4. Gestão de segredos e isolamento de variáveis

Na Cloudflare, variáveis de ambiente são configuradas no arquivo de manifesto (`wrangler.jsonc`) ou armazenadas como segredos criptografados:

```text
Públicas (Injetadas em tempo de compilação):
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL

Secretas (Injetadas pelo runtime na borda):
SUPABASE_SERVICE_ROLE_KEY
PREVIEW_SECRET
ADMIN_JWT_SECRET
```

### Regras indispensáveis de segurança:

1. **Nunca utilize `NEXT_PUBLIC_` para credenciais**: Qualquer variável iniciada com esse prefixo é copiada literalmente para o código JavaScript enviado ao navegador do usuário.
2. **Utilize o cofre da plataforma**: Em produção, adicione segredos executando `pnpm wrangler secret put NOME_DA_VARIAVEL`, mantendo os arquivos `.env.local` e `.dev.vars` rigorosamente fora do controle de versão (Git).

---

## 5. Estratégias de cache e invalidação na borda

O cache de borda da Cloudflare é extremamente veloz, mas se for configurado sem critério, exibirá páginas desatualizadas ou vazará informações confidenciais:

- **Artigos editoriais públicos**: Devem utilizar `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`, permitindo que o usuário receba resposta instantânea da borda enquanto o worker revalida o conteúdo em segundo plano.
- **Painéis administrativos e rascunhos**: Exigem `Cache-Control: private, no-store, no-cache, must-revalidate` obrigatório para impedir que gateways intermediários armazenem dados protegidos.
- **Invalidação via Tags ou Purge**: Quando um novo artigo é publicado no CMS, um webhook de automação deve emitir um purge específico da URL na Cloudflare, garantindo atualização em menos de 5 segundos.

---

## 6. Coordenação e estado com Cloudflare Durable Objects

Enquanto o Worker comum é sem estado (_stateless_) e pode ser instanciado em dezenas de regiões simultaneamente, os **Durable Objects (DO)** fornecem coordenação global consistente:

```
[Cliente A - São Paulo] ──┐
                          ▼
[Cliente B - Londres]   ──┼──► [Durable Object Único] ──► (Armazenamento Transacional)
                          ▲
[Cliente C - Tóquio]    ──┘
```

### Casos de uso ideais para Durable Objects:

1. **Sessões de Preview**: Armazenamento em memória de tokens efêmeros de pré-visualização editorial com revogação instantânea e validação criptográfica.
2. **Rate Limiting Distribuído**: Contabilização exata de tentativas de login administrativo sem concorrência ou janelas de colisão entre data centers.
3. **WebSockets e Colaboração**: Salas de conferência ou edição em tempo real onde múltiplos usuários interagem no mesmo documento.

---

## 7. Limites operacionais que definem a arquitetura

Compreender os limites vigentes da plataforma evita surpresas desagradáveis em produção (dados conferidos na documentação oficial de limites da Cloudflare):

- **CPU Time por Requisição HTTP**: O runtime monitora estritamente o tempo real de processamento na CPU. No plano gratuito (Free), o limite é de **10 ms de CPU por requisição** (o antigo limite de 50 ms pertencia ao plano legado _Bundled_). No plano pago (Paid), o teto é de **30 segundos de CPU por padrão**, podendo ser configurado até **5 minutos (300 s)** via `limits.cpu_ms` no `wrangler.jsonc` para tarefas intensivas. Operações de espera de rede e I/O assíncrono (aguardar resposta de banco ou APIs externas) não consomem CPU time.
- **Tamanho do Worker (Script Size)**: O limite de tamanho do código compilado é de **64 MiB descomprimido** tanto no plano gratuito quanto no pago. A plataforma não impõe restrição em tamanho comprimido de 1 MB / 10 MB, mas bundles extensos afetam a inicialização a frio (_cold start_).
- **Sub-requisições HTTP**: Limite padrão de até 50 sub-requisições por chamada no plano Free e 1.000 no plano Paid.
- **Limitações Conhecidas de Tracing**: A Cloudflare documenta expressamente que contextos de rastreamento distribuído (como headers `traceparent` de OpenTelemetry) não são automaticamente propagados para serviços externos sem instrumentação manual explícita.

---

## 8. Matriz de diagnóstico para falhas frequentes

| Sintoma de Falha                        | Causa Técnica Provável                          | Ação de Correção Recomendada                            |
| :-------------------------------------- | :---------------------------------------------- | :------------------------------------------------------ |
| `pnpm build` quebra com `Dynamic Code`  | Uso de `eval()` ou geração de código proibida   | Remover bibliotecas que geram código dinâmico           |
| Erro 503 na rota administrativa         | Durable Object não publicado ou sem migration   | Executar `wrangler migrations list` e `wrangler deploy` |
| Erro `ReferenceError: Buffer is not...` | Dependência que assume Node.js global           | Importar `node:buffer` explicitamente via Node Polyfill |
| Queda de conexão com banco de dados     | Esgotamento de conexões TCP por requisição      | Habilitar pooling HTTP (Supabase pooler / Hyperdrive)   |
| Conteúdo estático com erro 404          | Assets não sincronizados ou pasta `public` fora | Conferir configuração de assets estáticos no Wrangler   |

---

## 9. Quando adotar esta arquitetura

A combinação de Next.js com Cloudflare Workers é a escolha ideal quando:

- O produto necessita de alcance global com carregamento quase instantâneo em qualquer continente.
- A maior parte do tráfego é de leitura com conteúdo renderizado no servidor ou gerado estaticamente.
- A equipe busca custos operacionais previsíveis, aproveitando a gratuidade de tráfego de saída (_zero egress fees_) da Cloudflare.

Se sua aplicação necessita de rotinas em lote de longa duração (mais de 15 minutos de processamento ininterrupto de vídeo ou inteligência artificial) ou depende de bibliotecas legadas de baixo nível em C++, um contêiner tradicional ou função serverless em Node.js continua sendo a opção mais segura.

---

## 10. Decisão técnica e critérios de escolha

Antes de migrar ou iniciar um projeto nessa stack, valide estes quatro critérios no time:

1. **Dependências do projeto**: Todas as bibliotecas de terceiros funcionam no runtime workerd sem depender de binários nativos?
2. **Acesso ao banco de dados**: O banco oferece endpoint HTTP/WebSockets ou pooler de conexões compatível com serverless?
3. **Ambiente de homologação**: A equipe dispõe de fluxo para testar deploys reais em workers de staging antes do tráfego de produção?
4. **Governança de segredos**: Os desenvolvedores compreendem a separação estrita entre variáveis de build e segredos de runtime?

---

## 11. Próximo passo prático

Execute uma auditoria de dependências no seu `package.json`. Identifique pacotes que utilizam `node:fs`, `node:child_process` ou drivers nativos de banco e valide sua compatibilidade com o runtime workerd consultando a documentação oficial do OpenNext e da Cloudflare.
