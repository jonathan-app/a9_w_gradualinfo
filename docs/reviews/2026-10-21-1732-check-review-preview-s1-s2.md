# Revisão de segurança do preview, S1 e S2

**Modo:** `/check review`

**Commit avaliado:** `c92e1bb24ab209c530e34f77742722846d23fad1`

**Spec:** `docs/specs/2026-10-08-2228-0006-transicao-editorial-sanity.md`

## Resultado

S1: PASS. O acesso ao preview depende de segredo, origem, identidade validada, claims assinados e sessão ativa no Durable Object. `app_metadata.preview` deixou de ser uma autoridade paralela.

S2: PASS. Grants do contrato atual recusados pelo Durable Object retornam `false` antes do fallback legado. A cópia do cookie revogado permanece recusada com 404.

## Evidência

Quatro suítes focadas passaram, com 44 testes. O TypeScript passou com código de saída 0. A inspeção do diff não encontrou ampliação de acesso, fallback aberto nem exposição de segredo.

Evidência detalhada: `docs/reviews/evidence/2026-10-21-1732-preview-s1-s2/review-evidence.md`.

## Achados

Nenhum BLOCKER, WARNING ou NIT.

## Veredito da autoridade

REPROVADO. A revisão técnica encontrou dois critérios PASS, zero FAIL, zero UNVERIFIABLE e zero BLOCKER, mas `scripts/check-decision.mjs` recusou o recorte porque os IDs locais `preview-s1` e `preview-s2` não são o conjunto completo de ACs da Spec 0006. Motivos emitidos pela autoridade:

1. `Spec/hash diferente do contrato esperado.`
2. `Conjunto de ACs incompleto, duplicado ou diferente da spec.`

S1 e S2 estão corrigidos no código e cobertos pelos testes focados. Este relatório não substitui a revalidação integral dos oito ACs da Spec 0006 nem a CI remota do SHA publicado.
