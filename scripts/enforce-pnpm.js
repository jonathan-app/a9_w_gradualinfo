#!/usr/bin/env node

/**
 * scripts/enforce-pnpm.js
 *
 * Roda no `preinstall`. Lê o user-agent do gerenciador que disparou a
 * instalação e aborta se não for pnpm. Motivo: o lockfile é gerado pelo pnpm
 * e o projeto fixa versões de React via `pnpm.overrides` — npm/yarn ignoram
 * esses overrides e instalam versões diferentes do que o projeto testou.
 */

const userAgent = process.env.npm_config_user_agent || '';

if (userAgent && !userAgent.startsWith('pnpm/')) {
  const pm = userAgent.split(' ')[0] || 'outro gerenciador';
  console.error('\n❌ Este projeto usa pnpm exclusivamente.');
  console.error(`   Detectado: ${pm}`);
  console.error('   Use: pnpm install\n');
  process.exit(1);
}
