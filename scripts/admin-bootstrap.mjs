/**
 * @fileoverview scripts/admin-bootstrap.mjs — bootstrap operacional da conta raiz administrativa
 * @module scripts/admin-bootstrap
 * @description Insere de forma idempotente a linha do administrador raiz (ADMIN_USER_ID) na
 *   tabela public.admin_user_roles com papel 'admin', sem expor o UUID no console.
 *   Permite que as policies RLS de leitura de auditoria reconhecam a raiz no cliente autenticado.
 * @dependencies @supabase/supabase-js, node:process
 */

import { createClient } from '@supabase/supabase-js';
import { argv, env, exit, stdout } from 'node:process';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';
const DEFAULT_LOCAL_SERVICE_KEY =
  'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJpc3MiOiAic3VwYWJhc2UtZGVtbyIsICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJleHAiOiAxOTgzODEyOTk2fQ.F2O_jIzBsdw6c5s2Oox4ZRi-PYH0C6xu3Me3YAIoKYo';

/**
 * Executa o bootstrap idempotente da conta raiz.
 * @param args - Argumentos de linha de comando.
 * @returns Objeto com status do processamento.
 */
export async function runAdminBootstrap(args = argv.slice(2)) {
  const isDryRun = args.includes('--dry-run');

  const supabaseUrl = env.SUPABASE_URL || DEFAULT_LOCAL_URL;
  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')
      ? DEFAULT_LOCAL_SERVICE_KEY
      : '');

  if (!serviceKey) {
    stdout.write('ERRO: SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.\n');
    return { ok: false, error: 'missing_service_key' };
  }

  const rootAdminId = (env.ADMIN_USER_ID || '').trim();
  if (!rootAdminId || !UUID_RE.test(rootAdminId)) {
    stdout.write('ERRO: ADMIN_USER_ID invalido ou ausente no ambiente.\n');
    return { ok: false, error: 'invalid_admin_user_id' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // 1. Confirma se o usuario existe em auth.users
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(rootAdminId);

  if (userError || !userData?.user) {
    stdout.write(
      'AVISO: O usuario raiz configurado em ADMIN_USER_ID ainda nao existe em auth.users.\n' +
        'O bootstrap deve ser executado apos o provisionamento inicial da conta.\n',
    );
    return { ok: false, error: 'user_not_found_in_auth' };
  }

  if (isDryRun) {
    stdout.write(
      'DRY-RUN: Usuario raiz validado. Nenhuma alteracao aplicada.\n',
    );
    return { ok: true, dryRun: true };
  }

  // 2. Insere ou atualiza papel para 'admin' de forma idempotente
  const { error: upsertError } = await supabase.from('admin_user_roles').upsert(
    {
      user_id: rootAdminId,
      role: 'admin',
      assigned_by: rootAdminId,
    },
    { onConflict: 'user_id' },
  );

  if (upsertError) {
    stdout.write(
      `ERRO: Falha ao persistir papel da raiz: ${upsertError.message}\n`,
    );
    return { ok: false, error: upsertError.message };
  }

  stdout.write(
    'SUCESSO: Papel de administrador da conta raiz provisionado com sucesso.\n',
  );
  return { ok: true };
}

if (process.argv[1]?.endsWith('admin-bootstrap.mjs')) {
  runAdminBootstrap().then((res) => {
    if (!res.ok) exit(1);
  });
}
