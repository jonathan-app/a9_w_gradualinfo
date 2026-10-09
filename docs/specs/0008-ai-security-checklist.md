# 0008. Checklist de Segurança de IA — Referência 2026

**Date**: 2026-10-08  
**Status**: Accepted (documentação de referência; implementação opcional por área)  
**Decision source**: Solicitação do dono em 2026-10-08 para registrar as 11 vulnerabilidades críticas de IA (Cycode 2026) e as mitigações recomendadas como checklist de compliance futuro. O projeto GradualInfo não roda LLMs em produção hoje; o documento serve de base se a arquitetura evoluir.

---

## 1. Contexto

O portal GradualInfo é um site editorial estático (Next.js + Cloudflare Workers + Sanity + Supabase). Não há componentes de LLM, RAG, agentes autônomos, geração de código por IA no runtime, nem bancos vetoriais. A superfície exposta às 11 classes de vulnerabilidade de IA (Cycode 2026) é nula no estado atual.

Este documento registra o checklist completo para:

- Compliance futuro se a arquitetura incluir IA
- Auditoria de fornecedores (Sanity, Supabase, Cloudflare) que podem usar IA internamente
- Baseline de governança para código gerado por IA no desenvolvimento (já coberto pelo fluxo `/check`)

---

## 2. Checklist por Vulnerabilidade

### 2.1 Injeção de Prompt (Prompt Injection)

- [ ] Separar instruções do sistema de dados do usuário no nível da arquitetura
- [ ] Filtros de conteúdo em tempo de execução para padrões adversariais
- [ ] Restringir ferramentas/permissões de sistemas de IA (menor privilégio)

**Aplicabilidade hoje**: N/A — sem LLM no runtime. CSP estrito e sanitização JSON-LD já cobrem vetores similares de injeção.

### 2.2 Divulgação de Informações Sensíveis

- [ ] Camadas DLP para escanear/redigir PII e segredos em entradas e saídas
- [ ] Menor privilégio em sistemas conectados (e-mail, CRM, documentos)
- [ ] Testes periódicos de sondagem adversarial contra memorização

**Aplicabilidade hoje**: Parcial — `lib/env.ts` com placeholders no build, secrets só no Worker (Cloudflare Dashboard), gitleaks na CI (`pnpm security:secrets`), `.env.production.local` no `.gitignore`.

### 2.3 Comprometimento da Cadeia de Suprimentos de IA

- [ ] Inventário completo de modelos, datasets, plugins, servidores MCP
- [ ] Validação de proveniência e integridade; fixar dependências em versões verificadas
- [ ] Monitoramento contínuo de comportamento inesperado de componentes de terceiros

**Aplicabilidade hoje**: Parcial — `pnpm-workspace.yaml` com `overrides` pinados, `pnpm audit --audit-level=high` na CI, `pnpm-lock.yaml` versionado, `scripts/check-env-leak.mjs`.

### 2.4 Envenenamento de Dados e Modelos

- [ ] Rastrear e validar proveniência de dados de treinamento, fine-tuning, bases RAG
- [ ] Detecção de anomalias nas respostas para identificar desvios
- [ ] Testar atualizações em sandbox isolado antes de produção

**Aplicabilidade hoje**: N/A — sem treinamento/fine-tuning/RAG próprio.

### 2.5 Tratamento Inadequado de Saídas

- [ ] Tratar saídas do LLM como não confiáveis: validação, codificação, sanitização
- [ ] Filtros de saída para injeção de código, comandos malformados, dados sensíveis
- [ ] Interfaces com checagem estrita de tipos entre IA e backend

**Aplicabilidade hoje**: N/A — sem LLM. Sanitização de JSON-LD (`serializeJsonLd`) já trata saídas estruturadas.

### 2.6 Agência Excessiva

- [ ] Menor privilégio por agente; delimitar permissões estritas
- [ ] Human-in-the-loop para ações de alto impacto (DB, financeiro, comunicações)
- [ ] Log completo de ações de agentes com contexto

**Aplicabilidade hoje**: Parcial — RLS no Supabase (63 testes pgTAP), preview via Durable Object com revogação forte, zero contas de leitores, `service_role` nunca no Worker.

### 2.7 Vazamento do Prompt do Sistema

- [ ] Remover credenciais, configs sensíveis, detalhes de APIs internas do system prompt
- [ ] Guardrails de prompt para bloquear tentativas de extração em tempo real
- [ ] Simulações periódicas de red-teaming

**Aplicabilidade hoje**: N/A — sem system prompt em produção.

### 2.8 Shadow AI

- [ ] Fornecer ferramentas oficiais homologadas que atendam necessidades reais
- [ ] Descoberta automatizada de uso não autorizado em SaaS, IDEs, navegadores
- [ ] Políticas claras de classificação (aprovadas, restritas, proibidas)

**Aplicabilidade hoje**: Potencial — desenvolvedores podem usar IA no IDE. Recomenda-se política interna e ferramentas homologadas.

### 2.9 Vulnerabilidades em Código Gerado por IA

- [ ] SAST/SCA em todo código gerado por IA antes de PR
- [ ] Revisão humana obrigatória em áreas críticas (auth, crypto, pagamentos)
- [ ] Monitorar % de código gerado por IA no repo para dimensionar testes

**Aplicabilidade hoje**: Parcial — fluxo `/check` (verify + review) obrigatório antes de merge, `CODEOWNERS` no GitHub. Recomenda-se adicionar scanner de código IA no pipeline.

### 2.10 Roubo de Modelo e Acesso Não Autorizado

- [ ] Auth forte + rate limiting em endpoints do modelo
- [ ] Monitorar padrões de consulta para extração sistemática
- [ ] Watermarking e registro de acessos para rastrear cópias

**Aplicabilidade hoje**: N/A — modelo próprio não existe.

### 2.11 Fraquezas em Vetores e Embeddings

- [ ] Controle de acesso rigoroso + validação de entrada no banco vetorial
- [ ] Verificações de integridade para detectar modificações não autorizadas
- [ ] Auditoria regular de bases RAG para remover dados manipulados

**Aplicabilidade hoje**: N/A — sem vector DB.

---

## 3. Áreas com Ação Recomendada Hoje

| Área                   | Ação                                                                                                                         | Onde                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Shadow AI (2.8)**    | Documentar ferramentas IA homologadas (Cursor, GitHub Copilot, Claude Code) e proibir chaves pessoais em segredos do projeto | `docs/governance/ai-tools-policy.md` (novo) |
| **Código IA (2.9)**    | Adicionar step no CI para detectar/flagar código gerado por IA (ex.: `ai-code-detector` ou rule Semgrep)                     | `.github/workflows/ci.yml`                  |
| **Supply Chain (2.3)** | Adicionar `sigstore/cosign` verification para imagens Docker/base images se houver containers                                | Futuro                                      |

---

## 4. Critérios de Aceite

- [ ] **ai-sec/AC-01**: Documento registrado em `docs/specs/0008-ai-security-checklist.md` com status `Accepted`
- [ ] **ai-sec/AC-02**: Checklist das 11 vulnerabilidades presente com mapeamento de aplicabilidade atual
- [ ] **ai-sec/AC-03**: 3 ações recomendadas para implementação imediata identificadas (Shadow AI, Código IA, Supply Chain)
- [ ] **ai-sec/AC-04**: Referência cruzada no `INDICE.md`

---

## 5. Referências

- Cycode, "Top AI Security Vulnerabilities in 2026" (fonte primária do checklist)
- OWASP Top 10 for LLM Applications 2025
- NIST AI Risk Management Framework (AI RMF 1.0)

---

## 6. Consequências

**Positivas**: Baseline documentado para compliance futuro; clareza do que já está coberto vs. gaps; ações concretas para hoje.

**Negativas**: Nenhuma — documento passivo, não altera código nem runtime.

---

## 7. Follow-up

- [ ] Criar `docs/governance/ai-tools-policy.md` (Shadow AI)
- [ ] Avaliar scanner de código IA no CI (Código IA)
- [ ] Revisar a cada 6 meses ou ao adicionar componente de IA na arquitetura
