# Auditoria do backend e primeira correção administrativa

Data: 2026-10-21, America/Sao_Paulo.
Origem: pacote gradualinfo-v2.0.0.zip fornecido pelo proprietário.
SHA-256 da origem: `bd5178221f5e4ffe1a4008c128dc5229f38414197b37bedc63011c51125fc39a`.

## Resultado

O backend tem uma base aproveitável de Supabase Auth, TOTP, RBAC, guardas de API,
RPCs de papéis, trilha append only e storage probatório. O painel não está pronto
para ser tratado como operação administrativa completa. Esta rodada corrigiu
falhas existentes nas Specs 0032 e 0033 aceitas. Nenhuma aprovação histórica foi
reutilizada como prova da árvore recebida.

O código foi alterado somente na cópia extraída. A árvore original do proprietário,
Cloudflare, Sanity, Supabase remoto e GitHub não foram modificados.

## Escopo examinado

Login, matrícula e desafio de MFA, recuperação, autorização e papéis, clientes
Supabase de servidor e navegador, preview assinado e verificação no DO, serviços
do dashboard, rotas administrativas, ingestão e consulta de ofertas, configuração
Wrangler, migrations de RBAC e endurecimento e testes relacionados.

A revisão é de código e testes locais. Não atesta todas as invariantes SQL sem
executar pgTAP em banco real, nem valida a implantação ou credenciais remotas.

## Achados e correções

| ID     | Prioridade             | Evidência na origem                                                                                                                                                                                           | Resultado desta rodada                                                                                                                                                                                                                   |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADM-01 | Alta                   | A página protegida iniciava consultas em paralelo sem guarda própria; somente o layout verificava sessão. Layout não controla a execução dos filhos.                                                          | A página verifica Access, usuário, papel e AAL2 antes de consultar fontes. O serviço agregador também verifica autorização. Testes invocam a página diretamente e exigem zero consultas na recusa.                                       |
| ADM-02 | Alta                   | `getDashboardRecentActivity` usava cliente de serviço para ler eventos de todos os atores sem filtro de papel, ignorando a RLS.                                                                               | Verifica autorização, filtra `status=success` e restringe editor/revisor ao próprio `actor_id`. Administrador conserva leitura global. Projeção remove metadata desnecessária.                                                           |
| ADM-03 | Alta para operação     | Contagens artificialmente elevadas por `Math.max`, 182450 visualizações e crescimentos constantes, cinco atividades inventadas e série temporal fixa de 14 dias. Testes antigos exigiam os números fictícios. | Contagens reais, zero preservado, indisponibilidade como null, nenhuma atividade fictícia e nenhum gráfico inventado. A interface informa que o histórico não está disponível. Não se declara entregue o gráfico temporal real do AC-04. |
| ADM-04 | Média                  | Fallback do limitador administrativo para memória dependia apenas de `E2E_REAL_SUPABASE=1`.                                                                                                                   | Exige as duas flags do harness e origens do site e Supabase com host loopback validado por URL. Fora disso, ausência do DO retorna 503. Memória continua exclusiva do teste local.                                                       |
| ADM-05 | Média                  | JSON `null` no POST de papéis era aceito pelo parser e falhava ao acessar `body.userId`.                                                                                                                      | Corpo deve ser objeto não nulo e não array. Casos inválidos retornam 400 sem chamar RPC.                                                                                                                                                 |
| ADM-06 | Bloqueio do pacote     | `wrangler.jsonc` referencia `scripts/cloudflare-worker.ts`, ausente no ZIP. `route-out-redirect.test.ts` importa `app/api/out/[id]/route.ts`, também ausente.                                                 | Não reconstruídos por suposição. Conferir no repositório original e incluir os arquivos reais na próxima exportação. Não apagar testes para esconder a lacuna.                                                                           |
| ADM-07 | Alta para continuidade | Sidebar e atalhos apontam para `#secao-usuarios` e `#secao-configuracoes`, sem seções correspondentes. Há POST/DELETE de papéis, mas não há interface de gestão de usuários.                                  | Registrado para a próxima fatia. Contrato de listagem de operadores e composição da tela precisam ser formalizados antes de criar uma nova API.                                                                                          |
| ADM-08 | Média                  | Consulta comercial trata erro de RPC de mediana como histórico insuficiente e agrega anomalias somente por produto, sem lojista/meio de pagamento/período.                                                    | Pendente. Separar falha de serviço de amostra insuficiente e delimitar anomalias na mesma tupla da oferta e período pretendido.                                                                                                          |
| ADM-09 | Média                  | `/api/ofertas` limita por Map do processo, sem expurgo, lendo a primeira entrada de X-Forwarded-For; a proteção é desativada em NODE_ENV=test.                                                                | Pendente. Não comprova quota distribuída entre isolates. Definir fonte confiável de IP e mecanismo compartilhado/edge, limite de armazenamento e teste do limitador ativo.                                                               |

## O que a análise confirmou

- Guardas das APIs de negócio declaram papel mínimo. Identidade é obtida por
  `auth.getUser()`, sem uso de `getSession()` para autorizar essas rotas.
- O cliente de serviço administrativo possui `server-only` e não persiste sessão.
- Rotas de atribuição e revogação de papéis recusam alteração da conta raiz.
- A migration de 2026-10-21 usa lock transacional por usuário nas RPCs de papéis
  e revoga escritas diretas de `service_role` na tabela de papéis.
- Preview exige cookie assinado e consulta ao armazenamento de sessão. A assinatura
  está no código de sessão, não foi atribuída ao DO por suposição.
- Wrangler mantém `OFFERS_STORAGE_WORM_VERIFIED=false`. O STATE da origem registra
  aplicação remota de regra de 730 dias em 2026-10-21, mas esta auditoria não
  consultou a conta nem reproduziu sua contraprova física. Não se afirma que R2
  continua desativado, nem se considera AC-09 aprovado por esse registro.
- Nenhum arquivo `.env.local`, `.dev.vars` ou `.env.production.local` veio no ZIP.
  Isso não equivale a uma certificação de ausência de segredos em todo o pacote.

## Validação executada

| Verificação                             | Resultado observado                                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SHA-256 do ZIP contra arquivo fornecido | Confere                                                                                                                                                              |
| Extração                                | 2094 entradas; sem caminho absoluto, traversal ou link simbólico                                                                                                     |
| Instalação isolada                      | pnpm 12.5.1, lockfile congelado, scripts de instalação desativados; Node 24.19.0 disponível, diferente do Node 22 declarado pelo projeto                             |
| TypeScript                              | `tsc --noEmit`, exit 0                                                                                                                                               |
| ESLint nos arquivos alterados           | Exit 0                                                                                                                                                               |
| Prettier nos arquivos alterados         | Exit 0                                                                                                                                                               |
| Regressão focada                        | 65 testes PASS em 5 arquivos                                                                                                                                         |
| Suíte completa com dois workers         | 112 arquivos PASS, 1 arquivo FAIL; 1126 testes PASS e 6 SKIP. Falha de resolução do import da rota de afiliados ausente na origem. Exit 1. Não é check:all aprovado. |
| ESLint global                           | Exit 1 pelo mesmo import ausente na suíte de afiliados                                                                                                               |
| Next build                              | Compilação e TypeScript concluíram; build terminou com exit 1 no prerender da home, por conexão recusada ao Supabase local 127.0.0.1:54321 sem stack configurada     |
| OpenNext/Worker e E2E real              | Não validados nesta cópia; entrypoint ausente e infraestrutura de teste não disponível                                                                               |
| pgTAP e homologação R2                  | Não executados nesta rodada                                                                                                                                          |
| Gitleaks/Semgrep e histórico Git        | Não executados; o pacote não substitui uma árvore Git com histórico para esse gate                                                                                   |

Não se altera o total canônico de testes de AGENTS.md com base em contagens de
outro ambiente. A suíte global permanece não aprovada. A execução inicial da
suíte sem limitar workers terminou sem resumo; o resultado acima é da execução
seguinte, com `--maxWorkers=2`.

## Limitações da correção

A ausência de uma fonte histórica não foi resolvida com números de demonstração.
Analytics, percentuais e gráfico real permanecem pendentes. A API atual da mesa
editorial fornece `_updatedAt`, o que não comprova histórico de publicação ou
transições por status. É preciso definir consulta pelo campo real de publicação,
fuso e contagem por documento lógico, incluindo coexistência de draft/publicado.

Em falha de leitura da auditoria, a timeline ainda retorna uma lista vazia. Uma
próxima fatia deve diferenciar indisponibilidade de ausência de eventos no DTO.
Os serviços comercial/editorial continuam com autorização pelo chamador; a página
agora a garante antes das leituras. Futuras rotas devem usar guarda explícita.

## Continuidade recomendada para o admin

1. Reaplicar esta correção somente após `git apply --check`. Conferir divergência
   contra o ZIP, preservar alterações novas e recuperar os dois arquivos ausentes
   do repositório original. Rodar os gates no Node 22 e stack local correta.
2. Formalizar a fatia de gestão de operadores: página real, listagem paginada e
   projeção segura, acesso exclusivo do admin, atribuição e revogação pelos
   endpoints existentes, confirmação de mutação, raiz imutável e estados claros.
   Cadastro/convite de contas e recuperação de delegados são decisões separadas.
3. Construir uma tela de auditoria com paginação e filtros de ator, ação, status e
   período. Preservar leitura global somente do admin e própria para delegados,
   sem metadados sensíveis no navegador.
4. Conectar métricas e histórico a fontes reais e remover/indicar atalhos ainda
   indisponíveis. Corrigir o recorte comercial e o rate limit público.
5. Validar jornadas reais: raiz e delegado, senha incorreta, MFA pendente, AAL1
   bloqueado, papel revogado, mutação recusada por CSRF/papel, indisponibilidade e
   logout. Deploy permanece manual por decisão do proprietário.

## Próximo agente

Executar `/check review` das correções deste pacote contra o repositório atual,
conferindo primeiro os hashes de base. Recuperar os arquivos ausentes da origem,
sem reconstruir código de segurança por inferência. Depois executar os gates
completos no ambiente local e usar `/architect` para a tela de gestão de operadores
conforme as Specs 0032 e 0033. Sem commit, push, merge ou deploy nesta tarefa.
