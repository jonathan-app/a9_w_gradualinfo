# Reconciliação dos alertas históricos Gitleaks

Data: 2026-10-09 16:20, America/Sao_Paulo.
Inspeção somente leitura; nenhum scan novo, fetch, prune, gc, reescrita, force-push ou rotação executado.

## Resultado

A alegação de **11 findings atuais em `10eecbc` está superada pelas evidências posteriores deste clone**. O histórico antigo deve permanecer como registro de incidente, não como resultado atual do scanner.

- Registro **133** de `workflow/STATE.md` documenta force-push com lease previamente autorizado, troca da referência remota para `2bcea1d`, remoção local do objeto antigo e reexecução `pnpm security:secrets` com zero findings/exit 0. Esta inspeção não repetiu nem autorizou essas ações.
- Referência local `refs/remotes/origin/feat/md-0002-casca-editorial-home` resolve atualmente para `2bcea1ddb429c1988b211923a17eb25df9dbaa48`.
- A consulta `git for-each-ref --contains=10eecbcd4323874a6feb62bde1e964188b2338a8` falha com ausência do commit; não há como esse objeto ausente ser alcançável nas referências locais inspecionadas.
- `security-reports/gitleaks.json` contém array vazio (**0 findings**), com mtime `2026-10-09T11:52:30.553Z` (08:52 em America/Sao_Paulo). A leitura extraiu apenas contagem e metadata; não imprimiu findings brutos.
- `.gitleaks.toml` conserva `[extend]` e `useDefault = true`. Isso evita a falha histórica de configuração sem regras documentada no STATE, mas esta inspeção não comprova nova execução do scanner.
- HEAD observado: `ed00c4b9fcc69c3570cfed106bb58cc6931633aa`.

## Limites e rastreabilidade

Os relatórios de 2026-10-08 com onze ocorrências descrevem o estado anterior à ação registrada no histórico 133. O relatório JSON atual e a referência local corroboram a atualização. O wrapper `scripts/run-gitleaks.mjs` foi inspecionado: redige ambos os scans, captura saída do binário e imprime somente contagem, mas sobrescreve `security-reports/gitleaks.json`; para manter esta frente somente leitura ele não foi executado.

Não houve consulta ao remoto pela rede nesta frente. Portanto a referência remota citada é o snapshot local de remote-tracking, não prova instantânea do servidor GitHub. Não foi demonstrada eliminação em clones de terceiros, caches ou backups; tampouco rotação de credenciais ou ausência de reutilização. Um scan verde de histórico/árvore não comprova essas propriedades. A classificação histórica de demo/template não autoriza afirmar que credenciais poderiam ser reutilizadas com segurança.

Próxima validação legítima, se necessária: `/check` executa o wrapper redigido em revisão identificada e registra resultado novo com timestamp. Qualquer ação em histórico remoto, clones ou credenciais exige autorização própria; não há necessidade demonstrada nesta inspeção de repetir force-push/prune/gc.
