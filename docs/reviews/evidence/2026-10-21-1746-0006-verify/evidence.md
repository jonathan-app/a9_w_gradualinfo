# Evidência da verificação integral da Spec 0006

Data: 2026-10-21 17:46, America/Sao_Paulo.

Branch: `feat/admin-fases-2-3-4-consolidado`.

SHA local e remoto da branch: `0b0ef3161a746d0d91ffe32ea4f7ad1bb0223a78`.

O SHA da branch não foi identificado como versão publicada. A consulta `gh run list` ficou sem resposta por mais de um minuto e foi interrompida. Nenhum identificador de implantação Cloudflare vinculou esse SHA ao Worker ativo. A CI remota do SHA permanece não verificada.

## Execuções locais

`node_modules/.bin/tsc --noEmit --pretty false`: PASS.

`node_modules/.bin/eslint .`: PASS.

`node_modules/.bin/prettier --check .`: PASS.

Matriz focada da Spec 0006, incluindo preview, revogação, proxy, cliente Sanity e falha da home: 8 arquivos e 76 testes PASS.

A suíte Vitest integral não concluiu. Antes de ser interrompida, registrou 18 falhas em `gates.test.ts`, esperadas porque o gate detectou a árvore de trabalho suja, e uma falha no teste multiprocesso WORM da Spec 0021. Esse resultado não é aprovação da suíte integral.

O build Turbopack falhou no sandbox porque o processo não recebeu permissão para abrir uma porta interna. A repetição autorizada fora do sandbox ficou sem saída por mais de quatro minutos e foi interrompida. O build permanece não verificável nesta rodada.

## Matriz dos critérios

| Critério | Estado | Evidência e limite |
| --- | --- | --- |
| `sanity/AC-01` | UNVERIFIABLE | Testes locais de seleção da fonte passaram, mas o runtime publicado no SHA avaliado não foi identificado. |
| `sanity/AC-02` | UNVERIFIABLE | Não houve observação do artigo publicado, canonical e Open Graph no Worker do SHA avaliado. |
| `sanity/AC-03` | UNVERIFIABLE | Testes do cliente passaram, mas o build não concluiu e o bundle publicado não foi associado ao SHA. |
| `sanity/AC-04` | UNVERIFIABLE | Os handlers passaram nos testes locais, porém não foram exercitados no Worker publicado do SHA avaliado. |
| `sanity/AC-05` | UNVERIFIABLE | A matriz local comprovou autorização por DO e rejeição da cópia do cookie após logout. Não houve prova contra o Durable Object remoto da versão publicada. |
| `sanity/AC-06` | UNVERIFIABLE | Estados 404 e 503 passaram localmente, mas não foram observados no Worker publicado do SHA avaliado. |
| `sanity/AC-07` | UNVERIFIABLE | A configuração local usa o domínio oficial, mas a resposta do Worker publicado não foi observada. |
| `sanity/AC-08` | UNVERIFIABLE | A retirada completa do Supabase editorial depende da validação integral anterior e do runtime publicado. |

## Cenários de segurança exigidos

Autorização de rascunho: PASS apenas na matriz local.

Reutilização da cópia do cookie após logout: PASS apenas na matriz local, em `preview-security.test.ts` e `preview-cookie-reuse.test.ts`.

Esses resultados locais não substituem a prova conectada ao `PreviewSessionDO` publicado.

## Verificações externas mantidas fora do escopo

T10, SMTP do Supabase: não verificada.

T11, `SANITY_API_READ_TOKEN` como Worker Secret: não verificada.
