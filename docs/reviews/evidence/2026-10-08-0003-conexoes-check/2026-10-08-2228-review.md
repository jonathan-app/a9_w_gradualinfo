# Revisão independente

Modelo: gpt-6-astra, agente `/root/independent_review`. Inspeção somente de leitura do diff atual de proxy, Supabase, Wrangler, package/lockfile, Gitleaks e Semgrep, além do teste novo. Não leu arquivos de ambiente nem executou scans. Não substitui prova empírica.

## BLOCKER: filtro do Gitleaks perde caminhos escapados

`scripts/run-gitleaks.mjs:146`: `git ls-files -co --exclude-standard` sem `-z` aplica quoting e escapes a nomes com Unicode, aspas, tabs ou quebras de linha. A divisão por newline gera caminhos diferentes dos usados em `finding.File`. O filtro pode descartar um segredo novo detectado pelo scanner. Usar `-z` e dividir por `\0`; testar preservação de achados nesses nomes. A comparação somente de leitura da árvore atual não encontrou nomes afetados, mas o defeito permanece para novos arquivos.

Sem outros achados concretos pelo revisor nesses caminhos. Leitura do teste do proxy não comprova Secure em produção, RLS ou conexões remotas.

## BLOCKER adicional, comprovado na execução principal

`package.json`: atualização para ESLint 10.12.0 com `eslint-plugin-react` 7.37.5 provoca `TypeError: contextOrFilename.getFilename is not a function` na regra `react/display-name`. Log em `lint.log`, exit 2. Restaurar combinação compatível ou atualizar os plugins com prova de lint completo e lockfile consistente.
