# Admissão administrativa com Cloudflare Access

**Date**: 2026-10-09 16:32, America/Sao_Paulo.
**Status**: Accepted
**Decision source**: O proprietário escolheu nesta sessão nova spec substituta após aceite, admissão antes do login, Cloudflare Access com provedor de identidade e MFA, toda a área e APIs administrativas, ambiente separado com conta de teste, conta Google pessoal, sessão de uma hora e MFA independente por biometria ou chave de segurança. O proprietário aprovou aplicar os ajustes R1 a R8 e, em escolha posterior, os detalhes residuais R9 e R10 da revisão independente em 2026-10-09. Contrato integral aceito explicitamente pelo proprietário em 2026-10-09: “Aceitar e implementar localmente”. Não há autorização de merge, deploy ou alteração remota.
**Replacement target**: `2026-10-09-0852-rate-limiting-admin.md`. A substituição só ocorre após aceite integral desta spec. O contrato atual permanece Accepted enquanto esta proposta estiver Proposed.

## Summary

Exigir admissão do proprietário pelo Cloudflare Access antes de executar qualquer rota administrativa. A entrada usa Google e MFA independente no Access por biometria ou chave de segurança. Supabase continua responsável pela identidade administrativa e pelo MFA da aplicação. As duas quotas persistentes passam a receber apenas requisições admitidas, sem criar contadores por IP.

## Context

O contador atual possui duas linhas SQLite em um Durable Object dedicado, uma para login e outra para desafio MFA. Ambas permitem cinco tentativas em sessenta segundos. A quota de login pode ser esgotada continuamente por qualquer cliente HTTP que declare uma origem válida.

O proprietário quer impedir que origens sem admissão consumam essa quota. Há uma única identidade administrativa. O site editorial permanece público. Não há comprovação atual de aplicação Access, configuração Google, MFA Access ou ambiente remoto de teste. Aceite de desenho não equivale a essas configurações estarem disponíveis.

Modo ENHANCEMENT, aplicação web Next.js com OpenNext e Cloudflare Worker. Abordagem Tracer Bullet conforme AGENTS.md. Não há mudança de domínio editorial, esquema Supabase ou recuperação MFA já contratada.

## Requirements

- **admin-access/AC-01**: Google admite exclusivamente a identidade do proprietário configurada; Access exige MFA independente por biometria ou chave de segurança. Outra conta, inclusive uma conta Google autenticada, não entra. Não existem políticas Bypass, Service Auth, Everyone ou permissão por domínio inteiro na aplicação administrativa.
- **admin-access/AC-02**: Aplicação e política Access limitam a sessão a 3600 segundos; validade do MFA independente também é 3600 segundos. Não dispensar MFA com base em AMR do Google. Provar a exigência no ambiente controlado e a nova admissão após expiração; não inferir MFA de um header ou de login Google bem sucedido.
- **admin-access/AC-03**: Cobrir `/admin-dashboard`, seus descendentes, `/api/admin` e seus descendentes para todos os métodos, inclusive GET, HEAD, OPTIONS, RSC e Server Actions. Caminhos com aparência de asset não escapam. Nenhuma função administrativa fica acessível por rota pública alternativa.
- **admin-access/AC-04**: Validar criptograficamente a asserção Access, issuer, audience, expiração, emissão, tipo de identidade humana e e-mail permitido antes de sessão Supabase, consumo DO, leitura administrativa ou mutação. Header de e-mail isolado, IP, Origin, Referer e X-Forwarded-For não concedem admissão.
- **admin-access/AC-05**: Asserção ausente, inválida, expirada, de outra aplicação ou de outro proprietário retorna 403 na aplicação sem consumir quota nem chamar Supabase. Configuração ausente, JWKS indisponível sem cache válido, timeout ou falha interna retorna 503 e Retry-After 5. Respostas privadas, sem redirecionamento controlado por entrada.
- **admin-access/AC-06**: Após admissão, preservar autorização Supabase por getUser, ADMIN_USER_ID e currentLevel AAL2. Access não substitui essas verificações. Preservar CSRF, ownership de factorId, cookies SSR e matrícula POST sem escrita em GET conforme a spec MFA vigente.
- **admin-access/AC-07**: Preservar duas quotas independentes, cinco tentativas por janela fixa de 60000 ms, consumo atômico e persistente, expiração, alarme e no máximo duas linhas. Recusas por admissão e CSRF não consomem quota. MFA valida UUID Supabase antes do consumo. Mesmo com requisições hostis repetidas sem admissão, o proprietário conserva suas cinco tentativas no cenário controlado.
- **admin-access/AC-08**: Após admissão, a sexta tentativa recebe 429 real em JSON e formulário, Retry-After calculado e no-store. Binding ausente, protocolo inválido, armazenamento ou deadline DO produzem 503 sem signIn ou challenge. Reinício e concorrência são comprovados pelo binding Worker real, não apenas mocks.
- **admin-access/AC-09**: Hosts alternativos, workers.dev, preview de versões, requests diretos, headers internos forjados e caminhos codificados não contornam a validação na aplicação. Provar cobertura de cada host que executa o bundle. Hosts administrativos não cadastrados falham 403 mesmo com token válido da mesma aplicação.
- **admin-access/AC-10**: Site editorial, artigos, assets públicos e health continuam acessíveis sem Access. Namespace e migrations de preview permanecem intactos; o endpoint administrativo de emissão de preview recebe a nova admissão. Não ampliar Access para consumo público de preview neste contrato.
- **admin-access/AC-11**: A aplicação não persiste nem ecoa tokens Access, cookies, e-mail ou IP no DO, logs, Sentry, relatórios ou testes exportados. JWKS é o único cache entre requisições. Provar ausência de asserções e segredos no bundle público, observabilidade e respostas da aplicação. Cookies, transmissão e telemetria geridos pelo Access são tratados separadamente, sem exportação de dados reais.
- **admin-access/AC-12**: Logout administrativo revoga a sessão Supabase pelo contrato existente e oferece encerramento explícito da sessão Access no endpoint fixo do host cadastrado. Não afirmar revogação instantânea de asserções copiadas: medir a validade residual e documentar o teto de 3600 segundos mais tolerância de relógio de 5 segundos. Recuperação de Access é manual pelo proprietário no painel Cloudflare, sem endpoint público nem bypass.
- **admin-access/AC-13**: Provas reais usam aplicação Access, hostname, conta Google de teste, MFA e Supabase separados da conta real. Sem bypass local, reset de fatores reais ou reutilização de namespace de produção. Aceite libera implementação local; configuração remota e publicação exigem autorização específica. Gate final vincula spec, commit e conteúdo da árvore efetivamente testada.

## Options considered

### Quota por IP

Reduz o impacto de um emissor e permite login público. Exige confiança no IP, retenção, cardinalidade e política de saturação. NAT compartilha limite e ataques distribuídos continuam capazes de esgotar recursos. Não atende sozinho ao requisito escolhido.

### Admissão por Access antes das quotas existentes

Restringe quem pode consumir tentativas e preserva estado limitado. Acrescenta uma etapa de login e dependência de Google, Access, política correta e fatores de recuperação.

### Remover quota global e depender somente da borda

Simplifica a aplicação. Perde o contrato de contagem persistente por operação e não comprova a semântica de cinco tentativas; descartada para esta revisão.

## Decision

Após aceite, esta spec substitui a decisão de expor a quota de login a qualquer cliente com origem declarada válida. Incorpora integralmente os detalhes técnicos do contrato de 08:52 para SQLite, coordenação de alarme, protocolo interno, limite de entrada 128 bytes, resposta 256 bytes, deadline total DO 2000 ms, schemas, cookies, 429/503, binding, export e migration aditiva. Esses detalhes continuam normativos; esta revisão acrescenta admissão anterior e redefine quem pode consumir, sem descartá-los. Os ACs desta spec são a nova matriz de verificação e incluem a revalidação do contador.

Recomendar admissão Cloudflare Access validada na aplicação, seguida pelos controles Supabase e DO existentes. A alternativa por IP mantém riscos e acrescenta armazenamento que a admissão da conta única torna desnecessário.

Usar Google, incluindo contas pessoais, como provedor permitido na política. Configurar permissão de e-mail exato do proprietário, já informado nesta sessão, sem replicar seu valor nesta spec. Exigir MFA independente Access com métodos `biometrics` e `security_key`, duração `1h`, sem aceitar TOTP, PIN por e-mail, service tokens ou dispensa por MFA do IdP nesta aplicação. A disponibilidade desse recurso na organização deve ser comprovada antes de implementação conectada; não trocar o método silenciosamente.

Validar o JWT (asserção assinada) com biblioteca `jose`, API Web Crypto compatível com Worker, algoritmo RS256 explicitamente permitido. A versão deve ser fixada pelo lockfile e validada quanto à compatibilidade durante /develop. Não escrever verificador criptográfico próprio. Nenhuma biblioteca é instalada nesta rodada.

Não usar somente `ctx.access`, headers de identidade ou um flag de bypass. Validar criptograficamente no wrapper fetch do Worker antes de delegar ao OpenNext. Guardas internas exigem o contexto confiável da mesma requisição, sem repetir a validação com novo orçamento. Next dev/start sem esse contexto falha 503 no administrativo, mesmo com header Access. A aplicação não cria sessão própria de admissão nem copia a asserção para novo cookie.

## Rationale

Para uma única conta, impedir consumo por pessoas não admitidas resolve a causa da indisponibilidade da quota sem ampliar a tabela. A quota global continua limitada, mas só o proprietário admitido pode consumi-la. Um token roubado ou sessão comprometida continua capaz de esgotá-la; a decisão não promete disponibilidade contra comprometimento da identidade nem contra falha da plataforma.

MFA independente evita depender de uma alegação não comprovada de MFA da conta Google pessoal. Supabase permanece como segunda camada de autorização, com UUID fixo e AAL2 próprio.

## Feature design

### Dados e fontes

Sem nova tabela de usuários, relação de identidades ou quota por origem. Preservar `quotas(operation TEXT PRIMARY KEY, count INTEGER, expires_at INTEGER)` e constraints login/mfa, count 1..5 do contrato anterior. A conta Access e o UUID Supabase são duas configurações explícitas da mesma pessoa; não converter e-mail em UUID nem provisionar usuário automaticamente.

| Entidade            | Chave              | Campos                              | Relação e retenção                                                           |
| ------------------- | ------------------ | ----------------------------------- | ---------------------------------------------------------------------------- |
| Quota DO            | operation          | count, expires_at                   | Duas operações, exclusão por expiração e alarme; sem identidade              |
| Configuração Access | ambiente           | issuer, audience, ownerEmail, hosts | Valores obrigatórios definidos pelo proprietário e painel Access; sem tabela |
| JWKS em memória     | issuer configurado | até 64 chaves públicas              | Cache máximo 300 segundos, nunca tokens ou decisões de autorização           |

| Valor produzido           | Fonte                                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caminho protegido         | URL do Request recebido no fetch do Worker antes do OpenNext; fronteiras exatas e variantes codificadas conforme regras de entrada                                                     |
| Asserção                  | único header `Cf-Access-Jwt-Assertion`, máximo 8192 bytes UTF-8; não ler token do corpo/query                                                                                          |
| Assinatura                | chave pública JWKS do issuer fixo mais kid do JWT; rejeitar jku/x5u não configurados                                                                                                   |
| Issuer e JWKS             | `ADMIN_ACCESS_ISSUER`, HTTPS exato em subdomínio cloudflareaccess.com; caminho fixo `/cdn-cgi/access/certs`                                                                            |
| Audience                  | `ADMIN_ACCESS_AUD`, um AUD administrativo por ambiente, obtido no painel Access                                                                                                        |
| Proprietário Access       | `ADMIN_ACCESS_OWNER_EMAIL`, e-mail explicitamente escolhido pelo proprietário; comparação exata sem aliases Gmail                                                                      |
| Host permitido            | URL do Request recebido no fetch do Worker; comparação com ADMIN_ACCESS_HOSTS, nunca Forwarded ou X-Forwarded-Host                                                                     |
| Identidade humana         | Conjunto de claims assinadas: type app, sub e email obrigatórios; ownerEmail exato e política humana Google comprovada. type app isolado não comprova pessoa; excluir service identity |
| Validade                  | iat e exp obrigatórios, números inteiros finitos em segundos UTC; nbf opcional com mesmo tipo; relógio servidor, tolerância 5 segundos                                                 |
| Expiração máxima          | exp maior que iat, exp menos iat no máximo 3600 segundos; iat não futuro além da tolerância                                                                                            |
| Sessão e MFA Access       | aplicação/política e independent MFA no painel Access, ambas `1h`; prova de configuração e comportamento                                                                               |
| Quota e Retry-After       | SQLite e relógio DO conforme contrato anterior; nenhuma alteração de algoritmo                                                                                                         |
| Identidade administrativa | getUser().id comparado a ADMIN_USER_ID, AAL atual do Supabase                                                                                                                          |
| Logout Access             | URL HTTPS no host permitido e caminho fixo `/cdn-cgi/access/logout`, sem retorno escolhido pelo cliente                                                                                |

### Entrada, API e respostas

Configurar `assets.run_worker_first: true` no Wrangler, em todos os ambientes que executam o bundle, garantindo que a plataforma invoque o Worker antes de servir qualquer asset. Assets públicos também atravessam o Worker e continuam públicos. Não substituir por regras seletivas sem revisão do contrato e prova de cobertura equivalente. Verificar a precedência em instância real, inclusive caminho administrativo com extensão e variante codificada.

Em `scripts/scripts/cloudflare-worker.ts`, exportar um wrapper default com fetch que recebe Request, env e ExecutionContext originais. Preservar exports nomeados gerados e classes DO. Executar classificação, host e admissão antes de chamar o default fetch gerado em `.open-next/worker.js`, portanto antes de skew protection, middleware, assets ou respostas automáticas OpenNext. Não editar o bundle gerado.

Fonte canônica do host: `new URL(request.url)` na entrada Worker. Exigir HTTPS, hostname ASCII minúsculo, sem ponto final, usuário/senha ou fragmento; normalizar porta HTTPS ausente e 443 como a mesma autoridade. ADMIN_ACCESS_HOSTS contém autoridades normalizadas sem esquema, caminhos, curingas ou portas diferentes de 443. Se Host estiver presente, normalizá-lo com as mesmas regras e recusar divergência por 403. Headers Forwarded e X-Forwarded-Host não mudam essa decisão e são removidos na cópia encaminhada. Host inválido/não cadastrado falha 403 para pedido administrativo, inclusive com JWT da mesma aplicação.

Classificar raiz e fronteira `/` dos prefixos administrativos antes de despachar. Não considerar `/admin-dashboard-outro` um descendente. Testar diferenças de barras, barras invertidas, dot segments e codificação percent com o runtime real. Variantes que o adaptador normalizaria para administrativo devem ser protegidas; quando a forma for ambígua, retornar 400 genérico antes do despacho. Não transformar uma forma ambígua em rota pública. A matriz de equivalência do bundle é requisito de verificação; se não for possível demonstrar classificação segura, bloquear a variante e retornar ao /architect, sem liberar por heurística.

Após admissão, criar objeto interno congelado com versão 1, autoridade canônica, método, pathname de entrada, deadline monotônico e resultado permitido. Passá-lo como propriedade objeto `ADMIN_ACCESS_REQUEST_CONTEXT` em cópia de env específica dessa requisição, sobrescrevendo qualquer valor de mesmo nome, sem mutar env original. Não transportar asserção, e-mail, cookie ou resultado por headers. Não guardar contexto em global nem process.env. `getCloudflareContext().env` é a fonte das guardas internas: o template OpenNext instalado usa AsyncLocalStorage para o env passado ao fetch. A preservação dessa propriedade, inclusive em middleware e função server, exige prova no bundle real com duas requisições concorrentes de hosts/identidades distintos. Se a propriedade não atravessar a adaptação, falhar 503 e retornar ao /architect; não adotar header alternativo.

Em `proxy.ts`, adicionar matchers explícitos administrativos, inclusive extensões. Antes de updateSession, exigir contexto permitido da requisição. APIs, login, layout administrativo, setup, verify e autorizador server também exigem a mesma guarda antes de Supabase; nenhuma página fica coberta somente por presumir que já usa o autorizador atual. Guardas conferem esquema interno, host permitido, política de configuração e correspondência com método/path quando disponíveis, sem confiar em headers para reconstituir host. Server Components usam exclusivamente o contexto request scoped. Não disparar código administrativo em uma chamada que recebeu contexto público ou ausente. Server Actions administrativas exigem a mesma guarda, mesmo quando o transporte ocorre por rota não administrativa. Não permitir ações administrativas em endpoints públicos.

Todos os métodos das superfícies abaixo exigem admissão, ainda que o handler depois devolva 405.

| Superfície                        | Entrada adicional | Continuidade ou recusa                                   |
| --------------------------------- | ----------------- | -------------------------------------------------------- |
| `/admin-dashboard` e descendentes | asserção Access   | Página existente somente após admissão e regras Supabase |
| `/api/admin` e descendentes       | asserção Access   | Contrato de API existente após admissão                  |
| Rotas públicas                    | nenhuma           | Comportamento público atual                              |

Na borda, Access gerencia a navegação de login Google e MFA. Não prometer 403 JSON para uma requisição interrompida pela própria borda: registrar separadamente status e redirects reais Access. Quando a requisição chega à aplicação, ausência ou falha de identidade produz 403, erro técnico produz 503, nunca redirect para um endereço enviado pelo cliente. Negativas JSON têm `{ ok: false, error: "access_denied" }` ou `{ ok: false, error: "access_unavailable" }`; HTML mínimo tem mensagem genérica sem identidade. Seleção JSON usa Accept ou Content-Type application/json como no rate limiter. Negativas incluem `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`; 503 inclui Retry-After 5. Demais respostas administrativas também são privadas.

Ordem: validar configuração e host, validar Access, aplicar CSRF existente para mutações, validar identidade Supabase quando exigida, consumir quota correspondente e executar operação. Não consumir quota em páginas, matrícula ou logout se o contrato anterior não a exige. Preservar a semântica de parsing posterior ao consumo no login já admitido.

### Falhas e limites

Um orçamento total de admissão de 2000 ms por requisição, iniciado no fetch Worker por relógio monotônico `performance.now()`, incluindo espera de JWKS, leitura e validação. O contexto só é criado após sucesso dentro desse prazo. Guardas internas consomem o resultado request scoped, não abrem novo deadline nem nova consulta JWT. O prazo limita a decisão inicial de admissão, não a duração de renderização ou da operação após permitida. O deadline DO continua separado. Sem retry automático na requisição.

JWT exige header alg RS256, kid string não vazia de até 256 caracteres, sem jku/x5u; rejeitar alg diferente, formato inválido, valores duplicados ambíguos e claims com tipos incorretos. iat/exp obrigatórios inteiros finitos; nbf, se houver, igual restrição. sub string não vazia, email string exata e type app são necessários junto à assinatura/issuer/audience. Confirmar formato de emissão humana contra Access real; se incompatível, retornar ao /architect, sem afrouxar claims silenciosamente.

JWKS remoto aceita somente URL HTTPS derivada do issuer configurado, status 200, JSON de até 65536 bytes efetivos e no máximo 64 chaves, sem redirects. Schema mínimo: objeto keys array; chaves elegíveis têm kty RSA, kid string válido, n/e strings base64url válidas, alg ausente ou RS256, use ausente ou sig, key_ops ausente ou incluindo verify sem operação privada. Não aceitar parâmetros RSA privados. Mais de uma chave elegível para o mesmo kid torna o conjunto inválido (503). Cache único por issuer configurado, não por kid submetido, TTL de 300 segundos contado do fetch bem sucedido. Nenhum cache de erro ou de kid aleatório cresce com entrada.

Estados: vazio/vencido exige fetch; válido com kid conhecido permite validação; válido com kid desconhecido pode iniciar um refresh único se cooldown de 30 segundos desde início da última consulta remota terminou. Se há refresh em andamento, consumidores de kid desconhecido compartilham sua promise; consumidores com kid conhecido continuam com cache válido. Durante cooldown sem refresh, kid ausente de conjunto válido produz 403. Sem conjunto válido e sem possibilidade de fetch durante cooldown após falha, produzir 503.

Fetch compartilhado tem seu próprio prazo de 2000 ms. Deadline individual deixa de esperar sem abortar o fetch de outros consumidores; ao terminar o prazo próprio, o fetch é cancelado. Falha de refresh não descarta conjunto ainda dentro do TTL. Requisição que depende da chave não encontrada e encontra falha de rede/timeout/schema recebe 503; depois de fetch válido sem esse kid recebe 403. Requisição posterior com kid conhecido pode usar o cache ainda válido; nenhuma chave é reutilizada após TTL. Registrar apenas categoria sanitizada de erro. Testar rotação durante cooldown e tráfego de kids aleatórios. Os números são limites de projeto, não medições de produção.

Não manter cache de decisões de admissão entre requisições. Contexto imutável da requisição atual é transporte interno de resultado, descartado ao concluir a requisição. Renovação e revogação remota Access não garantem invalidação imediata de um JWT copiado validado offline. Limitar validade local ao exp e ao teto acima. Incidente com token comprometido requer revogar sessões Access e Supabase, avaliar bloqueio manual de identidade na configuração e medir propagação; nunca abrir bypass de recuperação. Não executar esse procedimento nesta entrega.

Em `lib/env.ts`, criar leitor tipado de configuração Access que recebe diretamente o `env` original do fetch Worker. Validar issuer, AUD, ownerEmail e hosts por esse argumento, nunca pelo snapshot de process.env carregado na importação. Guardas internas chamam o mesmo leitor com `getCloudflareContext().env` da requisição atual. Não copiar configuração ou contexto para globals nem depender de uma requisição pública anterior para inicialização. Provar instância fria cuja primeira chamada seja administrativa e duas chamadas concorrentes com contextos distintos. Em dev/start sem contexto Worker, o administrativo falha fechado.

Google OAuth client e segredo ficam exclusivamente na configuração Access, nunca no frontend ou env público Next. Variáveis Access acima são server only e passam pelo leitor de env explícito em lib/env.ts. Configuração incompleta bloqueia a área administrativa com 503, inclusive dev/start. A leitura pública pode funcionar com configuração administrativa ausente.

No logout, primeiro executar a saída Supabase existente. Mostrar opção explícita de encerrar também o Access usando navegação de topo para URL fixa; limpar segredo transitório MFA como já contratado. Se admissão expirou, o proprietário encerra Access pelo endpoint da plataforma ou limpa sessão no navegador e faz nova admissão. Não afirmar que logout local destruiu cópias de JWT, nem alterar MFA Supabase por esse fluxo.

### Provas críticas

AC-01/02: conta distinta negada, proprietário de teste admitido somente após biometria/chave; medir políticas e expiração de uma hora. AC-03/09: matriz de todos os hosts e rotas, incluindo raízes, extensão .svg, URL codificada, RSC, métodos e actions; headers forjados não liberam.

AC-04/05: token sem assinatura, audience/issuer/email divergente, expirado, emissão futura, duração excessiva, service identity, JWKS inválido/timeout/rotação; zero chamadas Supabase e DO antes da admissão. AC-06: Access permitido com UUID Supabase divergente ou AAL1 não acessa operação AAL2.

AC-07/08: ataque sem admissão em janelas sucessivas preserva cinco tentativas para dono admitido; concorrência, restart persistente, 429/503 e cookies após admissão pelo Worker real. AC-10/11: público continua disponível e nenhum token aparece em observabilidade, payload público ou artefatos. AC-12/13: logout e validade residual medidos com conta de teste, sem tocar conta real.

## Build plan

1. Criar thread vertical mínima no ambiente isolado: configuração tipada, wrapper Worker, contexto imutável por env request scoped, verificador server only e uma rota administrativa passando pelo proxy e guarda até Supabase e DO. Testar dono de teste admitido e intruso negado (AC-01, AC-04, AC-05, AC-06, AC-07, AC-13). Configuração remota é plano a executar somente com autorização específica.
2. Completar cobertura de todas as páginas, APIs, métodos, RSC/actions e hosts; configurar assets.run_worker_first true e comprovar leitor Access pelo env original na primeira requisição de instância fria; limites JWKS e mensagens privadas, com testes unitários de falsificação e falhas (AC-03, AC-04, AC-05, AC-09, AC-11).
3. Validar sessão Access/MFA, logout e recuperação operacional com identidade de teste; comprovar MFA exigido na política sem dispensa Google (AC-01, AC-02, AC-12, AC-13).
4. Exercitar quotas existentes pelo binding real, restart, concorrência, cookies, HTTP e preservação de público/preview (AC-06, AC-07, AC-08, AC-10).
5. Rodar qualidade, build Next/OpenNext, dry-run e /check verify com evidências e hashes do código testado; /check review independente antes de qualquer autorização de merge (todos os ACs).

## Migration plan

Estratégia aditiva: manter classe, tabela, nome singleton, bindings e migrations DO atuais. Não zerar quotas nem criar namespace por IP. Adicionar admissão antes dos controles existentes.

Sequência obrigatória, cada ação remota depende de autorização específica:

1. Inventariar domínio customizado, rotas Worker, workers.dev, aliases e previews de versões, indicando versão atual e caminhos administrativos em cada entrada. Não presumir que política em um domínio cobre os demais.
2. Criar ambiente de teste independente com application AUD, Google de teste, MFA, hostname, Worker, Supabase e namespaces DO próprios. Sobrescrever explicitamente todas as vars/bindings herdadas do Wrangler, incluindo site URL, UUID/e-mail, issuer/AUD/hosts e namespaces de preview/quota. Conferir inventário sem exportar segredos antes do primeiro request.
3. Provar política Access e wrapper corrigido no ambiente isolado. Conferir recuperação manual pelo painel Cloudflare sem remover exigências da aplicação.
4. Antes da transição de produção, proteger por Access ou fechar entradas administrativas do bundle antigo em todos os hosts. Desabilitar acesso a hosts alternativos sem política abrangente; preservar público por regras específicas quando possível. Se não houver isolamento de caminhos confiável, fechar o host alternativo inteiro após autorização. Manter a área administrativa fechada durante a coordenação, sem abrir janela de bypass.
5. Publicar bundle validador com configurações completas somente após autorização de publicação. Nenhuma configuração ou publicação é executada pelo aceite desta spec.
6. Medir cada entrada inventariada, verificar público, dono admitido, intruso, mesma audience em host desconhecido e ausência de consumo DO antes da admissão. Só concluir proteção quando todas as entradas administrativas antigas estiverem protegidas/fechadas e as novas comprovadas.

Rollback autorizado preserva proteção Access e quotas. Não desabilitar Access para recuperar login. Se a versão antiga não valida admissão, bloquear hosts alternativos antes de reverter; sem prova de isolamento, manter administrativo fechado e público disponível. Registrar falhas de acesso em mensagens sanitizadas, sem token ou identidade.

## Consequences

Requisições sem identidade admitida deixam de consumir quota. Persistência continua com duas linhas e sem dados pessoais no DO. A aplicação ganha uma etapa de login e dependência adicional de disponibilidade e configuração.

Sessão admitida roubada pode consumir quota. Google, Access, MFA e Supabase podem indisponibilizar o acesso. Não há garantia absoluta contra negação de serviço de infraestrutura. Validar JWT offline deixa prazo residual até expiração, e a política remota MFA é parte necessária da prova, não uma conclusão extraída apenas da assinatura.

Os métodos biometrics/security_key referem-se às categorias disponibilizadas pelo Access, sem promessa de biometria física obrigatória nem proibição do PIN local do autenticador. Comprovar recurso, política sem dispensa Google e nova exigência após 1h mesmo com sessão Google ativa antes da conclusão conectada.

A proibição de retenção/eco cobre a aplicação e artefatos exportados. Access transporta JWT e gerencia cookies; sua telemetria pode conter identidade. Antes de configuração remota, registrar na operação o destino e retenção efetivamente configurados de logs Access, sem exportar dados pessoais ou tokens. Evidências usam dados sintéticos ou contagens sanitizadas. Não descrever esses cookies de plataforma como vazamento provocado pela aplicação.

Este controle não impede chamadas diretas ao Supabase Auth nem comprova proteção integral da conta. Admissão precede origem/identidade/consumo, prevalecendo sobre qualquer trecho herdado que liberava consumo por origem declarada válida.

A conta real, secrets, fatores e configuração remota não são alterados por esta proposta. Provas MFA anteriores permanecem pendentes, não são aprovadas por esta spec.

## Follow-up

Revisão independente registrada em `2026-10-09-1644-0009-revisao-admissao-access.md`. Ajustes R1 a R10 aprovados para incorporação pelo proprietário; obter aceite integral separado da spec corrigida. Antes da configuração conectada, fornecer issuer, AUD e host de teste por configuração server only, identificar conta Google de teste e verificar recurso independent MFA na organização. Para produção, inventariar hosts ativos, configurar ownerEmail escolhido e obter autorização remota específica. Não inventar valores para preencher essas configurações.

O proprietário escolheu em 2026-10-09 não descobrir skills ou MCP agora, registrar para depois. A descoberta de recursos Cloudflare Access fica adiada; nenhuma busca, instalação ou conexão é autorizada por esta escolha.
