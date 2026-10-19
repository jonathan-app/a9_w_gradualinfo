# Plano de verificacao do Lote R2: Racionalizacao de icones de interface e remocao de dependencia externa

Estado: Not run (plano derivado pelo /develop para execucao pelo /check).  
Contrato: `docs/specs/2026-10-19-0930-0030-racionalizacao-icones-ui-svg.md` (Accepted).  
Data de derivacao: 2026-10-19.

- icon-clean/AC-01: Inspecionar os cinco componentes SVG criados em `components/shared/icons/` (`SearchIcon`, `HomeIcon`, `ArrowUpRightIcon`, `SunIcon`, `MoonIcon`). Esperado: cada componente utiliza `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, dimensao padrao `1em` e atributo `aria-hidden="true"` decorativo quando nenhum `aria-label` for informado.
- icon-clean/AC-02: Inspecionar `app/busca/page.tsx`. Esperado: utilizacao exclusiva de `SearchIcon` no campo de busca e no destaque visual e `ArrowUpRightIcon` no cartao de artigo, com estilizacao visual identica e sem referencias a `react-icons`.
- icon-clean/AC-03: Inspecionar `components/layout/site-header.tsx` e `components/shared/theme-toggle.tsx`. Esperado: cabeçalho utiliza `HomeIcon` e `SearchIcon` (desktop e mobile), alternador de tema utiliza `SunIcon` e `MoonIcon` sem mudanca de layout shift na hidratacao, preservando os temas claro e escuro.
- icon-clean/AC-04: Inspecionar `package.json`, `pnpm-lock.yaml` e realizar busca textual em todo o projeto. Esperado: pacote `react-icons` completamente ausente de `dependencies` e zero imports remanescentes em arquivos `.ts` ou `.tsx`.
- icon-clean/AC-05: Executar o portao de qualidade consolidado via `pnpm check:all`. Esperado: aprovacao plena de `tsc --noEmit` (typecheck), `eslint .` (lint), `prettier --check .` (formatacao), `vitest run` (84 suites e 865 testes unitarios verdes) e `security:all` (zero segredos no Gitleaks e zero erros no Semgrep).

O plano nao e evidencia de execucao ou aceite de entrega. A verificacao empirica e auditoria cabem ao /check.
