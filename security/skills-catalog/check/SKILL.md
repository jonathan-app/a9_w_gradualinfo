---
name: check
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Agent, AskUserQuestion
description: >
  Validação e revisão de qualidade antes do merge. Dois modos: verify (prova
  empírica rodando a aplicação real e cumprindo cada Critério de Aceite
  numerado) e review (auditoria imparcial do diff por um modelo de IA diferente
  do que escreveu o código). É a skill de travão de qualidade do fluxo: sem
  /check aprovado, não há merge.
---

# Skill: /check : Validação e Revisão de Qualidade

> **Papel no fluxo:** Fase 3 : Validação & Qualidade. Vem depois do /develop e
> antes do /test. Sem /check aprovado = sem merge.

## Quando invocar

- Após o /develop concluir uma feature ou fix
- Antes de abrir ou mergear um Pull Request
- Quando o usuário pedir "valida", "verifica", "revisa", "está pronto?"
- Quando uma spec está com status In Progress e precisa avançar para Accepted

## O que NÃO faz

- Não escreve código de aplicação (isso é o /develop)
- Não cria testes automatizados (isso é o /test)
- Não decide arquitetura (isso é o /architect)
- Não reescreve a feature : apenas valida e reporta

## Dois modos de operação

### Modo verify (prova empírica)

Roda a aplicação REAL e interage com telas/endpoints para provar, empiricamente,
que cada Critério de Aceite numerado (AC-01, AC-02...) foi cumprido.

- Usa MCP Playwright para navegar na app
- Executa comandos reais (`pnpm dev`, `pnpm build`, `pnpm test`)
- Para cada AC: executa o passo, captura evidência (screenshot/log), marca PASS, FAIL ou UNVERIFIABLE
- Falha ou ausência de prova em um AC bloqueia o merge e reporta exatamente o que quebrou

### Modo review (auditoria imparcial)

Audita o diff do código com um modelo de IA DIFERENTE do que escreveu o código,
para identificar falhas com imparcialidade.

- Lê o diff do Git (não a memória da conversa)
- Compara com a spec (Critérios de Aceite, decisões técnicas)
- Procura: bugs, edge cases não tratados, vazamento de segredos, performance,
  acessibilidade, quebra de convenções do projeto
- Classifica cada achado: BLOCKER / WARNING / NIT
- BLOCKER = bloqueia merge; WARNING = deve ser resolvido; NIT = opcional

## Fluxo de execução

1. **Lê a spec** em `docs/specs/` correspondente à alteração
2. **Extrai os Critérios de Aceite** numerados (AC-01..AC-NN)
3. **Modo verify:** para cada AC, executa o cenário real e marca PASS, FAIL ou UNVERIFIABLE, com evidência
4. **Modo review:** audita o diff contra a spec e classifica achados
5. **Roda a autoridade da decisão**:
   `node scripts/check-decision.mjs <resultado.json>` com `{ "acs": [...], "findings": [...] }`.
   O script imprime `{ approved, verdict, counts, reasons }` e sai com 0 ou 1.
6. **Compila o relatório** em `docs/reviews/YYYY-MM-DD-NNNN-nome-da-feature.md`, transcrevendo as
   `reasons` do script.
7. **Decisão:** o veredito é o do script, não o julgamento do agente.
   - **APROVADO** (exit 0): pelo menos 1 AC verificado, todos PASS com evidência, 0 FAIL,
     0 UNVERIFIABLE, 0 BLOCKER → aciona /test
   - **REPROVADO** (exit 1): qualquer AC FAIL, qualquer AC UNVERIFIABLE, qualquer BLOCKER,
     lista de ACs vazia, ou AC PASS sem evidência → redireciona para /develop com as reasons

Regra que este gate existiu para travar: um AC não testável é UNVERIFIABLE, e UNVERIFIABLE
reprova. Aprovar por não haver FAIL é o defeito A01, corrigido aqui.

## Arquivos que produz

- `docs/reviews/YYYY-MM-DD-NNNN-nome-da-feature.md` : relatório completo com evidências
- Atualiza status da spec: In Progress → (se aprovado) aguardando /test

## Dependências

- Requer spec aceita em `docs/specs/` (do /architect)
- Requer código implementado (do /develop)
- Requer MCP Playwright configurado (para modo verify)
- Usa como base as skills: `verification-before-completion` e `code-review-excellence`

## Regras

- Nunca aprove sem evidência empírica (verify)
- Nunca confie na memória da conversa: leia o diff e a spec reais
- Se um AC não for testável, marque como UNVERIFIABLE e reporte: reprova, não isenta
- Aprovação exige 0 FAIL, 0 UNVERIFIABLE, 0 BLOCKER, todos os ACs PASS com evidência e pelo
  menos 1 AC verificado. Lista vazia não aprova
- A decisão é a saída de `scripts/check-decision.mjs`; não a reinterprete na prosa
- Relatório deve ser objetivo: PASS, FAIL ou UNVERIFIABLE por AC, lista de achados classificados
- Se reprovar, entregue a lista de correções de forma acionável (o que mudar, onde, por quê),
  copiando as reasons do script

## Ver também

- `scripts/check-decision.mjs` : autoridade executável da decisão (o veredito sai daqui)
- `modes/verify.md` : detalhes do modo verify
- `modes/review.md` : detalhes do modo review
- `checklist.md` : checklist de validação
- `agent-prompt.md` : prompt completo do agente
