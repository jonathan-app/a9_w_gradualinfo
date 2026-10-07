# Execução parcial do plano autorizado

Data: 2026-10-07. Fonte de autorização: mensagem do dono "sinal verde
para plano-atualizacao-auditoria.md", após escolhas explícitas de 30 minutos,
UUID único configurado e troca por POST sem armazenamento do segredo.
Estado: Developing. Sem aprovação de entrega, merge ou publicação.

## Implementação presente

Contratos Accepted em `docs/specs/0003-preview-autorizacao.md` e
`docs/specs/0004-gate-revisao-ci.md`. Preview com credenciais distintas,
comparação criptográfica, grant assinado, prazo absoluto e vínculo ao
session_id verificado. Logout limpa cookies locais mesmo com erro remoto.
JSON-LD mantém serializador próprio; corpo usa React Markdown.

Gate compartilhado exige schema, conjunto exato de ACs, hashes da spec e
provas, SHA e árvore Git, decisão recalculada e checkout limpo. Markdown
legado não desbloqueia gate. CI agora prepara banco local, fixtures,
servidor compilado HTTPS, tipos E2E, gitleaks e regras locais Semgrep.
`ci-check-results.mjs` gera todos os ACs da spec para o checkout executado.
Ele preserva UNVERIFIABLE, pois ainda falta avaliação completa do /check.
Assim o job final continua reprovado, não cria aprovação artificial.

Metadata e navegação editorial corrigidas, exemplo sai da navegação e
sitemap. Home e sitemap dinâmicos com política no-store. Capa local própria
é fallback para URL fora das origens permitidas; imagens reais ainda
precisam de origem documentada e bucket privado configurado no servidor.
Não houve criação de bucket remoto. Autor aparece após fontes.

Verificador de skills distingue lock e SHA do conteúdo instalado e detecta
extras, ausências e alterações. A baseline registra conteúdo observado,
não atesta origem upstream. BRANCHES e catálogo distinguem intenções de
proteções aplicadas. Export exclui saídas adicionais de build e scanners.

## Execução observada

| Check                                                  | Resultado desta execução                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Typecheck da aplicação                                 | exit 0                                                                           |
| Typecheck E2E                                          | exit 0                                                                           |
| Vitest excluindo gates.test.ts                         | 10 arquivos, 62 testes passaram                                                  |
| ESLint                                                 | exit 0, 21 avisos (console em hooks locais e audit)                              |
| Checker de skills                                      | exit 1 esperado, 81 extras fora da allowlist                                     |
| Gates, 18 testes                                       | sandbox bloqueia spawnSync git com EPERM; rerun escalado aguardando autorização  |
| Build Next Turbopack                                   | sandbox bloqueia porta/processo com EPERM; rerun escalado aguardando autorização |
| Pin de actions upstream                                | consulta de rede bloqueada; rerun escalado aguardando autorização                |
| E2E compilado, pgTAP, Lighthouse, scanners e CI remota | Not run                                                                          |
| Export real e proteção remota                          | Not run                                                                          |

Formatação dos arquivos alterados foi aplicada; não equivale a passagem do
format:check da árvore inteira. As execuções históricas em outras revisões
não são prova desta árvore. O build bloqueado não prova defeito funcional.

## Trabalho necessário antes de /check final

1. Concluir negativos E2E reais sem claim, identidade diferente, sessão Auth
   expirada e falha de logout; grant expirado não substitui expiração Auth.
2. Provisionar três identidades descartáveis conforme 0004. O provisionador
   atual só cria uma. Aumentar publicações para provar limite e ordenação.
3. Executar falha real de leitura na home. Teste atual prova só estado vazio.
4. Confirmar SHAs upstream das actions e piná-las; validar versões das
   ferramentas com execução e regras Semgrep com seu parser.
5. Integrar avaliação completa e evidências do /check ao artefato do SHA.
   A matriz atual é deliberadamente reprovada, e não completa essa integração.
6. Executar CI e os 12 cenários compilados; observar cookie Secure, no-store,
   cabeçalhos, accessibility e RLS reais. Emitir review por AC sem fallback.
7. Reconciliar skills extras sem apagar instalações compartilhadas, verificar
   origem upstream, resolver referências de governança ausentes e comprovar
   proteção remota com identidade real do dono. Não inventar CODEOWNERS.
8. Validar export e documentar paginação do sitemap quando atingir o limite
   de 1000 registros. Preparar decisão final do dono sem publicar.

Não há remoção de skills, reset de banco local existente, commit, push,
merge ou deploy nesta execução.

## Correções após pedido do dono para resolver os problemas

As lacunas de código e fixtures foram tratadas em nova rodada:

- `scripts/ci-fixtures.mjs` cria três identidades e doze publicações adicionais.
- `scripts/e2e-fault-proxy.mjs` induz falha real de leitura, logout e refresh
  em portas loopback separadas, com controle autenticado exclusivo de E2E.
  Não há rota ou flag de teste na aplicação de produção.
- `scripts/prepare-e2e-db.mjs` gera configuração JWT de 60 segundos fora
  do checkout, somente no runner descartável. Não altera banco local existente.
- E2E inclui identidade diferente, ausência de claim na identidade permitida,
  conta sem claim, falha remota de logout, Auth realmente expirado, vazio e
  erro de transporte da home. Limite de dez e ordem das datas são exigidos.
- Leitura pública agora usa cliente sem sessão, impedindo JWT vencido de
  contaminar a consulta pública e transformar ausência em erro de banco.
- `scripts/ci-assess.mjs` avalia casos obrigatórios por AC e logs pgTAP.
  Ausência, skip, interrupção, falha em retry ou manifesto de outra revisão
  não viram PASS. Manifests são gerados em checkouts limpos; avaliação humana
  continua separada. Integração no gerador foi implementada, ainda sem CI real.
- Actions pinadas por SHA consultado em release/commit oficial, fontes em
  `docs/audits/2026-10-07-ci-pins.md`. Python e Lighthouse pinados, asserts
  Lighthouse corrigidos, qualidade chama `pnpm check:all`, jobs com timeout.
- Gitleaks confere versão de binário já instalado. Semgrep distingue erro
  operacional de versão divergente; YAML corrigido e parseado localmente.
- Referências de governança e convenções agora existem em `docs/workflow/`.
- Quarentena reversível de extras preparada com baseline de 81 hashes em
  `security/skills-quarantine.json`. Execução requer escrita na pasta protegida
  `.agents` e aguarda a autorização solicitada, não houve remoção de skills.

Novas provas: testes da avaliação mecânica passaram (7), serviço de posts
passou (11, incluindo regressão de Auth vencido); typechecks app e E2E
passaram. Prettier da árvore inteira passou antes das últimas adições;
novo check final será registrado no STATE. Playwright `--list` reconheceu
34 casos em sete arquivos, sem executar navegador. Lint exit 0 com 21 avisos.
YAML de CI e Semgrep passou no parser YAML, que não substitui o parser Semgrep.

Bloqueios atuais: build e testes Git com EPERM, inspeção Docker/Podman com
configuração fora da área gravável, Semgrep tentando gravar ~/.semgrep e
Gitleaks sem download permitido. Execuções escaladas foram solicitadas e
continuam sem resultado. CI remota, E2E compilado, pgTAP, Lighthouse, export,
proteção remota e origem upstream das skills não foram comprovados.
As pendências enumeradas acima na primeira rodada são históricas quando
há implementação correspondente nesta seção; execução final continua pendente.
