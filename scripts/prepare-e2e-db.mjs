#!/usr/bin/env node
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.RUNNER_TEMP)
  throw new Error('Preparação exclusiva da stack descartável do runner.');
const root = resolve(process.env.RUNNER_TEMP, 'e2e-db');
if (existsSync(root))
  throw new Error('Destino E2E já existe, não sobrescrever banco anterior.');
mkdirSync(root);
cpSync('supabase', join(root, 'supabase'), { recursive: true });
const config = join(root, 'supabase/config.toml');
const text = readFileSync(config, 'utf8');
if (!text.includes('jwt_expiry = 3600'))
  throw new Error('Prazo da baseline mudou, revisar fixture.');
writeFileSync(config, text.replace('jwt_expiry = 3600', 'jwt_expiry = 60'));
console.log(
  'Configuração descartável com JWT de 60 segundos preparada fora do checkout.',
);
