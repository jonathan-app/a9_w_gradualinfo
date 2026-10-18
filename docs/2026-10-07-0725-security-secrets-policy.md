# Secrets policy

> Política de segredos do projeto. Aplicável a código, CI, MCPs e qualquer
> integração.

## Regras

1. **Nenhum segredo no repositório.** `.env*` está no `.gitignore`. O único
   arquivo versionado é `.env.example` (sem valores reais).
2. **CI não recebe segredos por padrão.** O `build:next` roda sem segredos;
   apenas jobs específicos usam secrets do repositório GitHub.
3. **Rotação.** Segredos são rotacionados:
   - ao sair um colaborador;
   - ao detectar vazamento (gitleaks/OSV);
   - a cada 90 dias para segredos de longa duração.
4. **Storage.** Segredos de produção vivem em cofre (ex.: Doppler, Vault,
   GitHub Secrets). Nunca em arquivos locais ou mensagens.
5. **Preview token.** `SUPABASE_PREVIEW_TOKEN` é um segredo de baixa
   sensibilidade, mas segue as regras acima: valor fixo em produção, não
   versionado.
6. **MCPs.** Nenhum MCP recebe segredo por configuração hardcoded. Variáveis
   de ambiente são injetadas pelo runtime.

## Verificação

- `pnpm security:secrets` (gitleaks) roda na CI.
- `semgrep` com regra de segredos roda na CI.
- Revisão manual de PRs que alteram `.env.example`, `lib/env.ts` ou
  configs de infraestrutura.
