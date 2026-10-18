# Auditoria comparativa do GradualInfo

Comparação dos ZIPs de 09/10/2026: versão das 08:26 × versão das 16:10

Veredito: REPROVADO para aprovação da entrega neste momento. A versão mais recente melhora de forma relevante o fluxo de MFA e a infraestrutura de rate limiting, mas ainda não tem validação suficiente para autorizar merge ou deploy. Também identifiquei um risco novo de disponibilidade no contador de tentativas.

A análise abaixo separa as diferenças comprovadas nos arquivos, os riscos técnicos encontrados por inspeção e os testes que continuam sem evidência conclusiva. A comparação dos ZIPs, por si só, não comprova que o código foi executado em produção.

## 1. O que mudou entre as versões

| Métrica                   | Valor                                                  |
| ------------------------- | ------------------------------------------------------ |
| Arquivos adicionados      | 169                                                    |
| Arquivos removidos        | 109                                                    |
| Arquivos modificados      | 28                                                     |
| Mudanças de implementação | 5 novas áreas, além das alterações em rotas existentes |

Os 109 arquivos removidos são documentação e registros antigos, não 109 arquivos de aplicação. Grande parte das adições também é documentação e evidência de auditoria.

As principais alterações de implementação estão nestes arquivos:

| Área                 | Arquivos relevantes                                                                         | Avaliação                                    |
| -------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Login administrativo | `app/api/admin/auth/login/route.ts`                                                         | Melhor proteção da identidade                |
| Matrícula MFA        | `app/api/admin/auth/mfa/enroll/route.ts`, `app/admin-dashboard/mfa/setup/page.tsx`          | Correção importante                          |
| Verificação MFA      | `app/api/admin/auth/mfa/verify/route.ts`                                                    | Mais verificações de segurança               |
| Cookies SSR          | `lib/admin/session-response.ts`, `lib/supabase/server.ts`                                   | Melhor preservação de atributos              |
| Rate limiting        | `lib/admin/rate-limit.ts`, `lib/admin/rate-limit-do.ts`, `lib/admin/rate-limit-protocol.ts` | Arquitetura melhor, política ainda arriscada |
| Cloudflare           | `scripts/cloudflare-worker.ts`, `wrangler.jsonc`                                            | Novo Durable Object para as quotas           |

## 2. Melhorias confirmadas na nova versão

### P0. Login confere o UUID antes de continuar o MFA

A rota verifica se o usuário autenticado corresponde ao `ADMIN_USER_ID`. Se não corresponder, tenta encerrar a sessão local e descarta os cookies capturados. Isso reduz o risco de uma conta diferente da administrativa prosseguir pelo fluxo de MFA.

Arquivo: `app/api/admin/auth/login/route.ts`

### P0. A página GET de matrícula deixou de criar um fator

Antes, abrir a página de setup chamava `supabase.auth.mfa.enroll()`. Agora, o GET apresenta a interface e a matrícula começa por ação explícita do usuário, via POST. Isso evita criar fatores como efeito colateral de uma simples visita, atualização ou prefetch da página.

Arquivos: `app/admin-dashboard/mfa/setup/page.tsx` e `components/admin/mfa-enrollment.tsx`

### P0. Validação de origem passou a rejeitar ausência de Origin e Referer

A função `validateAdminRequestOrigin()` deixou de aceitar automaticamente requisições quando os dois cabeçalhos estão ausentes. A exceção de origem local também foi restringida ao ambiente não produtivo, com protocolo e porta correspondentes.

Arquivo: `lib/admin/auth.ts`

### P1. Cookies de autenticação preservam suas opções

O novo `createAdminSessionResponse()` captura nome, valor e opções emitidas pelo SDK, permitindo preservar atributos de cookie ao responder com redirects ou erros. Isso é melhor do que reconstruir cookies copiando apenas nome e valor.

Arquivo: `lib/admin/session-response.ts`

### P1. Rate limiting saiu do Map local

O contador foi movido para um Durable Object com armazenamento SQLite, transações e operações separadas para login e MFA. A aplicação também falha de forma restritiva, respondendo com indisponibilidade se não conseguir consultar o contador.

Arquivos: `lib/admin/rate-limit-do.ts` e `lib/admin/rate-limit.ts`

Essas mudanças são positivas por inspeção do código. Ainda não significam que todos os critérios de aceitação foram comprovados em runtime.

## 3. Riscos e regressões encontrados

### P0. Não encontrei evidência de bypass direto de MFA, mas a validação real ainda está pendente

A nova rota de verificação confere se o `factorId` pertence aos fatores TOTP do usuário e, após o desafio, consulta o nível de autenticação para exigir `currentLevel === 'aal2'`. Isso fortalece o fluxo.

Porém, a matrícula ainda depende de uma garantia importante do serviço Supabase: duas requisições concorrentes não podem resultar em fatores duplicados ou em mais de uma resposta com segredo. A aplicação faz consulta prévia e tenta identificar conflitos, mas essa consulta, isoladamente, não é atômica.

O relatório de verificação mais recente classifica os sete critérios da nova especificação MFA como `UNVERIFIABLE`. Portanto, não seria correto declarar essa parte aprovada apenas com base nos testes unitários anteriores.

Correção/ação necessária: testar concorrência e repetição de matrícula em um ambiente Supabase descartável, com versão do Auth identificada e evidência de que apenas um fator vence.

### P1. O novo rate limiter permite bloqueio global do login

Este é o principal risco novo que identifiquei.

O código chama `consumeAdminRateLimit('login')`.

O Durable Object utiliza um nome singleton (`admin-auth-rate-limit:v1`) e mantém uma única quota para a operação `login`, sem separar tentativas por origem confiável ou identidade. A política atual permite cinco tentativas por janela de 60 segundos, depois bloqueia novas tentativas até o vencimento.

Isso significa que cinco requisições podem consumir a quota compartilhada e impedir temporariamente o login legítimo do administrador. O rate limiter é persistente e distribuído, mas sua chave de controle é excessivamente ampla.

- Impacto: indisponibilidade do acesso administrativo.
- Severidade sugerida: alta, P1.
- Arquivo principal: `lib/admin/rate-limit-do.ts`.
- Arquivo consumidor: `app/api/admin/auth/login/route.ts`.

Correção recomendada: particionar as quotas por uma chave confiável, como um identificador derivado do IP que a Cloudflare realmente fornece ao Worker, com política específica para a única conta administrativa. Não confiar cegamente em `X-Forwarded-For` fornecido pelo cliente. Manter também limites globais de proteção, sem permitir que um único atacante esgote toda a capacidade do login.

### P1. Testes e evidências estão inconsistentes entre si

Encontrei relatórios que não podem ser tratados como uma única aprovação atual:

- Um relatório da frente MFA registra 7/7 critérios PASS, baseado em testes da implementação e evidência unitária.
- A verificação posterior, em `docs/reviews/evidence/2026-10-09-1536-admin-mfa/`, registra 0 PASS, 0 FAIL e 7 UNVERIFIABLE, porque não conseguiu concluir as provas reais.
- A evidência de build de 15:45 registra TypeScript e ESLint aprovados, mas testes incompletos e falha de formatação global.

Esses resultados não são necessariamente contraditórios sobre o comportamento do código: eles representam níveis de evidência diferentes. O problema é que a aprovação anterior não pode ser transferida automaticamente para o ZIP mais novo, que contém alterações posteriores.

Correção/ação necessária: produzir uma decisão única, vinculada ao hash exato da árvore final, com resultados reproduzíveis de cada critério.

### P1. O build final e os testes de regressão não foram concluídos

O arquivo `docs/reviews/evidence/2026-10-09-1545-admin-mfa-build-checks.md` registra:

| Verificação            | Resultado documentado |
| ---------------------- | --------------------- |
| TypeScript             | PASS                  |
| ESLint global          | PASS                  |
| Vitest                 | BLOQUEADO             |
| Prettier global        | FAIL                  |
| Build Next.js          | BLOQUEADO             |
| Build OpenNext         | Não executado         |
| Wrangler dry-run       | Não executado         |
| E2E HTTP/MFA conectado | Não comprovado        |

Os testes Vitest registraram 246 testes aprovados e 18 falhas bloqueadas por `EPERM` na criação de fixtures Git. O relatório não demonstra que as 18 falhas sejam defeitos funcionais, mas também não permite declarar a suíte completa aprovada.

O build Next falhou por restrição de criação de processo/porta no ambiente. Isso é uma limitação do ambiente de execução, não prova de bug no aplicativo. Mesmo assim, sem build OpenNext e sem `wrangler deploy --dry-run`, a entrega Cloudflare permanece sem validação final.

### P2. A limpeza da documentação precisa de reconciliação

Foram removidos 109 arquivos, todos da área de documentação nos caminhos comparados, e adicionados 142 arquivos em `docs`. Isso parece em grande parte uma reorganização e versionamento de evidências, não uma remoção de funcionalidades.

O risco é de rastreabilidade: a nova árvore precisa deixar claro qual relatório é vigente, qual é histórico e qual hash de código cada decisão realmente avaliou. O próprio `workflow/STATE.md` foi alterado e deve ser tratado como parte da revisão, não como prova independente de aprovação.

### P2. Segredos no histórico continuam sendo uma pendência separada

O relatório anterior do painel mantém um bloqueador relacionado a 11 achados históricos do Gitleaks no commit `10eecbc`, com saneamento do histórico e confirmação de não reutilização/rotação ainda exigidos pelo gate.

A alteração do rate limiter e do MFA não resolve esse problema. Também não é correto afirmar que esses achados representam necessariamente credenciais de produção: os relatórios os classificam como credenciais de demo/template, mas a decisão de segurança exige que o histórico e a situação das credenciais sejam resolvidos formalmente.

## 4. O que falta para liberar a entrega

Minha ordem recomendada de trabalho é:

1. Corrigir a quota global do login. Definir a chave de rate limiting e testar isolamento entre tentativas de origens distintas, sem confiar em cabeçalhos falsificáveis.
2. Validar a matrícula MFA no Supabase controlado. Testar requisições concorrentes, timeout, resposta perdida, repetição, fator pendente e elevação real para AAL2.
3. Concluir a validação do código exato. Resolver o Prettier, executar novamente os testes bloqueados em ambiente adequado e confirmar TypeScript, lint, suíte completa e E2E.
4. Validar a entrega Cloudflare. Gerar build Next.js, build OpenNext e executar `wrangler deploy --dry-run`, todos vinculados à mesma árvore de código.
5. Fechar os bloqueadores externos. Confirmar a configuração efetiva do Supabase, cadastro público desabilitado, controles de infraestrutura e saneamento do histórico de segredos.
6. Emitir uma decisão final rastreável. Registrar o hash exato avaliado, os resultados por critério e as pendências. Só então reconsiderar a aprovação.

## 5. Estado final da auditoria

**Qualidade das alterações — melhorou.** O login, a matrícula TOTP, a preservação de cookies e a arquitetura do rate limiter avançaram em relação ao ZIP da manhã.

**Segurança e disponibilidade — correções pendentes.** A quota global do login precisa ser corrigida. A concorrência do MFA e as proteções HTTP ainda precisam de provas reais.

**Validação da entrega — REPROVADO.** A última verificação disponível não concluiu os testes, o build OpenNext, o dry-run do Wrangler nem a validação conectada completa.

Decisão recomendada: manter merge e deploy bloqueados. Não porque as mudanças sejam ruins, mas porque existe um risco concreto no rate limiter e a versão mais recente ainda não passou por uma validação completa vinculada ao código atual.

A próxima ação de maior retorno é corrigir a quota global de login e, em seguida, executar uma única rodada de verificação completa sobre a árvore corrigida. Isso evita gastar ciclos aprovando partes isoladas enquanto a entrega final permanece sem um veredito confiável.
