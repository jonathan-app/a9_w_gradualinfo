# /debug completo · 503 intermitente na home de produção

## Resultado

**Causa raiz provada:** o Worker de produção tem um teto efetivo de 10 ms de CPU por invocação, que é o teto do plano Free dos Cloudflare Workers. O runtime do Next com OpenNext gasta mais que isso em boa parte das requisições, em especial na primeira requisição de cada instância, a partida a frio. A Cloudflare encerra a invocação com `Worker exceeded CPU time limit` e devolve HTTP 503 com o corpo `error code: 1102`. O evento original de 18/10 às 15:43:39 UTC aconteceu 34 s depois do deploy, no primeiro tráfego após a publicação, e é o mesmo erro.

**Correção principal, decisão do usuário (billing):** abrir o painel da Cloudflare, confirmar o plano da conta e elevar o limite de CPU. Se a conta estiver no Free, o Workers Paid (US$ 5 por mês) eleva o teto para 30 s. Enquanto o teto for 10 ms, nenhuma otimização de código torna o Next viável em produção. Até `GET /api/health`, que só devolve JSON, estourou o limite em partidas a frio.

**Correção secundária, código, /develop:** a sonda da home (`probeSanityAvailability`) chama o Sanity sem o read token, ao contrário da seção 3.C da spec 0006. Isso não causa os 1102, mas deixa a sonda fora do contrato e mais sujeita a falha. Falta também registrar a exceção real da sonda, sem o que não é possível fechar a taxa residual de 503 do app.

**Correção do diagnóstico anterior:** a primeira leitura desta investigação atribuiu os 503 à sonda do Sanity. A sonda é uma segunda falha, real, porém menor. O corpo `error code: 1102` e o tail do Worker provam que a maior parte dos 503 atuais vem do limite de CPU, não do app.

## Sintoma

- Relato do usuário: `HttpServerError · HTTP 503`, 2026-10-18T15:43:39.014Z, serviço gradualinfo, gatilho `HEAD /`, região indefinida. Trilha: invocação `HEAD /`, span `fetch`, erro.
- Medição em 2026-10-19: home e `/busca` devolvem 503 em rajadas; `/sitemap.xml` responde 200 (não passa pela sonda e é cacheado); a taxa chegou a 18 de 20 requisições à home.
- O corpo do 503 atual é `error code: 1102`, `text/plain`, com `server: cloudflare`. Não é o HTML da home nem o corpo de `unavailableResponse` do app.
- O 503 do app, quando acontece, tem outro corpo (`Serviço temporariamente indisponível`) e os headers de segurança do app.

## Reprodução

```bash
for i in $(seq 1 20); do
  curl -sS -o /tmp/opencode/body.txt -D /tmp/opencode/headers.txt \
    -w "%{http_code}\n" https://www.gradualinfo.com.br/
done
```

Classificação de cada resposta:

- 200: home normal.
- corpo com `error code: 1102`: falha de CPU da plataforma.
- corpo com `Serviço temporariamente indisponível`: 503 montado pelo app.
- header `content-security-policy` presente sem o corpo do app: página de erro do Next.

Medição de 19/10, com 20 requisições à home: 18 falhas de CPU (`error code: 1102`) e 2 respostas 200. Medição anterior, no mesmo dia e antes da rajada: 10 a 30 por cento de falhas do app.

## Evidência

### 1. O tail do Worker prova o limite de CPU

Comando usado:

```bash
pnpm exec wrangler tail gradualinfo --format json
```

Durante 50 s, com 40 requisições a `/api/health` e 40 requisições a `/`:

- 72 eventos no total: 35 com `outcome: ok` e 37 com `outcome: exceededCpu`.
- Todas as falhas carregam a exceção `Error: Worker exceeded CPU time limit.`
- O `cpuTime` das falhas fica em 10 ms na maioria dos eventos; alguns casos chegam a 12, 15, 16, 18, 21, 24 e 26 ms, e esses são as partidas a frio em que o tempo de inicialização entra na conta.
- Sucessos de `/api/health` usam de 2 a 9 ms de CPU. Sucessos da home usam de 5 a 36 ms, com `wallTime` de até 1,9 s.
- `/api/health` também apareceu com `exceededCpu`, `cpuTime` de 10 ms e `wallTime` de 14 a 20 ms. A rota devolve sempre 200 JSON. A falha está no runtime do Next e do OpenNext, não no handler.
- Um health devolveu HTTP 500 e outro devolveu 503 com os headers do app durante a mesma janela. A rota sempre devolve 200, então essas respostas vieram da camada de erro do Next e do OpenNext. O modo dominante continua sendo o 1102.

### 2. Sanity e egress estão saudáveis

- Consultas diretas do Sanity a partir da máquina local: 60 de 60 com 200, latência de 0,28 a 0,32 s; rajada de 100 com P20 em 100 de 100 com 200; 8 de 8 com 200 durante a janela de incidente. Header `x-ratelimit-limit-second: 500`.
- Worker de teste `edge-probe-scratch`, no mesmo zone e no mesmo projeto Sanity, com a mesma consulta da sonda e o mesmo limite de 800 ms: 20 de 20 com 200 durante a janela de incidente. Esse worker foi apagado ao fim da investigação.
- Portanto, Sanity, egress e limite de requisições não explicam os 503 atuais.

### 3. Deploy e correlação temporal

- Último deployment: `ae03cb5f-060d-4457-ab27-fadd9be68962`, criado em 2026-10-18T15:43:05Z (versão de script `0405fc46`).
- O erro relatado veio 34 s depois, no primeiro tráfego após a publicação.
- O commit local atual (`4c56892`) não está publicado.
- O caminho da sonda não mudou desde o deploy: `git diff 4e2294e..HEAD` para `lib/sanity`, `lib/supabase/middleware.ts`, `proxy.ts` e `lib/env.ts` estava vazio na checagem.
- Preview local com `pnpm build` e `pnpm preview`: 30 HEAD, 10 GET e 200 requisições concorrentes, todas com 200. O workerd local não aplica o teto de 10 ms, então esse teste não refuta o limite de produção.

### 4. A sonda do app é uma falha secundária e está fora do contrato

- `lib/sanity/client.ts:197` chama `executeSanityQuery(query, {}, false, { timeoutMs: 800 })`.
- `lib/sanity/client.ts:141` só adiciona o header `Authorization` quando `isPreview && readToken`.
- A spec 0006, seção 3.C, linha 89, exige a sonda com a mesma configuração do Sanity, incluindo o read token.
- O 503 do app em `lib/supabase/middleware.ts:148` está correto na forma: falha fechada, `private, no-store`, `noindex, nofollow` e os headers de segurança.
- Falta um log da exceção capturada em `lib/supabase/middleware.ts:145`. Sem ele, a taxa residual de 503 do app fica sem causa observável.
- O timeout de 800 ms e a ausência de cache são decisões explícitas da spec. Não mudar sem `/architect`.

### 5. Limitações

- A API de assinaturas da Cloudflare recusou a consulta com `Authentication error` (código 10000). O token OAuth local não tem escopo de billing. O plano e o limite efetivo precisam ser confirmados no painel.
- A API de Observabilidade também recusou a consulta por falta de escopo. O tail do Worker forneceu a mesma evidência.
- A taxa de 10 ms é consistente com o teto do plano Free. Se a conta já for Paid, o limite de CPU pode estar fixado em 10 ms no painel, e o ajuste é o mesmo: elevar o limite.

## Prescrição

### Para o usuário (billing)

1. Abrir o painel da Cloudflare em Workers & Pages, selecionar o Worker `gradualinfo` e conferir o plano da conta e o limite de CPU.
2. Se a conta estiver no Free, assinar o Workers Paid (US$ 5 por mês) para elevar o teto para 30 s.
3. Se a conta já for Paid, elevar o limite de CPU no painel.
4. Repetir a medição depois do ajuste. O critério de sucesso é zero eventos `exceededCpu` no tail e home estável em 20 de 20 requisições.

### Para /develop

1. Em `lib/sanity/client.ts`, criar uma opção explícita para a sonda enviar o read token, por exemplo `includeReadToken?: boolean` em `executeSanityQuery`, e usá-la em `probeSanityAvailability` (linha 197). Não reutilizar `isPreview`, porque esse flag significa acesso a rascunho, não disponibilidade. As leituras públicas continuam sem token.
2. Em `lib/supabase/middleware.ts:145`, registrar a exceção capturada com nome e mensagem, usando o logger existente ou o Sentry já inicializado. Nunca registrar o token nem a URL completa.
3. Não alterar o timeout de 800 ms, a política sem cache nem o 503 de falha fechada sem `/architect`.

### Para /test

1. Estender `__tests__/unit/sanity-probe-home.test.tsx` para afirmar que a requisição da sonda leva `Authorization: Bearer` quando o read token está configurado, e que o token não aparece na mensagem de erro nem no log.
2. Manter os testes de timeout e de resposta 503.
3. Não existe teste local capaz de reproduzir o 1102. A regressão de produção é um monitor externo que consulta `/` e `/api/health` e alerta em 503. Registrar isso como cenário operacional, não como teste de unidade.

## Irmãos e pontos de atenção

- `/busca` falhou junto com a home na mesma janela, o que confirma que a falha é do Worker inteiro, não da sonda da home.
- `/sitemap.xml` respondeu 200 na janela porque é cacheado e não passa pela sonda. Não é evidência de saúde do Worker.
- A rota `/artigos/[slug]` já devolve 503 com falha fechada no proxy. O padrão está correto e não precisa mudar.
- O endpoint de health não consulta dependências por desenho. O 1102 nele é CPU, não indisponibilidade de banco ou de Sanity.
- O custo de CPU da home é o que mais se aproxima do teto. Depois do ajuste de plano, vale medir o `cpuTime` da home no tail para acompanhar a folga.

## Limpeza

- Worker `edge-probe-scratch` apagado.
- Preview local encerrado.
- Artefatos temporários em `/tmp/opencode/` (tail, bodies e headers) não são versionados.
