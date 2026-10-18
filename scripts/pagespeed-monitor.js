#!/usr/bin/env node

/**
 * scripts/pagespeed-monitor.js — dados de campo via PageSpeed Insights
 * @fileoverview Mede dados de campo (CrUX) via PageSpeed Insights.
 *
 * Diferença para o Lighthouse
 * O Lighthouse é medida de laboratório: reproduzível, mas sintética, porque
 * simula rede e aparelho. O PageSpeed Insights devolve o CrUX, que é o que
 * usuários reais registram. Os dois não se substituem — o PageSpeed é o que
 * revela regressão que o laboratório nunca vai mostrar. O gate de laboratório
 * mora no `lighthouserc.cjs`, com `@lhci/cli` pinado; este script roda
 * standalone, sem `lhci`.
 *
 * Quando roda: `pnpm pagespeed` (manual ou por cron).
 * Lê: PAGESPEED_API_KEY e NEXT_PUBLIC_SITE_URL do ambiente.
 * Saída: 0 = tudo medido; 1 = alguma URL falhou.
 *
 * Limite conhecido
 * A API sem chave é limitada por IP e pode recusar a chamada. Para uso
 * recorrente o caminho é a com chave — por isso ela vem do ambiente e nunca do
 * código.
 */

const DEFAULT_PATHS = [
  '/',
  '/artigos/o-que-e-ram',
  '/artigos/como-escolher-ssd',
  '/exemplo',
];

/** Achata o resultado do PSI nos quatro Core Web Vitals. */
function toCoreWebVitals(result) {
  const audits = result?.audits ?? {};

  return {
    lcp: audits['largest-contentful-paint']?.numericValue,
    cls: audits['cumulative-layout-shift']?.numericValue,
    inp:
      audits['interaction-to-next-paint']?.numericValue ??
      audits['max-potential-fid']?.numericValue,
    fcp: audits['first-contentful-paint']?.numericValue,
  };
}

/**
 * Chama a API do PageSpeed Insights.
 * `runPagespeed` (endpoint sem chave) funciona sem autenticação;
 * `pagespeedonline` é a via autenticada, com cota maior.
 */
async function measure(url, { apiKey, strategy = 'mobile' }) {
  const endpoint = new URL(
    apiKey
      ? 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
      : 'https://www.googleapis.com/pagespeed/v5/runPagespeed',
  );

  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', strategy);
  if (apiKey) endpoint.searchParams.set('key', apiKey);

  const response = await fetch(endpoint, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`PSI respondeu ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message ?? 'erro desconhecido na resposta');
  }

  return data.lighthouseResult;
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey) {
    console.warn(
      '⚠️  PAGESPEED_API_KEY não definida: rodando sem chave, com cota baixa.',
    );
  }

  const urls = DEFAULT_PATHS.map((path) => new URL(path, baseUrl).toString());
  let failures = 0;

  for (const url of urls) {
    console.log(`\n→ pagespeed: ${url}`);

    try {
      const result = await measure(url, { apiKey });
      const vitals = toCoreWebVitals(result);
      const score = Math.round(
        (result.categories?.performance?.score ?? 0) * 100,
      );

      console.log(`   performance: ${score}`);
      console.log(`   LCP: ${Math.round(vitals.lcp ?? 0)}ms`);
      console.log(`   CLS: ${(vitals.cls ?? 0).toFixed(3)}`);
      console.log(`   INP: ${Math.round(vitals.inp ?? 0)}ms`);
      console.log(`   FCP: ${Math.round(vitals.fcp ?? 0)}ms`);
    } catch (error) {
      failures += 1;
      console.error(`   falha: ${error.message}`);
    }
  }

  process.exit(failures > 0 ? 1 : 0);
}

main();
