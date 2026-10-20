# Desenvolvimento das provas do layout editorial

**Data:** 2026-10-20 14:45 (America/Sao_Paulo)  
**Spec:** `docs/specs/2026-10-09-2038-0010-layout-editorial-home-artigo.md`, Revisão 3  
**Estado:** implementação concluída, verificação empírica pendente

## Alterações

1. A prova da home passou a medir a composição Cambridge vigente, com quatro destaques, quatro últimas leituras e até dezesseis recentes.
2. Cada variante é comparada com os campos próprios lidos do banco.
3. A URL renderizada da capa é resolvida como URL absoluta antes da comparação.
4. As dezoito fixtures usam resumo, capa e editoria distintos.
5. A inspeção de segurança cobre todos os componentes em `components/editorial/` e a rota do artigo. A exceção exige o componente JSON-LD com `serializeJsonLd`.
6. A prova de fontes confirma autoria antes da capa, Markdown antes das fontes e nenhuma segunda assinatura.
7. O avaliador exige os novos títulos específicos. A ausência de qualquer caso continua produzindo `UNVERIFIABLE`.

Nenhum arquivo de aplicação foi alterado.

## Resultados

- Regressões do avaliador: 12 de 12 aprovadas.
- Playwright: 12 casos descobertos em 2 arquivos, não executados.
- TypeScript: aprovado.
- ESLint dos arquivos alterados: aprovado.
- Prettier dos arquivos alterados: aprovado.
- `git diff --check`: aprovado.
- Teste de integração das fixtures: não verificável neste ambiente. O servidor HTTP local recebeu `EPERM` no sandbox. A tentativa autorizada fora do sandbox não produziu resultado e foi encerrada.
- Playwright real: não executado, pois a stack Supabase descartável e as credenciais efêmeras da CI não estão disponíveis.

## Próximo gate

Executar `/check verify` na mesma revisão com a stack descartável completa. A ausência do artefato Playwright mantém o gate reprovado ou não verificável.
