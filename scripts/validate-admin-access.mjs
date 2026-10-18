/**
 * @fileoverview Valida os quatro bindings administrativos sem exibir seus valores.
 * @module scripts/validate-admin-access
 * @description Usa o mesmo leitor do Worker e não altera configuração remota.
 * @dependencies lib/env.ts, process.env.
 */

import { readAdminAccessConfig } from '../lib/env.ts';

const names = [
  'ADMIN_ACCESS_ISSUER',
  'ADMIN_ACCESS_AUD',
  'ADMIN_ACCESS_OWNER_EMAIL',
  'ADMIN_ACCESS_HOSTS',
];

const bindings = Object.fromEntries(
  names.map((name) => [name, process.env[name]]),
);
const missing = names.filter((name) => !bindings[name]);

if (missing.length) {
  console.error(`Bindings ausentes: ${missing.join(', ')}`);
  process.exitCode = 1;
} else if (!readAdminAccessConfig(bindings)) {
  console.error(
    'Configuração ADMIN_ACCESS inválida segundo readAdminAccessConfig.',
  );
  process.exitCode = 1;
} else {
  console.log('Configuração ADMIN_ACCESS válida. Nenhum binding foi alterado.');
}
