# Evidência admin-dashboard/AC-08: Acessibilidade e Higiene Defensiva de Dados

## Critério
Todos os elementos interativos, tabelas e diálogos devem suportar navegação completa via teclado, atributos de acessibilidade ARIA e contraste visual conforme `DESIGN.md`. A página deve manter cabeçalhos de não indexação e proibição de cache (`Cache-Control: private, no-store` e `X-Robots-Tag: noindex, nofollow`), sem imprimir credenciais, segredos de serviço ou tokens em tela ou logs.

## Verificação Empírica

1. **Acessibilidade e Navegação por Teclado**:
   - Diálogo modal de prévia implementa `role="dialog"`, `aria-modal="true"`, captura de foco e fechamento nativo via tecla `Escape`.
   - Tabelas de artigos e ofertas utilizam elementos semânticos HTML5 (`table`, `thead`, `tbody`, `tr`, `th scope="col"`, `td`), permitindo leitura adequada por leitores de tela.
   - Contraste e temas: todos os elementos utilizam tokens de cores compatíveis com modo claro e escuro (`dark:`), cumprindo as diretrizes de `DESIGN.md` (paleta slate/emerald/amber/rose).
   - Suporte a telas móveis (375x667) com overflow horizontal contido e tipografia responsiva.

2. **Higiene Defensiva de Dados e Cabeçalhos**:
   - Cabeçalhos de segurança na resposta da página e rotas de suporte:
     - `Cache-Control: private, no-store`
     - `X-Robots-Tag: noindex, nofollow`
   - Omitida qualquer exibição de segredos, tokens JWT, chaves de serviço ou credenciais de banco no HTML renderizado, DTOs ou logs de console.
   - Todas as mensagens de erro em tela e retornos de APIs utilizam textos amigáveis e sanitizados sem stack traces ou nomes de colunas do banco.

3. **Cobertura de Testes**:
   - `e2e/admin-operational-dashboard.spec.ts`:
     - Teste de viewport mobile (`375x667`) e desktop (`1280x720`).
     - Teste de interação de teclado no modal de prévia (Escape).
     - Teste de regressão visual e funcional na Home (`/`) e página do artigo (`/artigos/[slug]`).
   - `scripts/check-env-leak.mjs`:
     - Executado sem detecção de vazamentos de variáveis sensíveis em artefatos ou cliente.

## Veredito
**PASS**
