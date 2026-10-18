# Evidência admin-dashboard/AC-01: Acesso Restrito Exclusivo sob Sessão AAL2

## Critério
Qualquer tentativa de carregar o painel ou suas APIs de suporte sob sessão em AAL1, anônima ou com identificador de usuário divergente de `ADMIN_USER_ID` deve ser sumariamente bloqueada no servidor, redirecionando páginas para o desafio TOTP em `/admin-dashboard/mfa/verify` ou devolvendo HTTP 403 em requisições de API.

## Verificação Empírica

1. **Guarda no Server Component da Página**:
   Em `app/admin-dashboard/(protegido)/page.tsx`, o Server Component invoca `checkAdminUser()` antes de qualquer operação ou consulta:
   ```ts
   const { user, aal } = await checkAdminUser();
   if (!user || aal !== 'aal2') {
     redirect('/admin-dashboard/mfa/verify');
   }
   ```
   Caso a sessão não exista, `checkAdminUser()` redireciona para `/admin-dashboard/login`. Se o usuário possuir apenas AAL1 ou ID divergente de `ADMIN_USER_ID`, o acesso ao painel é negado.

2. **Guarda nos Route Handlers de Suporte**:
   - `app/api/admin/dashboard/health/route.ts`:
     Invoca `assertAdminApiAuth(request)`, que executa `checkAdminUser()` e exige estritamente `aal === 'aal2'`. Se o usuário for anônimo ou estiver em AAL1, retorna status HTTP 403 `jsonError('Acesso restrito a administradores com segundo fator (AAL2).', 403)`.
   - `app/api/admin/dashboard/rotinas/refresh-health/route.ts`:
     Aplica simultaneamente validação de origem CSRF (`validateAdminRequestOrigin`) e a guarda `assertAdminApiAuth(request)`.

3. **Cobertura de Testes**:
   - `__tests__/unit/admin-dashboard-routes.test.ts`:
     - Teste: "bloqueia requisição de saúde quando sessão não for AAL2" (valida retorno HTTP 403 quando `aal !== 'aal2'`).
     - Teste: "bloqueia requisição de rotina quando origem CSRF for inválida ou sessão não for AAL2".
   - `e2e/admin-dashboard.spec.ts`:
     - Cenário "Fluxo REAL 3: Rejeição de usuário autenticado sem autorização admin": usuário com credenciais válidas mas UUID diferente de `ADMIN_USER_ID` tem sessão sumariamente revogada e é redirecionado para `/admin-dashboard/login?error=unauthorized`.
     - Cenário de sessão AAL1 tentando navegar para `/admin-dashboard`: redirecionamento imediato para `/admin-dashboard/mfa/verify`.
   - `e2e/admin-operational-dashboard.spec.ts`:
     - Validação com sessão AAL2 completa: login com senha + código TOTP gerado via `speakeasy`, acesso autorizado e renderização com status HTTP 200.

## Veredito
**PASS**
