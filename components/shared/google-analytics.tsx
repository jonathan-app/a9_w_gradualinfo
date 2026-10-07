import Script from 'next/script';
import { env } from '@/lib/env';

/**
 * components/shared/google-analytics.tsx — Google Analytics (GA4) via gtag.js
 * @fileoverview Google Analytics (GA4) via gtag.js, sem bloquear o render.
 *
 * Por que este componente existe
 * - O gtag.js precisa ser carregado de forma assíncrona sem bloquear o FCP
 *   ou o LCP da página.
 * - Usamos o componente nativo `Script` do Next.js com a estratégia
 *   `lazyOnload`, que carrega o script apenas depois que a página está
 *   interativa e o idle está disponível — prioriza o Core Web Vitals.
 * - O Measurement ID vem de `env.gaMeasurementId` (configurável via
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID ou padrão de produção).
 */
export function GoogleAnalytics() {
  const measurementId = env.gaMeasurementId;

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
