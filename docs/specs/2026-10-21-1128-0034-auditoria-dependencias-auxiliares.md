# 0034. Auditoria de dependências auxiliares

**Date**: 2026-10-21  
**Status**: Proposed  
**Decision source**: Recomendações aprovadas pelo proprietário no chat em 2026-10-21, aguardando confirmação desta spec completa

## Summary

Esta decisão define como auditar todas as dependências diretas do projeto e remover apenas as que não possuem uso real. O catálogo Storybook e o analisador de bundle permanecem porque têm consumidores ativos. Spotlight, `concurrently`, o addon Chromatic sem configuração e o pacote npm homônimo `ponytail` saem, enquanto a skill Ponytail permanece intacta.

## Context

O projeto acumulou ferramentas de produção, qualidade e desenvolvimento local no mesmo manifesto. Algumas participam do build, da CI ou dos testes. Outras existem apenas por herança do boilerplate ou por um comando local que deixou de representar um fluxo mantido.

A igualdade de nomes criou um caso especialmente confuso. O pacote npm `ponytail@1.0.57` não fornece a skill Ponytail. A skill vem do catálogo versionado, é materializada por scripts próprios e continua necessária ao fluxo de engenharia.

A limpeza precisa distinguir pacote órfão de ferramenta opcional com consumidor real. Um script, uma configuração ou uma importação ativa conta como consumidor, desde que o fluxo correspondente seja deliberadamente mantido e validável. A simples presença no lockfile não conta como uso.

## Requirements

**User stories**:

- Como mantenedor, quero saber por que cada dependência direta existe para remover pacotes órfãos sem quebrar desenvolvimento, CI ou produção.
- Como desenvolvedor, quero preservar ferramentas locais úteis e seus comandos funcionais.
- Como operador do fluxo agêntico, quero preservar a skill Ponytail sem confundi-la com um pacote npm homônimo.

**Acceptance criteria**:

- **dependency-clean/AC-01**: Todas as entradas de `dependencies` e `devDependencies` recebem uma classificação verificável em um relatório datado, com pelo menos um consumidor concreto em código, configuração, script, hook ou CI, ou uma decisão explícita de remoção.
- **dependency-clean/AC-02**: `ponytail`, `@chromatic-com/storybook`, `@spotlightjs/spotlight` e `concurrently` são removidos do `package.json` e do `pnpm-lock.yaml`; o script `dev:spotlight` também é removido, sem outras mudanças colaterais no lockfile.
- **dependency-clean/AC-03**: A skill Ponytail permanece registrada em `skills-lock.json` e `security/skills-allowlist.json`, materializada em `.agents/skills/ponytail/`, apontada por `.claude/skills/ponytail/` e aprovada por `pnpm skills:check` e `node scripts/check-portability.mjs`.
- **dependency-clean/AC-04**: Storybook, `@storybook/nextjs-vite`, `@storybook/addon-docs` e `@storybook/addon-a11y` permanecem instalados; `pnpm build-storybook` conclui com código zero usando as stories e a configuração atuais.
- **dependency-clean/AC-05**: `@next/bundle-analyzer`, sua integração em `next.config.ts` e o script `bundle:analyze` permanecem; o comando conclui com código zero e produz a análise sem abrir interface gráfica.
- **dependency-clean/AC-06**: Pacotes restantes, incluindo `postcss`, só podem ser removidos ou movidos entre `dependencies` e `devDependencies` quando a auditoria comprovar ausência de uso no build, runtime, teste, hook e CI; na dúvida, o pacote permanece e a limitação é registrada.
- **dependency-clean/AC-07**: A instalação com lockfile imutável e `pnpm check:all` concluem com código zero após a limpeza, sem redução de testes, cobertura, regras de lint ou verificações de segurança.
- **dependency-clean/AC-08**: O diff não altera código de aplicação, migrations, testes, critérios de qualidade ou contratos já aceitos, exceto por ajustes estritamente necessários para remover os pacotes e comandos aprovados nesta spec.

## Options considered

### Option 1: Remover apenas pacotes sem consumidor real

Auditar todas as dependências diretas, preservar ferramentas ativas e remover o conjunto comprovadamente órfão ou descontinuado.

**Pros**:

- Reduz a árvore sem substituir ferramentas que ainda entregam valor.
- Mantém o risco restrito ao ambiente de desenvolvimento.
- Produz uma justificativa verificável para cada pacote direto.

**Cons**:

- Exige executar comandos opcionais que normalmente não fazem parte da CI.
- Mantém ferramentas pouco usadas quando há consumidor e decisão explícita de preservação.

### Option 2: Remover todas as ferramentas opcionais

Excluir Storybook, Spotlight, execução paralela e análise de bundle porque não participam do caminho normal da CI.

**Pros**:

- Gera a menor árvore de desenvolvimento possível.
- Reduz tempo e superfície de atualização de ferramentas visuais.

**Cons**:

- Apaga o catálogo Storybook que já possui configuração e story real.
- Remove um diagnóstico de bundle já integrado ao Next.

### Option 3: Manter tudo e apenas documentar

Registrar consumidores e órfãos sem modificar o manifesto.

**Pros**:

- Não cria risco imediato de quebra em comandos locais.

**Cons**:

- Mantém pacotes sem utilidade comprovada.
- Não resolve a confusão entre a skill Ponytail e o pacote npm homônimo.

## Decision

**Chosen option**: Option 1: Remover apenas pacotes sem consumidor real

A auditoria cobre todas as dependências diretas. Ela remove o conjunto aprovado e preserva qualquer pacote com consumidor real ou necessidade ainda não descartada por prova.

**Implementation skills**: `ponytail` (`DietrichGebert/ponytail`, `.agents/skills/ponytail/`)

## Rationale

Storybook possui configuração, comandos e uma story real. O analisador de bundle possui importação, configuração e comando dedicados. Removê-los trocaria uma redução pequena por perda funcional concreta.

Spotlight só aparece no comando `dev:spotlight`, e `concurrently` só existe para sustentar esse comando. O addon Chromatic não aparece na configuração, nos scripts ou na CI. O pacote npm `ponytail` não possui consumidor e não participa da instalação da skill. Esses quatro casos permitem remoção direta e reversível.

O critério para os demais pacotes é conservador. Uso transitivo presumido não basta para remover uma declaração direta. O responsável pela implementação precisa provar que build, runtime, testes, hooks e CI não dependem dela. Quando a prova não for conclusiva, manter é mais seguro do que produzir uma limpeza especulativa.

## Feature design

**Data model sketch**: Não se aplica. Nenhum dado persistido muda.

**API surface**: Não se aplica. Nenhuma rota ou contrato público muda.

**Value sourcing**:

| Ação                    | Valor produzido                              | Fonte                                                          |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| Classificar dependência | Consumidor ou decisão de remoção             | Imports, configurações, scripts, hooks e workflows versionados |
| Remover dependência     | Conjunto exato de entradas eliminadas        | Decisão desta spec e resolução correspondente no lockfile      |
| Preservar ferramenta    | Comando funcional e configuração ativa       | `package.json` e arquivo de configuração da ferramenta         |
| Preservar skill         | Origem, hash, cópia materializada e ponteiro | `skills-lock.json`, allowlist, catálogo e scripts de skills    |

**Key invariants**:

- Uma dependência não é órfã quando sustenta um fluxo deliberadamente preservado.
- Uma entrada apenas no lockfile não comprova uso.
- Remover um pacote exige remover somente seus consumidores exclusivos e suas resoluções sem referência.
- Nenhum pacote substituto será adicionado neste lote.
- Nenhum teste ou gate será enfraquecido para acomodar a limpeza.

**Security model**: Não há nova superfície de acesso. Os verificadores de segredos, análise estática, hooks e dependências de segurança permanecem intactos.

**Configuration required**: Nenhuma variável ou credencial nova.

**Critical test scenarios**:

- Inventário completo: cada dependência direta possui consumidor comprovado ou decisão de remoção, verifica **dependency-clean/AC-01** e **dependency-clean/AC-06**.
- Remoção cirúrgica: busca não encontra os quatro pacotes removidos nem `dev:spotlight`, e o lockfile contém zero resolução órfã correspondente, verifica **dependency-clean/AC-02**.
- Skill preservada: materialização, catálogo e portabilidade passam após a remoção do pacote homônimo, verifica **dependency-clean/AC-03**.
- Ferramentas preservadas: os comandos de Storybook e análise de bundle concluem com código zero, verifica **dependency-clean/AC-04** e **dependency-clean/AC-05**.
- Gate final: instalação imutável e `pnpm check:all` passam sem mudanças fora do perímetro autorizado, verifica **dependency-clean/AC-07** e **dependency-clean/AC-08**.

## Build plan

1. Produzir o inventário datado de todas as dependências diretas e seus consumidores, antes de qualquer remoção adicional, satisfaz **dependency-clean/AC-01** e **dependency-clean/AC-06**.
2. Remover `ponytail`, `@chromatic-com/storybook`, `@spotlightjs/spotlight`, `concurrently` e `dev:spotlight`, reconciliando somente as entradas correspondentes do lockfile, satisfaz **dependency-clean/AC-02**.
3. Executar os validadores de skills e registrar a preservação da skill Ponytail, satisfaz **dependency-clean/AC-03**.
4. Executar `pnpm build-storybook` e `pnpm bundle:analyze`, preservando suas configurações e consumidores, satisfaz **dependency-clean/AC-04** e **dependency-clean/AC-05**.
5. Validar uma instalação com lockfile imutável, executar `pnpm check:all` e inspecionar o diff final, satisfaz **dependency-clean/AC-07** e **dependency-clean/AC-08**.

## Migration plan

**Strategy**: substituição direta, sem migração de dados.

**Rollback**: restaurar o manifesto e o lockfile da revisão anterior. Os pacotes removidos não participam do runtime nem armazenam dados.

**Risks**: um uso local não versionado de `dev:spotlight` deixará de existir. A preservação de ferramentas com consumidores comprovados limita o restante do impacto.

## Consequences

**Positive**:

- Cada dependência direta passa a ter justificativa auditável.
- Pacotes órfãos deixam de consumir instalação, atualização e análise de segurança.
- A diferença entre pacote npm e skill fica explícita.

**Negative / tradeoffs**:

- O comando local `dev:spotlight` deixa de existir.
- Storybook e análise de bundle continuam aumentando a árvore de desenvolvimento porque seus fluxos foram preservados.
- A validação completa inclui dois builds opcionais e pode demorar mais nesta etapa.

**Neutral**:

- Não há alteração de runtime, banco de dados, API ou interface pública.

## Follow-up

- [ ] Repetir `/check review` contra esta spec após a ratificação e a implementação completa do Lote R3.
