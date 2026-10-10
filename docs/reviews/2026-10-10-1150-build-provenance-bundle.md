# Vínculo do build local e inspeção sigilosa do bundle

## Proveniência

O usuário relatou `check:all`, build Next/OpenNext e Wrangler dry-run concluídos na árvore local, sem deploy. A saída do build foi gerada em `.open-next/` por volta de 11:37:58 de 2026-10-10 (America/Sao_Paulo). O commit `62adba6d0e809f03445b8ad1f30a55dcfd41f723` foi criado às 11:37:25; os commits posteriores `f091d66` e `21ecb41` alteraram somente `README.md` e documentação de revisão. Isso é compatível com o build usando o código de aplicação de `62adba6`, mas não prova o estado completo da árvore durante a execução.

No instante desta inspeção, HEAD era `21ecb41f02975cdfbeb7693f9902a108217dec67` e havia arquivos modificados e não rastreados. `vitest.config.mts` foi modificado às 11:49, após o bundle. Por isso, **não se pode vincular `check:all`, build e dry-run a um único commit e diff exatos com as evidências disponíveis**. O SHA do diff e o estado atual mudam com sessões concorrentes; um manifesto gerado agora seria de outra árvore.

Identificadores da saída local inspecionada:

| Artefato                                                   | SHA-256                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Manifesto determinístico de 1666 arquivos em `.open-next/` | `f262706498c540139a53368823cf15fe22771f7d1ff682a593f4c201e4a354b7` |
| `.open-next/worker.js`                                     | `d05223bf4d44c84108a102ab62aa3bc9c5568f0c3ac2064c37be5cc65c64bc45` |
| `.open-next/cloudflare/next-env.mjs`                       | `267a510ccb6aab4c6f51df54f085a53bb18f6226073310d701932540156c346c` |

## Inspeção de credenciais sem revelar valores

Foram lidos apenas os nomes e valores internamente de `.env.production.local` e `.env.local`; nenhum valor foi impresso ou gravado neste relatório. A busca exata, com variante escapada para JSON, percorreu 1666 arquivos de `.open-next/` e 18 arquivos de `.next/static/`.

- `SANITY_API_READ_TOKEN` de `.env.local` tem correspondência exata em `.open-next/cloudflare/next-env.mjs`, que é importado pelo inicializador do adaptador. Não houve correspondência exata desse valor em assets de cliente.
- `ADMIN_USER_ID`, `ADMIN_EMAIL`, `SANITY_PROJECT_ID` e `SANITY_ORGANIZATION_ID` de `.env.local` também aparecem no módulo de ambiente do lado servidor. Esses campos podem ser sensíveis ou pessoais, embora não sejam todos credenciais.
- Valores `NEXT_PUBLIC_*` de `.env.production.local` aparecem na saída de servidor e nos assets de cliente, coerente com o prefixo público. Os valores correspondentes de `.env.local` apareceram apenas no módulo de ambiente do lado servidor nesta busca.
- Uma sequência com formato de JWT aparece no mesmo módulo de ambiente do lado servidor. Esta análise não classifica sua finalidade nem validade.
- Quatro campos `SUPABASE_PREVIEW_*` tinham valores curtos ou não verificáveis pelo método de busca exata e foram marcados como não examinados. Zero marcadores PEM de chave privada foram encontrados; isso não equivale a uma auditoria completa de segredos.

`.open-next/` e `.env*` estão ignorados pelo Git. Ainda assim, o token incorporado ao módulo do lado servidor é **segredo sensível**. Este bundle não deve entrar em Git, ZIP compartilhado ou artefato público. A ausência de correspondência nos assets de cliente não comprova armazenamento seguro nem uso de Worker Secret. A inspeção também não prova se o token está na versão publicada.

Antes de qualquer publicação futura, conferir o escopo das variáveis fornecidas ao build e executar a verificação de segredos do projeto sobre o pacote final, com saída redigida. Repetir `check:all`, build e dry-run em snapshot isolado, registrando SHA, diff e hashes antes e depois. A proveniência atual permanece incompleta.

## Runtime

Esta inspeção não fez requisições à produção. Health, robots, home, Access, MFA e Durable Objects da versão publicada ainda exigem respostas e logs correlacionados ao Version ID. Não foi feito push, merge ou deploy nesta rodada.
