---
title: 'Por que seu site retorna erro 500 ou 503? Um método de diagnóstico sem achismos'
slug: 'diagnosticar-erro-500-503-site'
editoria: 'Engenharia & Confiabilidade'
excerpt: 'Erros 500 e 503 em arquiteturas modernas raramente são acidentes isolados. Aprenda a separar falhas de runtime de decisões de contenção da borda, correlacionando telemetria e códigos de status.'
cover_image: '/artigos/diagnosticar-erro-500-503-site.jpeg'
author: 'Redação GradualInfo'
published_at: null
status: 'rascunho'
fontes_citadas:
  - titulo: 'RFC 9110: HTTP Semantics (Status Codes 500 and 503)'
    url: 'https://www.rfc-editor.org/rfc/rfc9110.html'
  - titulo: 'Cloudflare Workers: Troubleshooting Errors and Subrequests'
    url: 'https://developers.cloudflare.com/workers/observability/errors/'
  - titulo: 'Next.js App Router: Error Handling and Server Components'
    url: 'https://nextjs.org/docs/app/building-your-application/routing/error-handling'
---

# Por que seu site retorna erro 500 ou 503? Um método de diagnóstico sem achismos

Em ambientes modernos de produção que combinam frameworks full-stack (Next.js 16 App Router), execução serverless na borda (Cloudflare Workers) e serviços desacoplados (Content Lakes e bancos relacionais), erros 500 e 503 raramente são acidentes isolados. Eles são sintomas de quebras de contrato entre camadas.

Reiniciar containers, forçar novos deploys ou alterar variáveis de ambiente sem evidências apenas aumenta a indisponibilidade e destrói o rastro forense. Este guia apresenta um método reprodutível para isolar a causa raiz em minutos, correlacionando telemetria, códigos de status e fronteiras arquiteturais.

---

## 1. A anatomia do erro: 500 vs 503

A primeira etapa do diagnóstico é entender exatamente em qual camada da pilha a requisição foi abortada.

| Código HTTP                          | Definição RFC                          | Onde nasce tipicamente                                | Sintoma no Usuário                                                       |
| :----------------------------------- | :------------------------------------- | :---------------------------------------------------- | :----------------------------------------------------------------------- |
| **HTTP 500 (Internal Server Error)** | Exceção não tratada na execução        | Servidor Node.js, Worker Script, Server Component     | Falha súbita ao tentar renderizar a página ou executar um Route Handler. |
| **HTTP 503 (Service Unavailable)**   | Indisponibilidade temporária conhecida | Camada de borda (CDN/Proxy), Gateway, Circuit Breaker | Página estática de manutenção ou resposta deliberada de fail-closed.     |

### O caso clássico do HTTP 500 no Next.js App Router

No App Router, se um Server Component (`app/page.tsx`) tenta acessar uma variável de ambiente ausente ou faz parse de um JSON malformado sem bloco `try/catch`, o streaming de resposta do React é interrompido. O Next.js não tem alternativa a não ser emitir um código 500 e acionar a fronteira de erro global (`app/error.tsx`).

### O caso clássico do HTTP 503 na borda

Um HTTP 503 bem projetado é uma decisão de contenção arquitetural:

1. **Sonda de Disponibilidade (Health Probe)**: Se a fonte editorial primária não responde dentro do tempo limite tolerável (ex: timeout estrito de 800 ms), o proxy intercepta a requisição e devolve 503 honesto com `Cache-Control: private, no-store`, evitando servir páginas corrompidas ou mascarar a queda de banco como um falso 404.
2. **Guarda de Acesso Administrativo**: Sem credenciais ou JWT válido na entrada de rotas restritas, o sistema falha fechado (_fail-closed_) devolvendo 503 ou 403 antes de gastar recursos de computação do backend.

---

## 2. O funil de diagnóstico em 5 etapas

Quando um alerta disparar, siga este fluxo rigoroso de investigação:

```
[Alerta de Erro]
       │
       ▼
1. Classificar a Fronteira (Borda vs Aplicação vs Upstream)
       │
       ▼
2. Correlacionar Version ID e Horário
       │
       ▼
3. Inspecionar Cabeçalhos de Resposta (CF-Ray, Cache, Status)
       │
       ▼
4. Auditar Variáveis de Build vs Variáveis de Runtime
       │
       ▼
5. Avaliar Latência e Timeouts de Dependências Externas
```

### Etapa 1: Classificar a Fronteira de Execução

Identifique quem gerou o erro:

- **Cloudflare Edge Error (1xxx)**: Códigos como 1101 ou 1015 indicam erro de sintaxe no script do Worker ou estouro de limite de CPU na borda.
- **Application Error**: Resposta HTML ou JSON construída pelo seu próprio código.

### Etapa 2: Correlacionar Version ID e Deploy

Nunca assuma que a versão ativa é a que você acabou de subir no Git. Inspecione o identificador real:

- Em plataformas como Cloudflare Workers, verifique o `script_version.id` da invocação ativa.
- Um erro iniciado exatamente no minuto de um deploy aponta para divergência de bundle ou bindings ausentes.

### Etapa 3: Inspecionar os Cabeçalhos HTTP

Execute uma chamada diagnóstica com `curl` preservando todos os headers:

```bash
curl -s -i "https://seu-dominio.com.br/caminho-com-erro" | head -n 30
```

Procure por:

- `cf-ray`: Identificador único da requisição para cruzamento no painel de observabilidade.
- `cache-control`: Se a resposta estiver em cache no CDN, o erro pode ser um fantasma de uma falha temporária já resolvida.
- `retry-after`: Indica se um mecanismo de rate limit ou backoff está operando.

### Etapa 4: Auditar Variáveis de Build vs Runtime

Em arquiteturas compiladas (como OpenNext e Next.js), variáveis de ambiente sofrem um tratamento duplo:

- **Variáveis de Build**: Substituídas como literais em tempo de compilação.
- **Bindings de Runtime**: Injetados dinamicamente no objeto `env` da requisição.

Se o código do servidor lê `process.env.VARIAVEL` esperando um valor de produção, mas ela só existia no `.env.local` da máquina do desenvolvedor, o código cai no fallback padrão ou lança `TypeError` em produção.

### Etapa 5: Avaliar Latência e Timeouts de Serviços Externos

Chamadas a APIs headless (Sanity, Supabase, CMS externo) precisam de limites rígidos:

- Um timeout padrão de 30 segundos no `fetch` trava a thread e esgota o pool de conexões do servidor.
- Use `AbortController` com timeouts agressivos (ex: 800 ms a 5 s) e trate o aborto lançando erros tipados de indisponibilidade (`ContentUnavailableError`).

---

## 3. Checklist de Mitigação Preventiva

- [ ] **Rotas de Liveness Independentes**: Mantenha `/api/health` respondendo 200 sem consultar bancos de dados pesados, apenas atestando que o runtime está vivo.
- [ ] **Tipagem Centralizada de Ambiente**: Nunca use `process.env` disperso pelo código; centralize em um leitor tipado (`lib/env.ts`) que valida a presença dos bindings obrigatórios.
- [ ] **Degradação Elegante**: Exiba componentes de indisponibilidade com cópia honesta em vez de telas brancas ou crashes não tratados.
- [ ] **Observabilidade com Tracing**: Habilite amostragem de traces para identificar gargalos em chamadas externas antes que atinjam o limite de timeout.
