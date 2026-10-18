# Modo verify : Prova Empírica

> Objetivo: provar, rodando a aplicação REAL, que cada Critério de Aceite
> numerado foi cumprido. Sem evidência = sem aprovação.

## Passo a passo

### 1. Preparação

- Ler a spec em `docs/specs/NNNN-nome.md`
- Extrair todos os ACs numerados (AC-01, AC-02, ...)
- Verificar se a app está rodando (`pnpm dev` ou `pnpm build && pnpm start`)
- Confirmar que o MCP Playwright está disponível

### 2. Para cada AC, executar:

| Passo | Ação                                                                                 |
| ----- | ------------------------------------------------------------------------------------ |
| 2.1   | Ler a descrição do AC e o método de validação (definido na spec)                     |
| 2.2   | Navegar até a tela/endpoint correspondente via Playwright                            |
| 2.3   | Executar a interação descrita no AC (clicar, digitar, esperar)                       |
| 2.4   | Capturar evidência: screenshot, log do console, resposta da API                      |
| 2.5   | Marcar: PASS (cumprido), FAIL (não cumprido), UNVERIFIABLE (não foi possível testar) |

Os três estados são obrigatórios e nenhum é dispensável. Um AC que não foi possível testar é
UNVERIFIABLE, e UNVERIFIABLE reprova: não existe "não testei, mas deve estar certo". Todo AC
PASS exige evidência empírica anexada; PASS sem evidência é tratado como não verificado.

### 3. Estados de UI obrigatórios (se aplicável)

Toda tela deve ter os 4 estados testados:

- **Sucesso** : dados carregam corretamente
- **Vazio** : sem dados, mostra estado vazio amigável
- **Carregamento** : skeleton/spinner aparece durante o load
- **Erro** : falha na API, mostra mensagem de erro e retry

### 4. Critérios adicionais (automáticos)

- `pnpm build` passa sem erros
- `pnpm lint` passa sem erros
- `pnpm typecheck` passa sem erros
- `pnpm test:run` passa sem erros
- Nenhum segredo vazando no diff (verificar .env, chaves de API)
- Acessibilidade: nenhum erro crítico do axe-core

### 5. Compilação do resultado

- Tabela: AC | Status | Evidência (link do screenshot/log)
- Montar o JSON `{ "acs": [...], "findings": [...] }` e rodar a autoridade da decisão:
  `node scripts/check-decision.mjs <arquivo.json>`
- O script imprime `{ approved, verdict, counts, reasons }` e sai com código 0 (aprovado) ou 1
  (reprovado). A decisão não é julgada na prosa: ela é o resultado do script.

Aprovação exige, ao mesmo tempo:

- pelo menos 1 AC verificado (lista vazia não aprova por vacuidade)
- 0 AC FAIL
- 0 AC UNVERIFIABLE
- 0 achado BLOCKER
- todos os ACs PASS com evidência não vazia

Qualquer item fora disso reprova. Cada reprovação vem com uma `reason` acionável (o que
corrigir, onde, por quê); transcreva essas reasons para o relatório em vez de parafraseá-las.

## Evidências aceitáveis

- Screenshot da Playwright (salvo em `docs/reviews/evidence/`)
- Log do console (sem erros fatais)
- Resposta JSON da API (status 200 + dados corretos)
- Saída do build/test (exit code 0)

## O que NÃO é evidência

- "Eu acho que funciona"
- "No código parece certo"
- "Funcionou na minha máquina" (sem screenshot/log)
