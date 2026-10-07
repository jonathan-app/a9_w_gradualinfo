/**
 * @fileoverview Formato das mensagens de commit — Conventional Commits.
 * @module commitlint.config
 * @description `tipo(escopo): descrição`, validado pelo hook `commit-msg` (ver
 *   `.husky/commit-msg`) antes de o commit existir. Mensagem fora do padrão é rejeitada na
 *   origem, não na revisão — é o histórico legível que se defende aqui.
 * @dependencies @commitlint/config-conventional (regras base do padrão).
 *
 * Referência: https://www.conventionalcommits.org/pt-br/
 */

const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // O escopo é onde fica a área do produto (auth, billing, ui...). Nível 1 = aviso: escopo
    // fora da lista incomoda o histórico sem travar o commit de quem está no fluxo.
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
    // Nível 0 desliga a regra de caixa do config base (que exige assunto em caixa baixa):
    // mensagens em português com termos próprios não devem falhar por capitalização.
    'subject-case': [0],
    // Nível 2 (erro) e nível 1 (aviso): pontuação final no assunto é erro, linha do corpo
    // longa demais é só aviso — o corpo não precisa travar um commit.
    'subject-full-stop': [2, 'never'],
    'body-max-line-length': [1, 'always', 100],
  },
};

export default config;
