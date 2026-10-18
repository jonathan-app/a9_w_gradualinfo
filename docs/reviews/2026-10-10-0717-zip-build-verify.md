# Verificação do ZIP atualizado, build e dry-run

Fonte: `20261010-07:16 - a9_w_gradualinfo.zip`, SHA-256 `b23acf79710ca6f667b25458b6e3adc7415b6982fc8c715d461cf925283520a0`.
Prefixo da rodada corresponde à recepção do ZIP em 10/10/2026 às 07:17, America/Sao_Paulo.

## Proveniência

Extração nova, separada das cópias anteriores, sem reutilizar node_modules, .next ou .open-next. O arquivo recebido não continha .git, node_modules, .env ou caches de build nessas pastas. Não existe checkout Git nesta cópia; não se atribui o resultado ao commit mencionado nos relatórios antigos. ZIP e manifestos são a identidade verificável desta rodada.

O confronto com o manifesto antigo de 05:02 encontrou sete alterações: app/page.tsx, lib/preview/auth.ts, lib/sanity/client.ts, lib/supabase/middleware.ts, package.json, tsconfig.json e wrangler.jsonc. O caminho cloudflare-worker.ts não existe mais na raiz, e o entrypoint vigente é scripts/cloudflare-worker.ts. Os resultados anteriores não foram reutilizados como aprovação desta fonte.

Novo manifesto registra 212 arquivos de aplicação, testes, scripts, assets e configurações. Todos os hashes desses arquivos coincidem com o ZIP recebido após os comandos, inclusive package.json e pnpm-lock.yaml. Nenhuma lógica foi alterada nesta rodada.

## Execuções nesta cópia

| Comando                                         | Estado       | Evidência                                                             |
| ----------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| pnpm install --frozen-lockfile --ignore-scripts | PASS, exit 0 | pnpm 12.5.1 isolado, lockfile preservado                              |
| pnpm build                                      | PASS, exit 0 | Next 16.4.0 compilado, TypeScript concluído, OpenNext 1.20.9 completo |
| pnpm exec wrangler deploy --dry-run             | PASS, exit 0 | Wrangler 4.148.0, mensagem de encerramento dry-run, sem upload        |
| pnpm check:all                                  | PASS, exit 0 | Typecheck, lint e formatação; Vitest 339/339 em 35 arquivos           |

Node da execução: 24.19.0, atende engines >=22. O pnpm padrão 11.25.0 inicialmente recusou a instalação por engines; foi usada a versão exigida 12.5.1 em diretório temporário, sem mudar o projeto. Downloads tiveram erros transitórios de proxy, mas a instalação terminou com exit 0. Scripts de instalação foram desabilitados; isso não impediu os builds executados.

Dry-run: 24 assets, 18864.77 KiB, gzip 4250.93 KiB. PREVIEW_SESSION_DO, ADMIN_RATE_LIMIT_DO e ASSETS reconhecidos no empacotamento. Manifesto OpenNext: 1666 arquivos. Não houve publicação, alteração de bindings remotos ou verificação de identidade do Worker remoto.

Avisos: suporte Node middleware experimental no OpenNext; recomendação de compatibility_date mais recente; Bundle Analyzer sem relatório em Turbopack; aviso Vite sobre futuro carregador nativo. Nenhum desses avisos interrompeu os comandos. Não se alteraram configurações para escondê-los.

## Limites e contrato vigente

Os 13 critérios Access permanecem UNVERIFIABLE: não foram testados contra Access real, JWKS remoto, MFA remoto nem Durable Objects distribuídos. Dry-run não comprova execução ou aplicação das políticas na Cloudflare. Não houve consulta a secrets, exposição de tokens ou uso de credenciais reais nesta rodada. Scanner de histórico e vínculo entre o commit remoto e o ZIP não foram executados.

A spec 0009 vigente protege a admissão antes das quotas. O patch de particionamento por IP preparado em rodada anterior não foi aplicado, porque conflita com a decisão agora documentada no ZIP. Não aplicar esse patch sem nova decisão de /architect e aceite do proprietário. Nenhuma mudança no contrato ou na chave da quota foi feita aqui.

## Artefatos e próximo passo

Evidências sanitizadas em docs/reviews/evidence/2026-10-10-0717-zip-build/: manifesto das fontes, manifesto OpenNext e resultados com códigos de saída. São registros desta execução, não cópias de relatórios anteriores. Não há logs brutos de autenticação.

Próximo: /check verify em runtime isolado autorizado, cobrindo Access, DO e MFA, mantendo os critérios sem prova como UNVERIFIABLE. Configuração remota, recuperação da conta, merge e deploy continuam sem autorização.
