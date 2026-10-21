# Correções do backend e admin do GradualInfo v2.0.0

Esta entrega contém uma correção incremental, não uma substituição do projeto.
A base é exclusivamente gradualinfo-v2.0.0.zip enviado em 21/10/2026.

## Aplicar

1. Extraia este pacote fora do repositório. Preserve seu trabalho local com o método habitual.
2. Na raiz do repositório GradualInfo, confira a aplicação antes de alterar qualquer arquivo:

```bash
git status --short
git apply --check /caminho/para/alteracoes-admin.patch
```

Se houver conflito, pare e compare os arquivos com BASE-E-ALTERACOES.json.
Não use --reject nem substitua a árvore inteira. O script não tenta mesclar trabalho concorrente.

3. Somente se a conferência passar, aplique a correção:

```bash
git apply /caminho/para/alteracoes-admin.patch
pnpm typecheck
pnpm lint
pnpm format:check
pnpm exec vitest run __tests__/unit/admin-dashboard-page-auth.test.tsx __tests__/unit/admin-rate-limit.test.ts __tests__/unit/lib/services/dashboard-summary.test.ts __tests__/unit/components/admin-dashboard-visual.test.tsx __tests__/unit/app/api/admin/usuarios/papeis.test.ts --maxWorkers=2
```

4. Execute o restante dos gates no seu ambiente habitual. A auditoria desta cópia
   não aprovou a suíte global: faltam dois arquivos do pacote e não havia Supabase
   local disponível para o prerender. Não apagar testes nem criar entrypoint de
   segurança por suposição para contornar a falha.

## Conteúdo

- alteracoes-admin.patch: mudança de 13 arquivos, incluindo teste novo, relatório e STATE.
- arquivos/: versões finais para inspeção, com caminhos relativos do repositório.
- BASE-E-ALTERACOES.json: hashes originais e novos. Base null indica arquivo novo.
- docs/audits/: relatório com achados, provas executadas, limitações e continuidade.

O patch foi conferido com git apply --check e aplicado numa árvore temporária
com os bytes originais do ZIP. Os hashes do resultado conferiram.

Nada executa publicação ou migração. Não inclui credenciais, dependências,
logs brutos, histórico Git ou cópia completa do projeto. As contagens de produção,
o remoto e a homologação R2 não são inferidos a partir desta validação local.
