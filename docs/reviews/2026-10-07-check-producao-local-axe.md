# Produção local e axe — retomada em 2026-10-07

Verificação incompleta. HEAD observado: `cfcfd6fa5bed981393ee6e8cc18afb30243403e7`. Há alterações locais anteriores; este SHA não identifica sozinho a árvore testável. Nenhum código de aplicação foi alterado nesta retomada. Manifesto SHA-256 dos arquivos relevantes no JSON `-manifesto` de mesmo nome.

Build encontrado: `hnUNphsupBDIL_NZ4GLTE`; correspondência com a árvore atual UNVERIFIABLE. As chamadas de recompilação e servidor da rodada anterior seguem sem saída confirmada. Não foram repetidas. Consultas reais dentro do sandbox às portas 3212/3211 (`/api/health`) e 54321 (`/auth/v1/health`) retornaram `000`, sem resposta HTTP. Isso não demonstra status da aplicação nem que o serviço esteja parado fora do sandbox. Diagnóstico somente de leitura dessas portas foi solicitado via `require_escalated`, sem retorno confirmado.

| Cenário                                              | Status       |
| ---------------------------------------------------- | ------------ |
| HTTP artigo público                                  | UNVERIFIABLE |
| HTTP artigo inexistente                              | UNVERIFIABLE |
| HTTP rascunho sem preview                            | UNVERIFIABLE |
| HTTP rascunho com preview                            | UNVERIFIABLE |
| Secure em Set-Cookie de produção                     | UNVERIFIABLE |
| no-store no artigo protegido                         | UNVERIFIABLE |
| Sessão expirada (sem apagar cookies como substituto) | UNVERIFIABLE |
| Usuário autenticado sem claim                        | UNVERIFIABLE |
| Identidade diferente da dedicada                     | UNVERIFIABLE |
| Logout com falha simulada e acesso subsequente       | UNVERIFIABLE |
| Axe home                                             | UNVERIFIABLE |
| Axe artigo                                           | UNVERIFIABLE |

## Lacunas observadas na inspeção

O arquivo `e2e/verify-md0002-tarefa8.spec.ts` aceita `[200, 404]` para rascunho sem sessão e após logout. Isso não comprova o contrato de status 404. O cenário chamado expiração ainda apaga cookies; logout não injeta falha no serviço de autenticação. `isPreviewSession` consulta claim sem conferir identidade dedicada. Essas observações estáticas não substituem execução nem mudam resultados para PASS/FAIL.

Próximo passo: aguardar resultado das chamadas de permissão existentes; confirmar acesso ao servidor e ao Supabase, compilação correspondente à árvore e executar os 12 cenários com prova real. Merge/deploy continuam sem autorização.

Veredito de `check-decision.mjs`: **REPROVADO**, exit 1, 12 UNVERIFIABLE. Reasons:

- AC reprovado ou não verificável: HTTP artigo público (UNVERIFIABLE)
- Falta evidência para o AC: HTTP artigo público
- AC reprovado ou não verificável: HTTP artigo inexistente (UNVERIFIABLE)
- Falta evidência para o AC: HTTP artigo inexistente
- AC reprovado ou não verificável: HTTP rascunho sem preview (UNVERIFIABLE)
- Falta evidência para o AC: HTTP rascunho sem preview
- AC reprovado ou não verificável: HTTP rascunho com preview (UNVERIFIABLE)
- Falta evidência para o AC: HTTP rascunho com preview
- AC reprovado ou não verificável: Secure em Set-Cookie de produção (UNVERIFIABLE)
- Falta evidência para o AC: Secure em Set-Cookie de produção
- AC reprovado ou não verificável: no-store no artigo protegido (UNVERIFIABLE)
- Falta evidência para o AC: no-store no artigo protegido
- AC reprovado ou não verificável: Sessão expirada (sem apagar cookies como substituto) (UNVERIFIABLE)
- Falta evidência para o AC: Sessão expirada (sem apagar cookies como substituto)
- AC reprovado ou não verificável: Usuário autenticado sem claim (UNVERIFIABLE)
- Falta evidência para o AC: Usuário autenticado sem claim
- AC reprovado ou não verificável: Identidade diferente da dedicada (UNVERIFIABLE)
- Falta evidência para o AC: Identidade diferente da dedicada
- AC reprovado ou não verificável: Logout com falha simulada e acesso subsequente (UNVERIFIABLE)
- Falta evidência para o AC: Logout com falha simulada e acesso subsequente
- AC reprovado ou não verificável: Axe home (UNVERIFIABLE)
- Falta evidência para o AC: Axe home
- AC reprovado ou não verificável: Axe artigo (UNVERIFIABLE)
- Falta evidência para o AC: Axe artigo
