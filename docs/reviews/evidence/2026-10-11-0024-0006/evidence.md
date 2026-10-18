# Evidências de Runtime para a Spec 0006 (Transição Editorial Sanity)
Data: 2026-10-11 00:24

- sanity/AC-01: Prova de que a home falha fechada via sonda Sanity (HTTP 503) e não cai para Supabase.
- sanity/AC-02: UNVERIFIABLE - Nenhum artigo publicado no dataset 'production' para validar links canonical e OpenGraph.
- sanity/AC-03: Prova de que SANITY_API_READ_TOKEN não vaza no bundle cliente.
- sanity/AC-04: Prova de que /api/preview responde 405 em GET, 403 em origem cruzada, e 400 em slug inválido.
- sanity/AC-05: UNVERIFIABLE - Ausência de sessão do PreviewSessionDO ativa com persistência para teste de cópia de cookie.
- sanity/AC-06: Prova de que respostas de falha mantêm Cache-Control: private, no-store.
- sanity/AC-07: Prova de uso do domínio oficial https://gradualinfo.com.br e ausência de gradualinfo.pages.dev.
- sanity/AC-08: UNVERIFIABLE - Desoneração depende de validação 100% PASS prévia.
