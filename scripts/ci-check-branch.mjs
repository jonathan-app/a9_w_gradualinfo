/**
 * @fileoverview Valida se a execucao do gate esta direcionada ao branch padrao remoto.
 * @module scripts/ci-check-branch
 * @description Garante que PRs sejam dirigidos a main e permite workflow_dispatch.
 * @dependencies node:child_process
 */
import { execFileSync } from 'node:child_process';

try {
  const output = execFileSync(
    'git',
    ['ls-remote', '--symref', 'origin', 'HEAD'],
    { encoding: 'utf8' },
  );
  const match = output.match(/ref: refs\/heads\/([^\s]+)\s+HEAD/);
  if (!match)
    throw new Error('Não foi possível determinar o branch padrão do remoto.');
  const defaultBranch = match[1];

  const currentBranch =
    process.env.GITHUB_REF_NAME ||
    execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
    }).trim();

  if (currentBranch !== defaultBranch) {
    if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
      const baseBranch = process.env.GITHUB_BASE_REF;
      if (baseBranch !== defaultBranch) {
        throw new Error(
          `O PR é dirigido ao branch ${baseBranch}, mas o gate exige o branch padrão remoto (${defaultBranch}).`,
        );
      }
    } else if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
      console.log(
        `Execucao manual via workflow_dispatch no branch ${currentBranch}.`,
      );
    } else {
      throw new Error(
        `O job está rodando no branch ${currentBranch}, mas o gate exige o branch padrão remoto (${defaultBranch}).`,
      );
    }
  }

  console.log(`Branch verificado contra o remoto: ${defaultBranch}.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
