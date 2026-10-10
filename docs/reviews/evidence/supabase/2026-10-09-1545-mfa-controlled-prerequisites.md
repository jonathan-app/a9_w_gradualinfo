# Provas Supabase MFA — pré-requisitos controlados

Data: 2026-10-09 15:45, America/Sao_Paulo.
Escopo: admin-mfa/AC-03, AC-05, AC-06 e parte conectada de AC-07.
Resultado: **UNVERIFIABLE**. Nenhuma operação Auth, exclusão de fator, revogação de sessão ou criação de usuário foi executada.

## Evidências observadas

- `supabase/config.toml` declara `project_id = "gradualinfo-editorial"`, API na porta 54321, JWT de 3600 segundos e matrícula/verificação TOTP habilitadas. Configuração do checkout não comprova configuração efetivamente executada.
- Inspeção sanitizada de `.env.local` classificou `NEXT_PUBLIC_SUPABASE_URL` como loopback. Nenhum valor de ambiente foi impresso ou incluído nesta evidência. Loopback não comprova isolamento, propriedade ou conta descartável.
- `supabase` não está no PATH. `package.json` usa `pnpm dlx supabase@2.119.0` para iniciar/resetar a stack; nenhum desses comandos foi executado.
- O executável Docker usa Podman. Inspeção read-only `docker ps --format '{{.Names}} {{.Image}} {{.Ports}}'` falhou no sandbox: configuração de `/run/user/1000/libpod` exige escrita em filesystem somente leitura. A reexecução ampliada foi solicitada e permanecia pendente no momento deste relatório.
- `scripts/prepare-e2e-db.mjs` prepara cópia descartável com JWT de 60 segundos somente na CI (`GITHUB_ACTIONS` e `RUNNER_TEMP`), recusando uso local normal. Não foi executado nem contornado.
- `e2e/admin-dashboard.spec.ts` possui fluxo real opcional, mas seu `beforeAll` exclui diretamente fatores em `auth.mfa_factors` do usuário fixo; não identifica ownership do usuário de runtime. O teste também presume segredo após GET de setup e não aciona a nova matrícula explícita por POST. Não é prova válida do contrato corrigido sem adaptação e isolamento prévios.
- O lockfile identifica SDK Auth JS 2.117.3. Isso não identifica versão/digest do serviço Auth nem índice efetivamente instalado no banco. Não foi obtida referência imutável do Auth/schema exercitado.

## Provas pendentes

| Prova                                                                           | Estado       | Motivo                                                                       |
| ------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| Versão imutável Auth e índice único efetivo                                     | UNVERIFIABLE | Runtime não identificado/inspecionado                                        |
| Duas sessões, listagem inicialmente vazia, um fator final, no máximo um segredo | UNVERIFIABLE | Sem conta descartável comprovada e Auth exercitável                          |
| Resposta perdida/repetição sem novo enroll                                      | UNVERIFIABLE | Sem runtime/controlador de falha isolado                                     |
| Confirmação TOTP e AAL2 na mesma sessão SSR                                     | UNVERIFIABLE | Sem identidade de teste segura                                               |
| Remoção seletiva de fator pendente e verificado                                 | UNVERIFIABLE | Operações administrativas não autorizadas sobre conta real                   |
| Revogação global e recusa de refresh antigo                                     | UNVERIFIABLE | Sem sessões descartáveis e canal Admin API controlado                        |
| Validade residual comprovada e recusa após prazo                                | UNVERIFIABLE | Configuração histórica/efetiva e tolerância não comprovadas                  |
| Nova matrícula, bloqueio AAL1 e acesso AAL2 após recuperação                    | UNVERIFIABLE | Depende das provas anteriores                                                |
| Cadastro público desativado no serviço efetivo                                  | UNVERIFIABLE | `enable_signup = true` no checkout não comprova serviço remoto/local efetivo |

## Pré-requisitos para retomada

Identificar stack/projeto descartável e conta de teste própria, separada do proprietário, por canal confiável; não enviar credenciais em chat. Inspeção de containers autorizada pode estabelecer versão e portas, mas não autoriza mutações por si. Confirmar que aplicação de teste aponta apenas para essa stack, com UUID do usuário descartável e configurações efetivas conhecidas desde sua criação.

Preparar duas sessões anteriores sem persistir tokens em evidência. Executar operações oficiais Admin API previstas no runbook em memória, com credencial administrativa somente no processo controlado. Registrar apenas status, quantidade de fatores, níveis AAL e horários; nunca payload sensível, QR, URI, segredo, códigos, dumps de browser ou screenshots sensíveis. Para residual JWT, comprovar limite superior desde a criação da stack e tolerância do validador, contado da revogação global confirmada.

Não usar a limpeza SQL direta do teste existente como substituta da remoção/revogação oficial. Não declarar os ACs aprovados por inspeção estática, mock ou configuração do checkout. Nenhuma mudança na aplicação/spec/STATE foi feita por esta frente; o agente coordenador consolida o bastão e relatório final.
