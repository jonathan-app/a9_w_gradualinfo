// ============================================================================
// lighthouserc.js — auditoria de performance e boas práticas
// ============================================================================
//
// `pnpm lighthouse` roda o Lighthouse contra a página inicial, três vezes por
// rodada, e falha o processo se alguma métrica estiver abaixo do piso.
//
// Os números abaixo são o contrato de qualidade do projeto. Subir o piso sem
// medir é como encher o formulário: o gate deixa de proteger.
// ============================================================================

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/exemplo'],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless=new',
        preset: 'desktop',
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertions: {
        // Core Web Vitals (dados de campo são os melhores, mas aqui o
        // orçamento é de laboratório: mais estável em CI).
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Métricas individuais, em milissegundos (o padrão do Lighthouse).
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],

        // Regras inegociáveis de segurança.
        'uses-http2': 'off',
        'redirects-http-to-https': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
