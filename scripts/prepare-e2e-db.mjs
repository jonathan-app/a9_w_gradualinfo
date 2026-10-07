#!/usr/bin/env node
/**
 * @fileoverview Prepara a cópia descartável do Supabase para E2E com JWT de 60 segundos.
 * @module scripts/prepare-e2e-db
 * @description Copia o diretório `supabase/` do checkout para `$RUNNER_TEMP/e2e-db` e encurta
 *   `jwt_expiry` de 3600 para 60 s no `config.toml` dessa cópia. JWT curto é o que permite ao
 *   Playwright provar expiração real da sessão Auth sem esperar uma hora; fora do checkout é
 *   para a árvore continuar limpa (checkout sujo reprovaria o manifesto de
 *   `ci-revision.mjs`) e para a stack local de quem desenvolve não ser alterada.
 * @dependencies node:fs (cópia e leitura/escrita do `config.toml` da cópia), node:path,
 *   node:process (`GITHUB_ACTIONS`, `RUNNER_TEMP`).
 *
 * Quando executado: CI, job `e2e`, etapa "Iniciar banco descartável e aplicar seed".
 * Lê: `GITHUB_ACTIONS`, `RUNNER_TEMP` e o diretório `supabase/` do checkout (somente leitura).
 * Escreve: apenas dentro de `$RUNNER_TEMP/e2e-db` (cópia com `config.toml` regravado).
 * Códigos de saída: 0 = cópia pronta; 1 = qualquer guard disparado (fora da CI, destino já
 *   existente ou baseline `jwt_expiry = 3600` ausente) — exceção não tratada.
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
// Trava de ambiente: fora do runner da GitHub Actions não existe `RUNNER_TEMP`, e rodar aqui
// criaria um diretório `e2e-db` solto na máquina de quem executou o script à mão.
if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.RUNNER_TEMP)
  throw new Error('Preparação exclusiva da stack descartável do runner.');
const root = resolve(process.env.RUNNER_TEMP, 'e2e-db');
// Destino existente significa resto de execução anterior (ou cache do runner): sobrescrever
// misturaria dados de rodadas diferentes, então o script recusa e deixa a limpeza explícita.
if (existsSync(root))
  throw new Error('Destino E2E já existe, não sobrescrever banco anterior.');
mkdirSync(root);
cpSync('supabase', join(root, 'supabase'), { recursive: true });
const config = join(root, 'supabase/config.toml');
const text = readFileSync(config, 'utf8');
// A troca é uma substituição de string exata, não parsing do TOML: se a baseline mudar de
// 3600, o `replace` abaixo viraria no-op silencioso e os testes de expiração rodariam com
// uma hora de prazo. Conferir antes transforma essa falha silenciosa em erro explícito.
if (!text.includes('jwt_expiry = 3600'))
  throw new Error('Prazo da baseline mudou, revisar fixture.');
writeFileSync(config, text.replace('jwt_expiry = 3600', 'jwt_expiry = 60'));
console.log(
  'Configuração descartável com JWT de 60 segundos preparada fora do checkout.',
);
