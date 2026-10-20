# Verificação do layout editorial, Revisão 3

**Data:** 2026-10-20 16:21 (America/Sao_Paulo)  
**Modo:** `/check verify`  
**Contrato:** `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`, Revisão 3  
**Plano:** `check/layout-editorial/2026-10-20-1445/VERIFY-PLAN.md`  
**Decisão:** REPROVADO

## Revisão verificada

- Branch local: `feat/admin-fases-2-3-4-consolidado`.
- `HEAD`: `eceff6eb131f9b720d3bccaa44559dadbe442459`.
- Árvore do `HEAD`: `0a2eb70592fb31274f1058d1827ac7a9c2fba084`.
- Relação com `origin/main`: zero commits à frente e seis atrás.
- A revisão contém alterações não commitadas. Por isso, `scripts/ci-revision.mjs` recusaria corretamente vincular a execução à árvore limpa do `HEAD`.
- Fingerprint SHA-256 do diff dos contratos, testes e avaliador verificados: `d3959612bc3c70ae6c2414da4863dcc734226ee92d8c6c61eff1c27042f6da4b`.

O fingerprint identifica o conjunto local inspecionado, mas não substitui o manifesto de revisão exigido pela CI. Nenhum artefato remoto pode ser considerado evidência desta árvore suja.

## Resultado por critério

| Critério                 | Resultado    | Evidência                                                                                                                                                              |
| ------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout-editorial/AC-01` | UNVERIFIABLE | O caso Playwright de composição e limites foi descoberto, mas o servidor não abriu a porta 3100.                                                                       |
| `layout-editorial/AC-02` | UNVERIFIABLE | O caso compara cada variante com valores distintos do banco e normaliza a capa, mas não foi executado. A integração das fixtures também não abriu a porta de loopback. |
| `md-0002/AC-06`          | UNVERIFIABLE | As provas de payload malicioso e inspeção do caminho Markdown foram descobertas, mas não executadas pelo Playwright.                                                   |
| `md-0002/AC-10`          | UNVERIFIABLE | As provas de canonical, exclusão de conteúdo não público e igualdade entre `lastmod` e `published_at` foram descobertas, mas não executadas.                           |
| `md-0002/AC-13`          | UNVERIFIABLE | As provas de dados, URL absoluta, isolamento do Markdown, ordem do artigo e ausência da seção foram descobertas, mas não executadas.                                   |

## Execuções

- Regressões do avaliador: 12 de 12 aprovadas.
- Integração das fixtures: 4 casos não executados. O `beforeAll` recebeu `listen EPERM` em `127.0.0.1` e expirou após 10 segundos.
- Playwright: 12 casos descobertos em 2 arquivos, nenhum executado.
- Servidor Next isolado: falhou antes dos testes com `listen EPERM` em `0.0.0.0:3100`.
- Stack Supabase descartável: não iniciada. O comando `docker` usa Podman e falhou ao preparar `/run/user/1000/libpod`, que está somente para leitura no sandbox. A solicitação de execução externa não foi liberada nesta rodada.

## Conclusão

Não há falha funcional comprovada na aplicação nesta rodada. Também não há evidência funcional suficiente para aprovar os cinco critérios. A aprovação estática das regressões do avaliador e a descoberta dos casos Playwright não substituem a execução real.

O gate permanece **REPROVADO** até uma árvore limpa e identificável executar a stack descartável, a integração das fixtures e o Playwright, gerando os artefatos da mesma revisão.
