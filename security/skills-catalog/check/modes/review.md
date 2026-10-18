# Modo review : Auditoria Imparcial do Diff

> Objetivo: auditar o diff do código com um modelo de IA DIFERENTE do que
> escreveu o código, para identificar falhas com imparcialidade.

## Princípio fundamental

O modelo que escreveu o código tem viés de confirmação. O review deve ser feito
por um modelo diferente (ex: se o /develop usou GPT, o /check usa Claude, e
no sentido inverso).

## Passo a passo

### 1. Preparação

- Ler a spec em `docs/specs/NNNN-nome.md` (decisões técnicas, ACs, limites)
- Pegar o diff do Git: `git diff main...HEAD` ou `git diff <base>`
- Listar os arquivos modificados e suas funções

### 2. Dimensões de auditoria (cada uma com checklist)

#### 2.1 Correção (bugs)

- [ ] Todos os edge cases estão tratados? (null, undefined, array vazio, erro de API)
- [ ] Estados de loading/error/empty implementados?
- [ ] Race conditions? (ex: duas requisições simultâneas)
- [ ] Erro de limite errors em loops/paginação?
- [ ] Tratamento de erro em Promises/async?

#### 2.2 Segurança

- [ ] Nenhum segredo (API key, senha) hardcoded?
- [ ] Input validado no servidor (não confiar só no cliente)?
- [ ] SQL injection / XSS / CSRF? (especialmente em APIs)
- [ ] Autorização: usuário só acessa o que pode?
- [ ] Rate limiting em endpoints sensíveis?

#### 2.3 Performance

- [ ] N+1 queries em listas? (ex: buscar post + autor por loop)
- [ ] Imagens otimizadas (next/image, tamanho, lazy)?
- [ ] Código desnecessário no bundle client (use server components)?
- [ ] Memoização onde necessário (novas renderizações caros)?
- [ ] Cache/ISR em páginas estáticas?

#### 2.4 Acessibilidade (a11y)

- [ ] Todos os elementos interativos são focusáveis por teclado?
- [ ] Labels em inputs? (não só placeholder)
- [ ] Contraste de texto atende WCAG AA?
- [ ] Alt text em imagens decorativas e informativas?
- [ ] ARIA labels onde necessário?

#### 2.5 Convenções do projeto

- [ ] Segue o padrão de comentários/JSDoc (regra do projeto)?
- [ ] Nomes de arquivos/componentes seguem convenção?
- [ ] Commits atômicos e em português?
- [ ] TypeScript estrito (sem any, sem @ts-ignore)?
- [ ] Sem console.log deixado no código?

#### 2.6 Alinhamento com a spec

- [ ] Todos os ACs da spec foram implementados?
- [ ] Decisões técnicas da spec foram seguidas? (ex: "usar Supabase" e não mock)
- [ ] Nenhuma feature fora do escopo da spec? (scope creep)

### 3. Classificação de cada achado

| Severidade  | Significado                                                       | Ação                                              |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| **BLOCKER** | Quebra funcionalidade, segurança crítica, ou AC não cumprido      | Bloqueia merge : deve ser corrigido               |
| **WARNING** | Problema real mas não bloqueia (ex: performance ruim, a11y menor) | Deve ser resolvido antes do merge ou criado issue |
| **NIT**     | Preferência de estilo, melhoria menor                             | Opcional : fica a critério do autor               |

### 4. Relatório

- Resumo: X BLOCKERs / Y WARNINGs / Z NITs
- Para cada achado: arquivo, linha, problema, por quê é problema, sugestão de correção
- Se BLOCKERs > 0 → REPROVADO → redireciona para /develop com a lista
- Se BLOCKERs = 0 → APROVADO → aciona /test para travar com testes
