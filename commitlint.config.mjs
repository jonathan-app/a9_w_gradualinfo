// ============================================================================
// commitlint.config.mjs — formato das mensagens de commit
// ============================================================================
//
// Conventional Commits: `tipo(escopo): descrição`. O hook `commit-msg`
// (ver .husky/commit-msg) valida cada mensagem antes de o commit existir.
//
// Referência: https://www.conventionalcommits.org/pt-br/
// ============================================================================

const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // O escopo é onde fica a área do produto (auth, billing, ui...).
    'scope-enum': [
      1,
      'always',
      [
        'app',
        'components',
        'lib',
        'hooks',
        'e2e',
        'ci',
        'deps',
        'docs',
        'skills',
      ],
    ],
    // Descrição curta e no imperativo: "adiciona", não "adicionado".
    'subject-case': [0],
    'subject-full-stop': [2, 'never'],
    'body-max-line-length': [1, 'always', 100],
  },
};

export default config;
