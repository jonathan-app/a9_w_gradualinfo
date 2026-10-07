#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { args, decide } from './check-contract.mjs';
try {
  const options = args(process.argv.slice(2));
  const result = decide(
    JSON.parse(readFileSync(options.file, 'utf8')),
    options.spec,
    options.repo,
  );
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.approved ? 0 : 1;
} catch (error) {
  console.log(
    JSON.stringify({
      approved: false,
      verdict: 'REPROVADO',
      reasons: [error.message],
    }),
  );
  process.exitCode = 1;
}
