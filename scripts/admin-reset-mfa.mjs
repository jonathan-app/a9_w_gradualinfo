/**
 * @fileoverview scripts/admin-reset-mfa.mjs — contingência operacional para perda de TOTP
 * @module scripts/admin-reset-mfa
 * @description Procedimento operacional privilegiado fora do painel administrativo para
 *   desvincular fator TOTP avariado ou perdido do administrador único. Emprega a API oficial
 *   suportada `supabase.auth.admin.mfa.deleteFactor` com confirmação de UUID, encerramento
 *   de sessões pelo GoTrue e registro da janela residual dos JWTs de acesso emitidos.
 * @dependencies @supabase/supabase-js, node:process
 *
 * Por que este script existe:
 * - A contingência de perda de TOTP não possui endpoint público nem botão web para
 *   evitar criação de vetores de contorno de MFA.
 * - Substitui intervenções manuais via SQL ad-hoc por chamadas oficiais da API
 *   administrativa que mantêm os invariantes de sessão do GoTrue.
 * - Garante que a exclusão do fator verificado revogue as sessões ativas e force
 *   nova matrícula (/admin-dashboard/mfa/setup) no próximo acesso por senha.
 */

import { createClient } from '@supabase/supabase-js';
import { argv, env, exit, stdout } from 'node:process';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';
const DEFAULT_LOCAL_SERVICE_KEY =
  'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJpc3MiOiAic3VwYWJhc2UtZGVtbyIsICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJleHAiOiAxOTgzODEyOTk2fQ.F2O_jIzBsdw6c5s2Oox4ZRi-PYH0C6xu3Me3YAIoKYo';

/**
 * Executa a remoção privilegiada do fator TOTP com conferência e auditoria.
 * @param args - Argumentos de linha de comando.
 */
export async function runResetMfa(args = argv.slice(2)) {
  const isDryRun = args.includes('--dry-run');

  const supabaseUrl = env.SUPABASE_URL || DEFAULT_LOCAL_URL;
  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')
      ? DEFAULT_LOCAL_SERVICE_KEY
      : '');

  if (!serviceKey) {
    stdout.write(
      'ERRO: SUPABASE_SERVICE_ROLE_KEY ausente para executar a API administrativa.\n',
    );
    return { ok: false, error: 'missing_service_key' };
  }

  const positionalArg = args.find((a) => !a.startsWith('--'));
  const targetUserId = (positionalArg ?? env.ADMIN_USER_ID ?? '').trim();

  if (!targetUserId || !UUID_RE.test(targetUserId)) {
    stdout.write(
      'ERRO: ADMIN_USER_ID inválido ou ausente. Um UUID fixo válido é obrigatório.\n',
    );
    return { ok: false, error: 'invalid_user_id' };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  stdout.write(
    `[ADMIN-MFA-RESET] Consultando fatores cadastrados para o usuário: ${targetUserId}\n`,
  );

  const { data: factorData, error: listError } =
    await supabase.auth.admin.mfa.listFactors({
      userId: targetUserId,
    });

  if (listError) {
    stdout.write(
      `[ADMIN-MFA-RESET] Falha ao consultar fatores no Auth: ${listError.message}\n`,
    );
    return { ok: false, error: listError.message };
  }

  const allFactors = factorData?.factors ?? factorData?.all ?? [];
  const totpFactors = allFactors.filter((f) => f.factor_type === 'totp');

  if (totpFactors.length === 0) {
    stdout.write(
      `[ADMIN-MFA-RESET] Nenhum fator TOTP encontrado para o usuário ${targetUserId}. Nenhuma ação necessária.\n`,
    );
    return { ok: true, deletedCount: 0 };
  }

  stdout.write(
    `[ADMIN-MFA-RESET] Encontrado(s) ${totpFactors.length} fator(es) TOTP.\n`,
  );

  if (isDryRun) {
    stdout.write(
      `[ADMIN-MFA-RESET] Modo --dry-run: nenhum fator foi excluído.\n`,
    );
    return { ok: true, dryRun: true, factors: totpFactors.map((f) => f.id) };
  }

  const deletedIds = [];
  for (const factor of totpFactors) {
    stdout.write(
      `[ADMIN-MFA-RESET] Excluindo fator ID: ${factor.id} (status: ${factor.status})...\n`,
    );
    const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: targetUserId,
    });

    if (deleteError) {
      stdout.write(
        `[ADMIN-MFA-RESET] Erro ao excluir fator ${factor.id}: ${deleteError.message}\n`,
      );
      return { ok: false, error: deleteError.message };
    }
    deletedIds.push(factor.id);
  }

  const nowIso = new Date().toISOString();
  stdout.write('\n==================================================\n');
  stdout.write('AUDITORIA DE CONTINGÊNCIA MFA CONCLUÍDA\n');
  stdout.write('==================================================\n');
  stdout.write(`Timestamp: ${nowIso}\n`);
  stdout.write(`Usuário Alvo: ${targetUserId}\n`);
  stdout.write(`Fatores Removidos: ${deletedIds.join(', ')}\n`);
  stdout.write(
    'Sessões Revogadas: Sessões ativas foram encerradas automaticamente pelo GoTrue.\n',
  );
  stdout.write(
    'Janela Residual: Tokens JWT de acesso previamente emitidos expiram em até jwt_expiry.\n',
  );
  stdout.write(
    'Próximo Acesso: Próximo login por senha exigirá nova matrícula em /admin-dashboard/mfa/setup.\n',
  );
  stdout.write('==================================================\n');

  return { ok: true, deletedCount: deletedIds.length, deletedIds };
}

// Executa diretamente se invocado via linha de comando
if (process.argv[1] && process.argv[1].endsWith('admin-reset-mfa.mjs')) {
  runResetMfa().then((res) => {
    if (!res.ok) exit(1);
  });
}
