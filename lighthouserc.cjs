module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/artigos/fixture-publicado',
        'http://localhost:3000/busca',
      ],
      numberOfRuns: 3,
      settings: {
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
      },
    },
    assert: {
      // O piso de SEO só vale para página indexável: /busca é noindex de propósito
      // (seo/AC-06), e o Lighthouse reprova is-crawlable exatamente por isso — exigir
      // seo ≥ 0,90 dela seria contradizer o contrato. As três URLs seguem no orçamento
      // de Core Web Vitals e nos pilares que não dependem de indexação.
      assertMatrix: [
        {
          matchingUrlPattern: '.*',
          assertions: {
            'categories:performance': ['error', { minScore: 0.9 }],
            'categories:accessibility': ['error', { minScore: 0.9 }],
            'categories:best-practices': ['error', { minScore: 0.9 }],
            // Orçamento de Core Web Vitals por métrica (spec 0023, seo/AC-01).
            // INP não é medível em laboratório; TBT fica como proxy declarado.
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
            'total-blocking-time': ['error', { maxNumericValue: 200 }],
          },
        },
        {
          matchingUrlPattern: '^http://localhost:3000/($|artigos/)',
          assertions: {
            'categories:seo': ['error', { minScore: 0.9 }],
          },
        },
      ],
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/report' },
  },
};
