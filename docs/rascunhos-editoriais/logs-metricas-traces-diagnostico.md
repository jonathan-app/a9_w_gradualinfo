---
title: 'Logs não bastam: como usar traces para encontrar gargalos em aplicações web'
slug: 'logs-metricas-traces-diagnostico'
editoria: 'Engenharia & Confiabilidade'
excerpt: 'Logs, métricas e traces respondem perguntas diferentes. Usar apenas logs dificulta entender o caminho completo de uma requisição e onde o tempo é gasto.'
cover_image: '/artigos/logs-metricas-traces-diagnostico.jpeg'
author: 'Redação GradualInfo'
published_at: null
status: 'rascunho'
revisao_editorial: 'aprovada'
fontes_citadas:
  - titulo: 'OpenTelemetry Documentation: Logs, Metrics, and Traces'
    url: 'https://opentelemetry.io/docs/concepts/signals/'
  - titulo: 'Cloudflare Workers Documentation: Observability — Logs, Metrics, Traces'
    url: 'https://developers.cloudflare.com/workers/observability/'
  - titulo: 'Cloudflare Workers Documentation: Traces'
    url: 'https://developers.cloudflare.com/workers/observability/traces/'
  - titulo: 'Cloudflare Workers Documentation: Known limitations of tracing'
    url: 'https://developers.cloudflare.com/workers/observability/traces/known-limitations/'
  - titulo: 'Google Cloud: Distributed Tracing Overview'
    url: 'https://cloud.google.com/trace/docs/overview'
---

# Logs não bastam: como usar traces para encontrar gargalos em aplicações web

Quando uma aplicação web apresenta lentidão intermitente ou falhas esporádicas em produção, a reação instintiva da maioria dos desenvolvedores é vasculhar arquivos de log. No entanto, em arquiteturas modernas compostas por microsserviços, funções serverless e camadas de borda, confiar exclusivamente em logs resulta em centenas de linhas desconexas que não explicam o trajeto da requisição.

Para diagnosticar problemas de performance com precisão cirúrgica, é fundamental dominar a tríade de observabilidade: logs, métricas e traces distribuídos.

---

## 1. Diferença entre os três sinais: logs, métricas e traces

Cada um dos três pilares responde a uma pergunta específica durante a operação de um sistema:

| Sinal de Observabilidade | Pergunta que Responde                          | Exemplo de Dado Registrado            | Ponto Forte Principal            |
| :----------------------- | :--------------------------------------------- | :------------------------------------ | :------------------------------- |
| **Log**                  | _O que aconteceu neste instante?_              | Mensagem de erro ao consultar banco   | Contexto detalhado e stack trace |
| **Métrica**              | _Qual é o comportamento estatístico agregado?_ | Latência p95 subiu para 1.800 ms      | Detecção imediata de anomalias   |
| **Trace**                | _Por onde a chamada passou e onde travou?_     | Span da API externa consumiu 1.250 ms | Visão cronológica fim a fim      |

Enquanto o log registra fatos discretos e a métrica revela tendências numéricas agregadas, o trace amarra esses eventos ao longo de toda a jornada da requisição entre clientes, servidores e serviços terceiros.

---

## 2. Comece pelos indicadores agregados de métricas

A investigação de incidentes nunca deve iniciar pela leitura cega de logs textuais. Comece sempre pelas métricas agregadas em painéis de monitoramento:

- **Taxas de erro HTTP**: Proporção de respostas 5xx versus volume total.
- **Percentis de latência**: Acompanhe `p50` (mediana do público), `p95` e `p99` (pior experiência sob estresse).
- **Consumo de recursos**: Tempo de CPU gasto no worker, memória RAM e conexões de banco ativas.
- **Latência por rota**: Isole se a lentidão atinge a home ou se concentra em um endpoint específico.

As métricas não identificam a causa-raiz, mas evitam que a equipe perca tempo analisando rotas saudáveis.

---

## 3. Correlacione eventos com identificadores únicos

O maior desafio de sistemas distribuídos é associar logs gerados em serviços diferentes à mesma solicitação do usuário. Para viabilizar a correlação:

1. **Request ID / Ray ID**: Na Cloudflare, cada requisição recebe um cabeçalho único `cf-ray`. Esse identificador deve ser injetado nos logs da aplicação e nos spans de tracing.
2. **Trace ID**: Padrão do OpenTelemetry composto por uma sequência hexadecimal de 32 caracteres compartilhada por todos os nós participantes.
3. **Versão e Ambiente**: Registre sempre a versão (`version_id` do commit) e a região do data center para descartar deploys parciais ou falhas regionais de operadoras.

---

## 4. Como interpretar um trace como linha do tempo

Um trace é composto por uma árvore hierárquica de **spans**. Cada span representa uma unidade lógica de trabalho com horário de início, duração e metadados contextuais:

```text
[Requisição HTTP GET /artigos/slug] ──────────────────────── (1.450 ms)
   ├─► [Proxy Middleware / Auth Check] ─────────── (25 ms)
   ├─► [Server Component Execution] ────────────── (180 ms)
   │     ├─► [Supabase DB Query: getPost] ──────── (45 ms)
   │     └─► [External CMS Fetch: Sanity CDN] ─── (1.120 ms) ◄── Gargalo
   └─► [Stream HTML Response to Client] ────────── (80 ms)
```

No runtime Cloudflare Workers, a plataforma captura spans de forma nativa quando habilitada via `wrangler.jsonc` (`observability.traces.enabled = true`). Essa instrumentação automática registra chamadas `fetch` de saída, operações em bancos e bindings (Durable Objects, KV, R2) sem a necessidade de SDKs pesados no código da aplicação.

---

## 5. Isole o gargalo sem confundir sintoma com causa

Ao inspecionar a linha do tempo de um trace, a operação mais demorada nem sempre é a causadora do incidente. Siga este roteiro analítico:

- **Concorrência ou dependência serial?** A chamada de 1.120 ms para o CMS externo precisava esperar a consulta do banco, ou ambas poderiam ter sido executadas em paralelo com `Promise.all`?
- **Ausência de cache na borda?** A requisição lenta atingiu o backend porque a camada de CDN não tinha a resposta armazenada?
- **Falso positivo de contenção**: Um span curto pode bloquear spans posteriores se esgotar o pool de conexões do banco de dados.

---

## 6. Caso prático de análise de latência

Considere uma ocorrência onde o tempo total de resposta de um artigo editorial subiu de 150 ms para 1.450 ms:

1. **Visão da Métrica**: O painel do Grafana ou Cloudflare Analytics indica salto abrupto no p95 de latência após as 14:00.
2. **Inspeção do Trace**: Seleciona-se um trace com duração de 1.450 ms. O span referente à chamada de rede para a API de conteúdo consumiu 1.150 ms.
3. **Consulta aos Logs**: O log filtrado pelo `trace_id` correspondente exibe mensagem de alerta informando re-tentativas de conexão (_retries_) devido a lentidão temporária no upstream.
4. **Resolução**: Implementação de cache `stale-while-revalidate` na borda para que quedas no upstream não penalizem o leitor final.

---

## 7. Unindo logs estruturados e spans em investigação forense

Logs e traces não concorrem: eles se complementam. O log oferece o conteúdo descritivo; o trace oferece a cronologia espacial.

Exemplo de log estruturado em formato JSON contendo correlação nativa:

```json
{
  "timestamp": "2026-10-12T15:20:00Z",
  "level": "warn",
  "message": "Upstream editorial response delayed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "route": "/artigos/logs-metricas-traces-diagnostico",
  "duration_ms": 1150,
  "http_status": 200
}
```

Ao cruzar o `trace_id` no painel de observabilidade, o engenheiro salta diretamente para o gráfico visual da chamada sem precisar pesquisar em terabytes de texto.

---

## 8. Limitações reais de observabilidade distribuída

Antes de confiar cegamente em ferramentas de telemetria, considere as limitações técnicas documentadas:

- **Propagação de Contexto**: A Cloudflare documenta que o tracing de Workers em open beta não propaga automaticamente os IDs de rastreamento para serviços externos hospedados fora de sua rede. A aplicação deve injetar manualmente cabeçalhos W3C `traceparent` caso queira rastrear serviços na AWS ou Google Cloud.
- **Amostragem (Sampling Rate)**: Em sistemas de alto tráfego (milhões de requisições por segundo), armazenar 100% dos traces é proibitivo financeiramente. Configura-se amostragem estatística (ex: 1% a 5% das chamadas). Nunca conclua que um erro não ocorreu apenas porque não há trace gravado.
- **Spans de Duração Zero**: Em rotinas assíncronas sem I/O de rede, alguns spans podem reportar duração de 0 ms devido à resolução do relógio interno; isso não indica que o código deixou de executar.

---

## 9. Protocolo e boas práticas operacionais

Para manter a observabilidade sustentável e segura:

1. **Higienize dados sensíveis**: Nunca inclua senhas, tokens de autorização, cookies ou CPF em mensagens de log ou tags de spans.
2. **Defina alertas em taxas de erro**: Configure notificações baseadas em desvios estatísticos de latência e erros 5xx, evitando alarmes falsos em variações normais de tráfego.
3. **Preserve logs de auditoria administrativa**: Ações como publicação de posts, alterações de permissão e autenticação com MFA devem ter trilhas de auditoria permanentes com retenção estendida.

---

## 10. Próximo passo prático

Acesse o manifesto de configuração da sua aplicação (`wrangler.jsonc` ou arquivo de infraestrutura) e verifique se a observabilidade de traces está explicitamente configurada. Execute uma requisição de teste inspecionando o cabeçalho `cf-ray` retornado e confirme se seus logs internos registram esse identificador.
