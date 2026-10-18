# Backup e restore

> Política e procedimento para backup dos dados do projeto.

## Objetivo

Garantir que os dados editoriais e de autenticação possam ser restaurados em
caso de falha, exclusão acidental ou incidente de segurança.

## Escopo

- Banco Supabase (schema `public`): `posts`, `profiles`, `auth.users`.
- Migrations e seed: versionados em `supabase/migrations/` e `supabase/seed.sql`.

## Frequência

| Dado                             | Frequência     | Retenção      |
| -------------------------------- | -------------- | ------------- |
| Dump completo do schema `public` | Diário         | 30 dias       |
| Logs de auditoria                | Contínuo       | 90 dias       |
| Migrations/seed                  | Contínuo (git) | Indeterminado |

## Procedimento

1. **Backup local (dev):**
   ```bash
   pnpm supabase:start
   pnpm supabase:reset --local
   ```
2. **Backup de produção:**
   ```bash
   pnpm supabase:start
   supabase db dump --project-ref <ref> > backups/prod-$(date +%Y%m%d).sql
   pnpm supabase:stop --backup
   ```
3. **Restore:**
   ```bash
   pnpm supabase:start
   supabase db reset --project-ref <ref> --sql backups/prod-YYYYMMDD.sql
   ```

## Notas

- Backups de produção são armazenados em bucket S3/R2 com criptografia.
- O restore é testado trimestralmente.
- Em caso de incidente, acionar o runbook de segurança antes de qualquer restore.
